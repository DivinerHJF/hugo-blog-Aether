#!/usr/bin/env python3
"""Replace image references with uploaded R2 URLs from data/image-map.json."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from dataclasses import dataclass
from pathlib import Path


SCAN_DIRS = (
    "content",
    "layouts",
    "assets",
    "themes/aether/layouts",
)
STATIC_FILES = ("static/site.webmanifest",)
TEXT_EXTS = {
    ".md",
    ".markdown",
    ".html",
    ".htm",
    ".xml",
    ".css",
    ".scss",
    ".sass",
    ".toml",
    ".yaml",
    ".yml",
    ".json",
    ".js",
    ".ts",
    ".webmanifest",
}
SITE_ICON_MARKERS = ("favicon", "apple-touch-icon", "safari-pinned-tab")
IGNORED_TEMPLATE_PLACEHOLDERS = {
    "svg/version/%%v-%%v.%v.svg",
    "svg/version/%v-%v.svg",
    "%v/%v.svg",
}
PROTECTED_HUGO_RESOURCE_PATHS = {
    # This is consumed by resources.Get and resources.ExecuteAsTemplate; replacing
    # it with an absolute URL would break Hugo's asset pipeline.
    "svg/version.template.svg",
}


@dataclass
class Replacement:
    old: str
    new: str


@dataclass
class FileChange:
    path: Path
    counts: dict[str, int]


def is_protected(old_path: str, new_url: str) -> str | None:
    lowered = old_path.lower()
    if new_url.startswith("https://img.philohao.com/") and old_path.startswith("https://img.philohao.com/"):
        return "already-r2"
    if old_path in IGNORED_TEMPLATE_PLACEHOLDERS or "%v" in old_path or "%%" in old_path:
        return "ignored-template-placeholder"
    if old_path in PROTECTED_HUGO_RESOURCE_PATHS:
        return "hugo-resource-template"
    if any(marker in lowered for marker in SITE_ICON_MARKERS) or old_path == "/images/me/favicon.svg":
        return "site-icon"
    return None


def iter_target_files(root: Path) -> list[Path]:
    paths: list[Path] = []
    seen: set[Path] = set()

    def add(path: Path) -> None:
        if not path.exists() or not path.is_file():
            return
        if path.suffix.lower() not in TEXT_EXTS and path.name != "site.webmanifest":
            return
        resolved = path.resolve()
        if resolved in seen:
            return
        seen.add(resolved)
        paths.append(path)

    for directory in SCAN_DIRS:
        start = root / directory
        if not start.exists():
            continue
        for path in start.rglob("*"):
            add(path)

    for file_name in STATIC_FILES:
        add(root / file_name)

    return sorted(paths)


def replace_plain(text: str, replacements: list[Replacement]) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    for item in replacements:
        count = text.count(item.old)
        if count:
            text = text.replace(item.old, item.new)
            counts[item.old] = counts.get(item.old, 0) + count
    return text, counts


def replace_outside_inline_code(line: str, replacements: list[Replacement]) -> tuple[str, dict[str, int]]:
    parts = re.split(r"(`+[^`]*`+)", line)
    counts: dict[str, int] = {}
    for index, part in enumerate(parts):
        if index % 2 == 1 and part.startswith("`"):
            continue
        new_part, part_counts = replace_plain(part, replacements)
        parts[index] = new_part
        for old, count in part_counts.items():
            counts[old] = counts.get(old, 0) + count
    return "".join(parts), counts


def replace_markdown(text: str, replacements: list[Replacement]) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    lines = text.splitlines(keepends=True)
    in_fence = False
    fence_marker = ""
    output: list[str] = []

    for line in lines:
        stripped = line.lstrip()
        fence_match = re.match(r"(```+|~~~+)", stripped)
        if fence_match:
            marker = fence_match.group(1)[0]
            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif marker == fence_marker:
                in_fence = False
                fence_marker = ""
            output.append(line)
            continue

        if in_fence:
            output.append(line)
            continue

        new_line, line_counts = replace_outside_inline_code(line, replacements)
        output.append(new_line)
        for old, count in line_counts.items():
            counts[old] = counts.get(old, 0) + count

    return "".join(output), counts


def replace_file(path: Path, replacements: list[Replacement]) -> tuple[str, dict[str, int]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() in {".md", ".markdown"}:
        return replace_markdown(text, replacements)
    return replace_plain(text, replacements)


def write_report(
    root: Path,
    mode: str,
    changes: list[FileChange],
    replacements: list[Replacement],
    protected: dict[str, str],
    unmatched: list[Replacement],
) -> None:
    report_path = root / "reports" / (
        "r2-link-replacement-report.md" if mode == "apply" else "r2-link-replacement-dry-run.md"
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    total = sum(sum(change.counts.values()) for change in changes)
    lines = [
        "# R2 Link Replacement Report" if mode == "apply" else "# R2 Link Replacement Dry Run",
        "",
        f"- Generated: {dt.datetime.now(dt.timezone.utc).isoformat()}",
        f"- Mode: {mode}",
        f"- Files to modify/modified: {len(changes)}",
        f"- Total replacements: {total}",
        f"- Active image-map entries: {len(replacements)}",
        f"- Unmatched active image-map entries: {len(unmatched)}",
        f"- Protected image-map entries skipped: {len(protected)}",
        "",
        "## Files",
        "",
        "| File | Replacements |",
        "| --- | ---: |",
    ]
    for change in changes:
        lines.append(f"| `{change.path.relative_to(root).as_posix()}` | {sum(change.counts.values())} |")

    lines.extend(["", "## Link Changes", "", "| File | Count | Old link | New link |", "| --- | ---: | --- | --- |"])
    for change in changes:
        rel = change.path.relative_to(root).as_posix()
        for old, count in sorted(change.counts.items()):
            new = next(item.new for item in replacements if item.old == old)
            lines.append(f"| `{rel}` | {count} | `{old}` | `{new}` |")

    lines.extend(["", "## Unmatched Active Image Map Entries", "", "| Old link | New link |", "| --- | --- |"])
    if unmatched:
        for item in unmatched:
            lines.append(f"| `{item.old}` | `{item.new}` |")
    else:
        lines.append("| _none_ |  |")

    lines.extend(["", "## Protected Image Map Entries", "", "| Old link | New link | Reason |", "| --- | --- | --- |"])
    if protected:
        for old, reason in sorted(protected.items()):
            lines.append(f"| `{old}` | `{protected_new_url(root, old)}` | {reason} |")
    else:
        lines.append("| _none_ |  |  |")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def protected_new_url(root: Path, old: str) -> str:
    image_map = json.loads((root / "data" / "image-map.json").read_text(encoding="utf-8"))
    return image_map.get(old, "")


def build_replacements(root: Path) -> tuple[list[Replacement], dict[str, str]]:
    image_map = json.loads((root / "data" / "image-map.json").read_text(encoding="utf-8"))
    replacements: list[Replacement] = []
    protected: dict[str, str] = {}
    for old, new in image_map.items():
        reason = is_protected(old, new)
        if reason:
            protected[old] = reason
            continue
        if old == new:
            continue
        replacements.append(Replacement(old, new))
    replacements.sort(key=lambda item: len(item.old), reverse=True)
    return replacements, protected


def run(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    replacements, protected = build_replacements(root)
    target_files = iter_target_files(root)
    changes: list[FileChange] = []
    matched: set[str] = set()

    for path in target_files:
        original = path.read_text(encoding="utf-8", errors="replace")
        new_text, counts = replace_file(path, replacements)
        if not counts:
            continue
        changes.append(FileChange(path, counts))
        matched.update(counts)
        if args.apply and new_text != original:
            path.write_text(new_text, encoding="utf-8")

    unmatched = [item for item in replacements if item.old not in matched]
    mode = "apply" if args.apply else "dry-run"
    write_report(root, mode, changes, replacements, protected, unmatched)
    print(f"Mode: {mode}")
    print(f"Files: {len(changes)}")
    print(f"Replacements: {sum(sum(change.counts.values()) for change in changes)}")
    print(f"Unmatched active map entries: {len(unmatched)}")
    print(f"Protected map entries skipped: {len(protected)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Replace image links with R2 URLs from data/image-map.json.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Report changes without writing files.")
    mode.add_argument("--apply", action="store_true", help="Apply replacements and write report.")
    parser.add_argument("--root", default=".", help="Repository root.")
    return parser


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))

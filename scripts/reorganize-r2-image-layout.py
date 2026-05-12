#!/usr/bin/env python3
"""Reorganize existing R2 upload files without reprocessing images."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path


R2_BASE_URL = "https://img.philohao.com"
BOOK_KEYWORDS = ("book", "books", "reading", "read", "书", "读书", "阅读")
MOVIE_KEYWORDS = ("movie", "movies", "film", "cinema", "douban", "电影", "观影")


@dataclass
class ImageRecord:
    old_path: str
    current_url: str
    source: str
    report_path: Path


@dataclass
class MovePlan:
    old_path: str
    source: str
    category: str
    current_rel: str
    target_rel: str
    current_url: str
    target_url: str
    status: str
    note: str


def md_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def strip_ticks(value: str) -> str:
    value = value.strip()
    if value.startswith("`") and value.endswith("`"):
        return value[1:-1]
    return value


def parse_table_line(line: str) -> list[str]:
    reader = csv.reader(io.StringIO(line.strip().strip("|")), delimiter="|", escapechar="\\")
    return [cell.strip() for cell in next(reader)]


def iter_report_records(report_path: Path) -> list[ImageRecord]:
    records: list[ImageRecord] = []
    lines = report_path.read_text(encoding="utf-8").splitlines()
    current_headers: list[str] | None = None
    for line in lines:
        if not line.startswith("|") or line.startswith("| ---"):
            current_headers = None if line.startswith("## ") else current_headers
            continue
        cells = parse_table_line(line)
        normalized = [cell.lower().strip() for cell in cells]
        if "old path" in normalized and any(header in normalized for header in ("new r2 url", "new r2 url")):
            current_headers = normalized
            continue
        if current_headers is None:
            continue
        try:
            old_idx = current_headers.index("old path")
            url_idx = current_headers.index("new r2 url")
            source_idx = current_headers.index("source")
        except ValueError:
            continue
        if len(cells) <= max(old_idx, url_idx, source_idx):
            continue
        old_path = strip_ticks(cells[old_idx])
        current_url = strip_ticks(cells[url_idx])
        source = strip_ticks(cells[source_idx])
        if not current_url.startswith(R2_BASE_URL + "/"):
            continue
        if ":" in source and source.rsplit(":", 1)[-1].isdigit():
            source = source.rsplit(":", 1)[0]
        records.append(ImageRecord(old_path, current_url, source, report_path))
    return records


def load_records(root: Path) -> dict[str, ImageRecord]:
    records: dict[str, ImageRecord] = {}
    for report_name in ("image-migration-report.md", "retry-image-download-report.md"):
        report_path = root / "reports" / report_name
        if not report_path.exists():
            continue
        for record in iter_report_records(report_path):
            records[record.old_path] = record
    return records


def parse_front_matter_text(path: Path) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    if not lines:
        return ""
    marker = lines[0].strip()
    if marker not in {"---", "+++"}:
        return ""
    body: list[str] = []
    for line in lines[1:]:
        if line.strip() == marker:
            break
        body.append(line)
    return "\n".join(body)


def contains_any(value: str, keywords: tuple[str, ...]) -> bool:
    lower = value.lower()
    return any(keyword.lower() in lower for keyword in keywords)


def front_matter_month(path: Path) -> str | None:
    text = parse_front_matter_text(path)
    match = re.search(r"\bdate\s*[:=]\s*[\"']?(\d{4})-(\d{2})", text, re.IGNORECASE)
    if match:
        return match.group(2)
    return None


def source_year_month(root: Path, source: str) -> tuple[str | None, str | None]:
    match = re.match(r"content/posts/(\d{4})/([^/]+)\.md$", source.replace("\\", "/"))
    if not match:
        return None, None
    year = match.group(1)
    stem = match.group(2)
    dash = re.match(r"\d{4}-(\d{2})", stem)
    compact = re.match(r"\d{4}(\d{2})", stem)
    if dash:
        return year, dash.group(1)
    if compact:
        return year, compact.group(1)
    return year, front_matter_month(root / source) or "01"


def classify(root: Path, source: str) -> tuple[str, str | None, str | None]:
    normalized = source.replace("\\", "/")
    travel_match = re.match(r"content/pages/footprint/(\d{4})/travel\.md$", normalized)
    if travel_match:
        return "travel", travel_match.group(1), None

    year, month = source_year_month(root, normalized)
    source_path = root / normalized
    meta_text = f"{normalized}\n{parse_front_matter_text(source_path)}"
    if year and contains_any(meta_text, BOOK_KEYWORDS):
        return "books", year, None
    if year and contains_any(meta_text, MOVIE_KEYWORDS):
        return "movies", year, None
    if year and month:
        return "blog", year, month
    return "unchanged", None, None


def rel_from_url(url: str) -> str:
    return url.removeprefix(R2_BASE_URL + "/")


def url_from_rel(rel: str) -> str:
    return f"{R2_BASE_URL}/{rel.replace('\\', '/')}"


def target_rel_for(root: Path, record: ImageRecord, current_rel: str) -> tuple[str, str, str]:
    filename = Path(current_rel).name
    category, year, month = classify(root, record.source)
    if category == "travel" and year:
        return f"travel/{year}/{filename}", category, "footprint travel source"
    if category == "books" and year:
        return f"books/{year}/{filename}", category, "book/reading metadata"
    if category == "movies" and year:
        return f"movies/{year}/{filename}", category, "movie metadata"
    if category == "blog" and year and month:
        return f"blog/{year}/{month}/{filename}", category, "blog post source"
    return current_rel, category, "non-content or unresolved source kept in place"


def unique_target(root: Path, target_rel: str, reserved: set[str], current_rel: str) -> str:
    if target_rel == current_rel:
        reserved.add(target_rel)
        return target_rel
    target = root / "r2-upload" / Path(target_rel)
    if target_rel not in reserved and not target.exists():
        reserved.add(target_rel)
        return target_rel
    stem = target.stem
    suffix = target.suffix
    parent = target.parent
    for number in range(2, 1000):
        candidate = parent / f"{stem}-{number}{suffix}"
        candidate_rel = candidate.relative_to(root / "r2-upload").as_posix()
        if candidate_rel not in reserved and not candidate.exists():
            reserved.add(candidate_rel)
            return candidate_rel
    raise RuntimeError(f"Could not allocate unique target for {target_rel}")


def build_plan(root: Path) -> list[MovePlan]:
    image_map = json.loads((root / "data" / "image-map.json").read_text(encoding="utf-8"))
    records = load_records(root)
    reserved: set[str] = set()
    plans: list[MovePlan] = []

    for old_path, current_url in image_map.items():
        current_rel = rel_from_url(current_url)
        current_path = root / "r2-upload" / Path(current_rel)
        record = records.get(old_path)
        if record is None:
            plans.append(
                MovePlan(old_path, "", "unknown", current_rel, current_rel, current_url, current_url, "skipped", "no Source found in reports")
            )
            reserved.add(current_rel)
            continue
        desired_rel, category, note = target_rel_for(root, record, current_rel)
        target_rel = unique_target(root, desired_rel, reserved, current_rel)
        status = "move" if target_rel != current_rel else "keep"
        if not current_path.exists():
            status = "missing"
            note = "source file does not exist in r2-upload"
        plans.append(
            MovePlan(
                old_path,
                record.source,
                category,
                current_rel,
                target_rel,
                current_url,
                url_from_rel(target_rel),
                status,
                note,
            )
        )
    return plans


def write_report(root: Path, plans: list[MovePlan], mode: str) -> None:
    report_path = root / "reports" / "r2-layout-reorganize-report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    moving = [plan for plan in plans if plan.status == "move"]
    kept = [plan for plan in plans if plan.status == "keep"]
    missing = [plan for plan in plans if plan.status == "missing"]
    current_header = "Previous File" if mode == "apply" else "Current URL"
    lines = [
        "# R2 Layout Reorganize Report",
        "",
        f"- Generated: {dt.datetime.now(dt.timezone.utc).isoformat()}",
        f"- Mode: {mode}",
        f"- Total mapped images: {len(plans)}",
        f"- Files to move/moved: {len(moving)}",
        f"- Files kept in place: {len(kept)}",
        f"- Missing source files: {len(missing)}",
        "",
        "## Move Plan",
        "",
        f"| Status | Category | Source | {current_header} | New URL | Note |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for plan in plans:
        if plan.status == "keep" and plan.category == "blog":
            continue
        current_value = plan.current_rel if mode == "apply" else plan.current_url
        lines.append(
            f"| {md_cell(plan.status)} | {md_cell(plan.category)} | `{md_cell(plan.source)}` | `{md_cell(current_value)}` | `{md_cell(plan.target_url)}` | {md_cell(plan.note)} |"
        )
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_text_files(root: Path, replacements: dict[str, str]) -> None:
    targets = [root / "reports" / name for name in ("image-migration-report.md", "retry-image-download-report.md", "manual-image-actions.md")]
    for target in targets:
        if not target.exists():
            continue
        text = target.read_text(encoding="utf-8")
        original = text
        for old_url, new_url in replacements.items():
            text = text.replace(old_url, new_url)
        if text != original:
            target.write_text(text, encoding="utf-8")


def apply_plan(root: Path, plans: list[MovePlan]) -> None:
    upload_root = root / "r2-upload"
    for plan in plans:
        if plan.status != "move":
            continue
        source = upload_root / Path(plan.current_rel)
        target = upload_root / Path(plan.target_rel)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(target))

    image_map_path = root / "data" / "image-map.json"
    image_map = json.loads(image_map_path.read_text(encoding="utf-8"))
    replacements: dict[str, str] = {}
    for plan in plans:
        if plan.current_url != plan.target_url:
            replacements[plan.current_url] = plan.target_url
        image_map[plan.old_path] = plan.target_url
    image_map_path.write_text(json.dumps(image_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_text_files(root, replacements)


def print_summary(plans: list[MovePlan]) -> None:
    moving = [plan for plan in plans if plan.status == "move"]
    by_category: dict[str, int] = {}
    for plan in moving:
        by_category[plan.category] = by_category.get(plan.category, 0) + 1
    print(f"Mapped images: {len(plans)}")
    print(f"Files to move: {len(moving)}")
    for category, count in sorted(by_category.items()):
        print(f"  {category}: {count}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Reorganize existing R2 image layout.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Write a plan without moving files.")
    mode.add_argument("--apply", action="store_true", help="Move files and update maps/reports.")
    parser.add_argument("--root", default=".", help="Repository root.")
    return parser


def run(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    plans = build_plan(root)
    mode = "apply" if args.apply else "dry-run"
    write_report(root, plans, mode)
    print_summary(plans)
    if args.apply:
        apply_plan(root, plans)
        write_report(root, plans, mode)
    return 0


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))

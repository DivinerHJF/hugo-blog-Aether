#!/usr/bin/env python3
"""Prepare Hugo image assets for an R2 migration without editing content.

The script scans image references, downloads/copies/transcodes the referenced
assets, and writes a path map plus a migration report. It intentionally does not
rewrite Markdown, HTML, template, or CSS source files.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import json
import mimetypes
import os
import posixpath
import re
import shutil
import sys
import tempfile
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
CONVERT_EXTS = {".jpg", ".jpeg", ".png"}
COPY_EXTS = {".svg", ".gif"}
TEXT_EXTS = {
    ".md",
    ".markdown",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".toml",
    ".yaml",
    ".yml",
    ".json",
    ".xml",
    ".js",
    ".ts",
    ".webmanifest",
}
DEFAULT_SCAN_DIRS = ("content", "static", "assets", "layouts", "themes")
DEFAULT_R2_BASE_URL = "https://img.philohao.com"
IGNORED_TEMPLATE_PLACEHOLDERS = {
    "svg/version/%%v-%%v.%v.svg",
    "svg/version/%v-%v.svg",
    "%v/%v.svg",
}

IMAGE_EXT_PATTERN = r"(?:jpe?g|png|webp|gif|svg)"
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*]\(\s*(?:<([^>]+)>|([^\s)]+))", re.IGNORECASE)
IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(
    r"\b(?:src|data-src|href|data-image|data-thumbnail|data-svg-src|poster|content)\s*=\s*([\"'])(.*?)\1",
    re.IGNORECASE | re.DOTALL,
)
SRCSET_ATTR_RE = re.compile(r"\b(?:srcset|data-srcset)\s*=\s*([\"'])(.*?)\1", re.IGNORECASE | re.DOTALL)
CSS_URL_RE = re.compile(r"url\(\s*([\"']?)(.*?)\1\s*\)", re.IGNORECASE | re.DOTALL)
SHORTCODE_RE = re.compile(r"{{[<%].*?[>%]}}", re.DOTALL)
QUOTED_IMAGE_RE = re.compile(
    rf"([\"'])([^\"']+?\.{IMAGE_EXT_PATTERN}(?:[?#][^\"']*)?)\1",
    re.IGNORECASE,
)
BARE_IMAGE_RE = re.compile(
    rf"(?<![\w./:-])((?:https?:)?//[^\s\"'<>),]+?\.{IMAGE_EXT_PATTERN}(?![A-Za-z0-9_./-])(?:[?#][^\s\"'<>),]*)?|/?[A-Za-z0-9_./@%+-]+?\.{IMAGE_EXT_PATTERN}(?![A-Za-z0-9_./-])(?:[?#][^\s\"'<>),]*)?)",
    re.IGNORECASE,
)
FRONTMATTER_BOUNDARY_RE = re.compile(r"^\s*(---|\+\+\+)\s*$")


@dataclass(frozen=True)
class Reference:
    source_file: Path
    line: int
    raw: str
    kind: str


@dataclass
class ProcessedAsset:
    old_path: str
    new_url: str
    output_path: str
    source_file: str
    kind: str
    original_size: int
    output_size: int
    action: str


@dataclass
class Issue:
    old_path: str
    source_file: str
    line: int
    reason: str


def normalize_r2_base_url(url: str) -> str:
    return url.rstrip("/")


def read_text(path: Path) -> str | None:
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if b"\x00" in data[:4096]:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def iter_scan_files(root: Path, scan_dirs: Iterable[str]) -> Iterable[Path]:
    for dirname in scan_dirs:
        start = root / dirname
        if not start.exists():
            continue
        if start.is_file():
            paths = [start]
        else:
            paths = (p for p in start.rglob("*") if p.is_file())
        for path in paths:
            if path.suffix.lower() in IMAGE_EXTS:
                continue
            if path.suffix.lower() in TEXT_EXTS or path.name.endswith(".webmanifest"):
                yield path


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def clean_candidate(value: str) -> str:
    value = html.unescape(value).strip()
    if value.startswith("<") and value.endswith(">"):
        value = value[1:-1].strip()
    return value.strip("\"'")


def has_image_extension(value: str) -> bool:
    path = urllib.parse.urlsplit(value.strip()).path
    return Path(path).suffix.lower() in IMAGE_EXTS


def split_srcset(value: str) -> list[str]:
    refs: list[str] = []
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        refs.append(item.split()[0])
    return refs


def add_reference(
    references: list[Reference],
    seen: set[tuple[str, int, str, str]],
    source_file: Path,
    text: str,
    raw: str,
    kind: str,
    offset: int,
) -> None:
    raw = clean_candidate(raw)
    if not raw or raw.startswith("#"):
        return
    if not has_image_extension(raw):
        return
    line = line_number(text, offset)
    key = (str(source_file), line, raw, kind)
    if key in seen:
        return
    seen.add(key)
    references.append(Reference(source_file=source_file, line=line, raw=raw, kind=kind))


def find_references(root: Path, scan_dirs: Iterable[str]) -> list[Reference]:
    references: list[Reference] = []
    seen: set[tuple[str, int, str, str]] = set()

    for source_file in iter_scan_files(root, scan_dirs):
        text = read_text(source_file)
        if text is None:
            continue

        for match in MARKDOWN_IMAGE_RE.finditer(text):
            add_reference(references, seen, source_file, text, match.group(1) or match.group(2), "markdown", match.start())

        for tag_match in IMG_TAG_RE.finditer(text):
            tag = tag_match.group(0)
            tag_offset = tag_match.start()
            for attr_match in ATTR_RE.finditer(tag):
                add_reference(
                    references,
                    seen,
                    source_file,
                    text,
                    attr_match.group(2),
                    f"html-{attr_match.group(0).split('=')[0].lower()}",
                    tag_offset + attr_match.start(),
                )
            for srcset_match in SRCSET_ATTR_RE.finditer(tag):
                for src in split_srcset(srcset_match.group(2)):
                    add_reference(references, seen, source_file, text, src, "html-srcset", tag_offset + srcset_match.start())

        for match in CSS_URL_RE.finditer(text):
            add_reference(references, seen, source_file, text, match.group(2), "css-url", match.start())

        for shortcode_match in SHORTCODE_RE.finditer(text):
            shortcode = shortcode_match.group(0)
            shortcode_offset = shortcode_match.start()
            for match in QUOTED_IMAGE_RE.finditer(shortcode):
                add_reference(references, seen, source_file, text, match.group(2), "hugo-shortcode", shortcode_offset + match.start())
            for match in BARE_IMAGE_RE.finditer(shortcode):
                add_reference(references, seen, source_file, text, match.group(1), "hugo-shortcode", shortcode_offset + match.start())

        for match in QUOTED_IMAGE_RE.finditer(text):
            add_reference(references, seen, source_file, text, match.group(2), "quoted-string", match.start())

    return references


def strip_query_fragment(value: str) -> str:
    split = urllib.parse.urlsplit(value)
    if split.scheme or split.netloc:
        return urllib.parse.urlunsplit((split.scheme, split.netloc, split.path, "", ""))
    return value.split("#", 1)[0].split("?", 1)[0]


def is_remote(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://") or value.startswith("//")


def is_skippable_reference(value: str) -> str | None:
    if value.startswith("data:"):
        return "data URI, skipped"
    if value in IGNORED_TEMPLATE_PLACEHOLDERS:
        return "ignored-template-placeholder"
    if "{{" in value or "}}" in value or value.startswith("$"):
        return "template-derived path needs manual confirmation"
    if "%v" in value or "%%" in value:
        return "template placeholder path needs manual confirmation"
    if value.startswith("mailto:") or value.startswith("tel:"):
        return "non-image URL scheme"
    return None


def unique_existing(paths: Iterable[Path]) -> list[Path]:
    seen: set[Path] = set()
    result: list[Path] = []
    for path in paths:
        try:
            resolved = path.resolve()
        except OSError:
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_file():
            result.append(resolved)
    return result


def theme_dirs(root: Path) -> list[Path]:
    themes_root = root / "themes"
    if not themes_root.exists():
        return []
    return [p for p in themes_root.iterdir() if p.is_dir()]


def resolve_local_path(root: Path, reference: Reference) -> Path | None:
    raw_path = urllib.parse.unquote(strip_query_fragment(reference.raw))
    raw_path = raw_path.replace("\\", "/")
    if not raw_path:
        return None

    candidates: list[Path] = []
    themes = theme_dirs(root)
    source_dir = reference.source_file.parent

    if raw_path.startswith("/"):
        rel = raw_path.lstrip("/")
        candidates.extend([root / rel, root / "static" / rel, root / "assets" / rel])
        for theme in themes:
            candidates.extend([theme / "static" / rel, theme / "assets" / rel])
    else:
        candidates.append(source_dir / raw_path)
        candidates.extend([root / raw_path, root / "static" / raw_path, root / "assets" / raw_path])
        for theme in themes:
            candidates.extend([theme / "static" / raw_path, theme / "assets" / raw_path])

    existing = unique_existing(candidates)
    return existing[0] if existing else None


def iri_to_uri(value: str) -> str:
    split = urllib.parse.urlsplit(value)
    netloc = split.netloc.encode("idna").decode("ascii")
    path = urllib.parse.quote(split.path, safe="/%:@")
    query = urllib.parse.quote(split.query, safe="=&?/:;%+")
    fragment = urllib.parse.quote(split.fragment, safe="")
    return urllib.parse.urlunsplit((split.scheme, netloc, path, query, fragment))


def download_remote(raw: str, temp_dir: Path, timeout: int) -> tuple[Path | None, int, str | None]:
    url = "https:" + raw if raw.startswith("//") else raw
    url = iri_to_uri(url)
    suffix = Path(urllib.parse.urlsplit(url).path).suffix.lower()
    if suffix not in IMAGE_EXTS:
        suffix = mimetypes.guess_extension(mimetypes.guess_type(url)[0] or "") or ".img"
    name = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + suffix
    target = temp_dir / name
    request = urllib.request.Request(url, headers={"User-Agent": "hugo-image-migration/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = response.read()
        target.write_bytes(data)
        return target, len(data), None
    except Exception as exc:  # noqa: BLE001 - report any network/HTTP failure.
        return None, 0, str(exc)


def parse_frontmatter(text: str) -> dict[str, str]:
    lines = text.splitlines()
    if not lines:
        return {}
    boundary = FRONTMATTER_BOUNDARY_RE.match(lines[0])
    if not boundary:
        return {}
    marker = boundary.group(1)
    values: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == marker:
            break
        yaml_match = re.match(r"^\s*([A-Za-z0-9_-]+)\s*:\s*[\"']?([^\"'#]+)", line)
        toml_match = re.match(r"^\s*([A-Za-z0-9_-]+)\s*=\s*[\"']?([^\"'#]+)", line)
        match = yaml_match or toml_match
        if match:
            values[match.group(1).lower()] = match.group(2).strip().strip("\"'")
    return values


def article_info(root: Path, source_file: Path) -> tuple[str, str, str] | None:
    try:
        rel = source_file.relative_to(root).as_posix()
    except ValueError:
        return None
    if not rel.startswith("content/"):
        return None
    text = read_text(source_file) or ""
    fm = parse_frontmatter(text)
    date_value = fm.get("date", "")
    date_match = re.search(r"(\d{4})-(\d{2})", date_value)
    if not date_match:
        date_match = re.search(r"content/posts/(\d{4})/(\d{4})-(\d{2})", rel)
    if not date_match:
        date_match = re.search(r"content/posts/(\d{4})/(\d{4})(\d{2})", rel)
        if date_match:
            year, month = date_match.group(1), date_match.group(3)
        else:
            year, month = "unknown", "unknown"
    else:
        if len(date_match.groups()) == 3:
            year, month = date_match.group(2), date_match.group(3)
        else:
            year, month = date_match.group(1), date_match.group(2)

    slug = fm.get("slug") or fm.get("url", "").rstrip("/").split("/")[-1] or source_file.stem
    return year, month, safe_slug(slug)


def safe_slug(value: str) -> str:
    value = urllib.parse.unquote(value).strip().lower()
    value = re.sub(r"\.[a-z0-9]+$", "", value)
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = value.strip("-._")
    if not value:
        value = "image-" + hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    return value


def output_extension(input_path: Path) -> str:
    ext = input_path.suffix.lower()
    if ext in CONVERT_EXTS or ext == ".webp":
        return ".webp"
    return ext if ext in COPY_EXTS else ".webp"


def build_output_relpath(
    root: Path,
    reference: Reference,
    input_path: Path,
    counters: dict[str, int],
) -> str:
    ext = output_extension(input_path)
    info = article_info(root, reference.source_file)
    if info:
        year, month, slug = info
        key = reference.source_file.relative_to(root).as_posix()
        counters[key] = counters.get(key, 0) + 1
        return f"blog/{year}/{month}/{slug}-{counters[key]:02d}{ext}"

    raw_name = Path(urllib.parse.urlsplit(strip_query_fragment(reference.raw)).path).name or input_path.name
    stem = safe_slug(Path(raw_name).stem)
    digest = hashlib.sha1(reference.raw.encode("utf-8")).hexdigest()[:8]
    return f"misc/{stem}-{digest}{ext}"


def import_pillow():
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise RuntimeError(
            "Pillow is required for image conversion. Run: python -m pip install -r scripts/requirements-image-migration.txt"
        ) from exc
    return Image, ImageOps


def copy_or_convert(input_path: Path, output_path: Path, quality: int, max_width: int) -> tuple[str, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ext = input_path.suffix.lower()

    if ext in COPY_EXTS:
        shutil.copy2(input_path, output_path)
        return "copied", output_path.stat().st_size

    Image, ImageOps = import_pillow()
    with Image.open(input_path) as image:
        image = ImageOps.exif_transpose(image)
        if image.width > max_width:
            height = round(image.height * (max_width / image.width))
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image.save(output_path, "WEBP", quality=quality, method=6)
    return "converted" if ext in CONVERT_EXTS else "recompressed", output_path.stat().st_size


def format_bytes(size: int) -> str:
    units = ("B", "KB", "MB", "GB")
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def write_json(path: Path, image_map: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(image_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_report(
    path: Path,
    references: list[Reference],
    processed: list[ProcessedAsset],
    skipped: list[Issue],
    download_failed: list[Issue],
    duplicate_count: int,
    r2_base_url: str,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append("# Image Migration Report")
    lines.append("")
    lines.append(f"- Generated: {dt.datetime.now(dt.timezone.utc).isoformat()}")
    lines.append(f"- R2 base URL: {r2_base_url}")
    lines.append(f"- Total image references found: {len(references)}")
    lines.append(f"- Successfully processed: {len(processed) + duplicate_count}")
    lines.append(f"- Skipped: {len(skipped)}")
    lines.append(f"- Download failed: {len(download_failed)}")
    lines.append(f"- Duplicate references reused existing output: {duplicate_count}")
    lines.append("")
    lines.append("## Processed Images")
    lines.append("")
    if processed:
        lines.append("| Old path | New R2 URL | Original size | Output size | Action | Source |")
        lines.append("| --- | --- | ---: | ---: | --- | --- |")
        for item in processed:
            old_path = item.old_path.replace("|", "\\|")
            source = item.source_file.replace("\\", "/").replace("|", "\\|")
            lines.append(
                f"| `{old_path}` | `{item.new_url}` | {format_bytes(item.original_size)} | {format_bytes(item.output_size)} | {item.action} | `{source}` |"
            )
    else:
        lines.append("No images were processed.")
    lines.append("")
    lines.append("## Needs Manual Confirmation")
    lines.append("")
    issues = skipped + download_failed
    if issues:
        lines.append("| Path | Source | Line | Reason |")
        lines.append("| --- | --- | ---: | --- |")
        for issue in issues:
            source = issue.source_file.replace("\\", "/").replace("|", "\\|")
            reason = issue.reason.replace("|", "\\|")
            lines.append(f"| `{issue.old_path}` | `{source}` | {issue.line} | {reason} |")
    else:
        lines.append("No manual confirmation issues found.")
    lines.append("")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    r2_base_url = normalize_r2_base_url(args.r2_base_url)
    references = find_references(root, args.scan_dir)
    print(f"Found {len(references)} image references.")

    if args.dry_run:
        skipped = [ref for ref in references if is_skippable_reference(ref.raw)]
        remote = [ref for ref in references if is_remote(ref.raw)]
        print(f"Dry run: {len(remote)} remote references, {len(skipped)} immediately skippable references.")
        print("Dry run made no filesystem changes.")
        return 0

    output_root = root / args.output_dir
    map_path = root / args.map_path
    report_path = root / args.report_path
    temp_dir_obj = tempfile.TemporaryDirectory(prefix="image-migration-")
    temp_dir = Path(temp_dir_obj.name)

    image_map: dict[str, str] = {}
    processed: list[ProcessedAsset] = []
    skipped: list[Issue] = []
    download_failed: list[Issue] = []
    counters: dict[str, int] = {}
    processed_by_old_path: dict[str, str] = {}
    duplicate_count = 0

    try:
        for reference in references:
            skip_reason = is_skippable_reference(reference.raw)
            if skip_reason:
                skipped.append(Issue(reference.raw, str(reference.source_file.relative_to(root)), reference.line, skip_reason))
                continue

            if reference.raw in processed_by_old_path:
                image_map[reference.raw] = processed_by_old_path[reference.raw]
                duplicate_count += 1
                continue

            if is_remote(reference.raw):
                input_path, original_size, error = download_remote(reference.raw, temp_dir, args.timeout)
                if error or input_path is None:
                    download_failed.append(
                        Issue(reference.raw, str(reference.source_file.relative_to(root)), reference.line, error or "unknown download failure")
                    )
                    continue
            else:
                input_path = resolve_local_path(root, reference)
                if input_path is None:
                    skipped.append(
                        Issue(reference.raw, str(reference.source_file.relative_to(root)), reference.line, "local file could not be resolved")
                    )
                    continue
                original_size = input_path.stat().st_size

            out_rel = build_output_relpath(root, reference, input_path, counters)
            output_path = output_root / Path(out_rel)
            try:
                action, output_size = copy_or_convert(input_path, output_path, args.quality, args.max_width)
            except Exception as exc:  # noqa: BLE001 - keep migration moving and report bad assets.
                skipped.append(Issue(reference.raw, str(reference.source_file.relative_to(root)), reference.line, f"processing failed: {exc}"))
                continue

            new_url = f"{r2_base_url}/{out_rel.replace(os.sep, '/')}"
            image_map[reference.raw] = new_url
            processed_by_old_path[reference.raw] = new_url
            processed.append(
                ProcessedAsset(
                    old_path=reference.raw,
                    new_url=new_url,
                    output_path=str(output_path.relative_to(root)),
                    source_file=str(reference.source_file.relative_to(root)),
                    kind=reference.kind,
                    original_size=original_size,
                    output_size=output_size,
                    action=action,
                )
            )
    finally:
        temp_dir_obj.cleanup()

    write_json(map_path, image_map)
    write_report(report_path, references, processed, skipped, download_failed, duplicate_count, r2_base_url)

    print(f"Processed {len(processed) + duplicate_count} references.")
    print(f"Skipped {len(skipped)} references.")
    print(f"Download failed for {len(download_failed)} references.")
    print(f"Wrote {map_path.relative_to(root)}")
    print(f"Wrote {report_path.relative_to(root)}")
    print(f"Wrote assets under {output_root.relative_to(root)}")
    return 0 if not download_failed else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Prepare Hugo image assets for R2 upload.")
    parser.add_argument("--root", default=".", help="Repository root. Defaults to current directory.")
    parser.add_argument("--scan-dir", action="append", default=list(DEFAULT_SCAN_DIRS), help="Directory to scan. Can be repeated.")
    parser.add_argument("--output-dir", default="r2-upload", help="Output directory for processed images.")
    parser.add_argument("--map-path", default="data/image-map.json", help="Path for old-path to R2 URL mapping JSON.")
    parser.add_argument("--report-path", default="reports/image-migration-report.md", help="Path for the Markdown report.")
    parser.add_argument("--r2-base-url", default=DEFAULT_R2_BASE_URL, help="Base URL for generated R2 object URLs.")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality for JPEG/PNG/WebP output.")
    parser.add_argument("--max-width", type=int, default=1600, help="Resize images wider than this value.")
    parser.add_argument("--timeout", type=int, default=30, help="Remote download timeout in seconds.")
    parser.add_argument("--dry-run", action="store_true", help="Scan only; do not download, process, or write files.")
    return parser


if __name__ == "__main__":
    sys.exit(run(build_parser().parse_args()))

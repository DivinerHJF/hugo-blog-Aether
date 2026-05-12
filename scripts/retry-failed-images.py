#!/usr/bin/env python3
"""Retry retryable image downloads from reports/image-migration-report.md."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import importlib.util
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
R2_BASE_URL = "https://img.philohao.com"
RETRYABLE_MARKERS = ("SSL:", "UNEXPECTED_EOF", "timed out", "timeout", "WinError 10060")
SITE_ICON_MARKERS = ("favicon", "apple-touch-icon", "safari-pinned-tab", "site.webmanifest")
IGNORED_TEMPLATE_PLACEHOLDERS = {
    "svg/version/%%v-%%v.%v.svg",
    "svg/version/%v-%v.svg",
    "%v/%v.svg",
}


@dataclass
class ManualRow:
    old_path: str
    source: str
    line: int
    reason: str
    category: str


@dataclass
class RetryResult:
    row: ManualRow
    status: str
    detail: str
    new_url: str = ""
    output_path: str = ""
    original_size: int = 0
    output_size: int = 0


def load_migration_module(root: Path):
    module_path = root / "scripts" / "prepare_image_migration.py"
    spec = importlib.util.spec_from_file_location("prepare_image_migration", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def strip_ticks(value: str) -> str:
    value = value.strip()
    if value.startswith("`") and value.endswith("`"):
        return value[1:-1]
    return value


def md_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def parse_table_line(line: str) -> list[str]:
    row = line.strip().strip("|")
    reader = csv.reader(io.StringIO(row), delimiter="|", escapechar="\\")
    return [cell.strip() for cell in next(reader)]


def classify(old_path: str, source: str, reason: str) -> str:
    lower = f"{old_path} {source} {reason}".lower()
    if old_path in IGNORED_TEMPLATE_PLACEHOLDERS or "%v" in old_path or "%%" in old_path:
        return "template-placeholders"
    if any(marker in lower for marker in SITE_ICON_MARKERS):
        return "site-icons"
    if old_path.startswith("http://") or old_path.startswith("https://"):
        if "http error 404" in lower:
            return "remote-404"
        if any(marker.lower() in lower for marker in RETRYABLE_MARKERS):
            return "remote-retryable"
    if "local file could not be resolved" in lower:
        return "unresolved-local"
    return "other"


def parse_needs_rows(report_path: Path) -> list[ManualRow]:
    lines = report_path.read_text(encoding="utf-8").splitlines()
    rows: list[ManualRow] = []
    in_table = False
    for line in lines:
        if line.startswith("## Needs Manual Confirmation"):
            in_table = True
            continue
        if not in_table:
            continue
        if line.startswith("## "):
            break
        if not line.startswith("|") or line.startswith("| ---") or "Path | Source" in line:
            continue
        cells = parse_table_line(line)
        if len(cells) < 4:
            continue
        old_path = strip_ticks(cells[0])
        source = strip_ticks(cells[1])
        try:
            line_no = int(cells[2])
        except ValueError:
            line_no = 0
        if len(cells) >= 5:
            category = cells[3]
            reason = " | ".join(cells[4:])
        else:
            reason = cells[3]
            category = classify(old_path, source, reason)
        if category not in {
            "site-icons",
            "template-placeholders",
            "remote-404",
            "remote-retryable",
            "unresolved-local",
            "other",
        }:
            category = classify(old_path, source, reason)
        rows.append(ManualRow(old_path, source, line_no, reason, category))
    return rows


def iri_to_uri(value: str) -> str:
    split = urllib.parse.urlsplit(value)
    netloc = split.netloc.encode("idna").decode("ascii")
    path = urllib.parse.quote(split.path, safe="/%:@")
    query = urllib.parse.quote(split.query, safe="=&?/:;%+")
    fragment = urllib.parse.quote(split.fragment, safe="")
    return urllib.parse.urlunsplit((split.scheme, netloc, path, query, fragment))


def download_with_urllib(url: str, target: Path, timeout: int) -> tuple[bool, str]:
    request = urllib.request.Request(iri_to_uri(url), headers={"User-Agent": BROWSER_UA, "Accept": "image/*,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            target.write_bytes(response.read())
        return True, "urllib"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def download_with_curl(url: str, target: Path, timeout: int) -> tuple[bool, str]:
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if not curl:
        return False, "curl not found"
    command = [
        curl,
        "--location",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        str(timeout),
        "--retry",
        "2",
        "--ssl-no-revoke",
        "--user-agent",
        BROWSER_UA,
        "--output",
        str(target),
        iri_to_uri(url),
    ]
    result = subprocess.run(command, text=True, capture_output=True, check=False)
    if result.returncode == 0 and target.exists() and target.stat().st_size > 0:
        return True, "curl"
    return False, (result.stderr or result.stdout or f"curl exited {result.returncode}").strip()


def download_retry(url: str, target: Path, timeout: int, attempts: int) -> tuple[bool, str]:
    errors: list[str] = []
    for attempt in range(1, attempts + 1):
        ok, detail = download_with_urllib(url, target, timeout)
        if ok:
            return True, f"{detail} attempt {attempt}"
        errors.append(f"urllib attempt {attempt}: {detail}")
        if "SSL" in detail or "EOF" in detail:
            ok, curl_detail = download_with_curl(url, target, timeout)
            if ok:
                return True, f"{curl_detail} fallback after attempt {attempt}"
            errors.append(f"curl fallback attempt {attempt}: {curl_detail}")
        if attempt < attempts:
            time.sleep(1.5 * attempt)
    return False, " | ".join(errors[-4:])


def next_output_relpath(root: Path, migration, row: ManualRow, input_path: Path) -> str:
    source_file = root / row.source
    article = migration.article_info(root, source_file)
    ext = migration.output_extension(input_path)
    if not article:
        stem = migration.safe_slug(Path(urllib.parse.urlsplit(row.old_path).path).stem or "image")
        digest = __import__("hashlib").sha1(row.old_path.encode("utf-8")).hexdigest()[:8]
        return f"misc/{stem}-{digest}{ext}"
    year, month, slug = article
    folder = root / "r2-upload" / "blog" / year / month
    existing: list[int] = []
    if folder.exists():
        pattern = re.compile(rf"^{re.escape(slug)}-(\d+)\.")
        for path in folder.iterdir():
            match = pattern.match(path.name)
            if match:
                existing.append(int(match.group(1)))
    return f"blog/{year}/{month}/{slug}-{(max(existing) if existing else 0) + 1:02d}{ext}"


def update_main_report(report_path: Path, rows: list[ManualRow], results: list[RetryResult]) -> None:
    text = report_path.read_text(encoding="utf-8")
    success_by_url = {result.row.old_path: result for result in results if result.status == "success"}
    failed_by_url = {result.row.old_path: result for result in results if result.status != "success"}
    remaining = [
        row
        for row in rows
        if row.old_path not in success_by_url and row.category not in {"site-icons", "template-placeholders"}
    ]
    remaining = [
        ManualRow(row.old_path, row.source, row.line, failed_by_url[row.old_path].detail, row.category)
        if row.old_path in failed_by_url
        else row
        for row in remaining
    ]

    if success_by_url:
        text = re.sub(
            r"(- Successfully processed: )(\d+)",
            lambda m: f"{m.group(1)}{int(m.group(2)) + len(success_by_url)}",
            text,
            count=1,
        )
        text = re.sub(
            r"(- Download failed: )(\d+)",
            lambda m: f"{m.group(1)}{max(0, int(m.group(2)) - len(success_by_url))}",
            text,
            count=1,
        )

    replacement = [
        "## Needs Manual Confirmation",
        "",
        "| Path | Source | Line | Category | Reason |",
        "| --- | --- | ---: | --- | --- |",
    ]
    for row in remaining:
        replacement.append(
            f"| `{md_cell(row.old_path)}` | `{md_cell(row.source)}` | {row.line} | {md_cell(row.category)} | {md_cell(row.reason)} |"
        )
    if not remaining:
        replacement.append("| _none_ |  |  |  |  |")

    replacement.extend(["", "## Ignored Template Placeholders", ""])
    replacement.append("| Path | Source | Line | Status |")
    replacement.append("| --- | --- | ---: | --- |")
    for row in rows:
        if row.category == "template-placeholders":
            replacement.append(f"| `{md_cell(row.old_path)}` | `{md_cell(row.source)}` | {row.line} | ignored-template-placeholder |")

    replacement.extend(["", "## Resolved Site Icons", ""])
    replacement.append("| Path | Source | Line | Status |")
    replacement.append("| --- | --- | ---: | --- |")
    for row in rows:
        if row.category == "site-icons":
            replacement.append(f"| `{md_cell(row.old_path)}` | `{md_cell(row.source)}` | {row.line} | generated/local-root-icon |")

    replacement.extend(["", "## Retry Resolved Images", ""])
    if success_by_url:
        replacement.append("| Old path | New R2 URL | Original size | Output size | Detail |")
        replacement.append("| --- | --- | ---: | ---: | --- |")
        for result in success_by_url.values():
            replacement.append(
                f"| `{md_cell(result.row.old_path)}` | `{md_cell(result.new_url)}` | {result.original_size} | {result.output_size} | {md_cell(result.detail)} |"
            )
    else:
        replacement.append("No retryable images were recovered.")

    replacement_text = "\n".join(replacement) + "\n"
    text = re.sub(r"## Needs Manual Confirmation\n.*", replacement_text, text, flags=re.DOTALL)
    report_path.write_text(text, encoding="utf-8")


def write_retry_report(path: Path, rows: list[ManualRow], results: list[RetryResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    success = [result for result in results if result.status == "success"]
    failed = [result for result in results if result.status != "success"]
    lines = [
        "# Retry Image Download Report",
        "",
        f"- Generated: {dt.datetime.now(dt.timezone.utc).isoformat()}",
        f"- Retryable candidates: {len([row for row in rows if row.category == 'remote-retryable'])}",
        f"- Retry succeeded: {len(success)}",
        f"- Retry still failing: {len(failed)}",
        "",
        "## Results",
        "",
        "| Status | Old path | New R2 URL | Source | Detail |",
        "| --- | --- | --- | --- | --- |",
    ]
    for result in results:
        lines.append(
            f"| {md_cell(result.status)} | `{md_cell(result.row.old_path)}` | `{md_cell(result.new_url)}` | `{md_cell(result.row.source)}:{result.row.line}` | {md_cell(result.detail)} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    migration = load_migration_module(root)
    report_path = root / "reports" / "image-migration-report.md"
    rows = parse_needs_rows(report_path)
    retry_rows = [row for row in rows if row.category == "remote-retryable"]
    image_map_path = root / "data" / "image-map.json"
    image_map = json.loads(image_map_path.read_text(encoding="utf-8"))
    results: list[RetryResult] = []

    with tempfile.TemporaryDirectory(prefix="retry-images-") as temp_name:
        temp_dir = Path(temp_name)
        for row in retry_rows:
            suffix = Path(urllib.parse.urlsplit(row.old_path).path).suffix or ".img"
            input_path = temp_dir / (migration.safe_slug(Path(row.old_path).stem) + suffix)
            ok, detail = download_retry(row.old_path, input_path, args.timeout, args.attempts)
            if not ok:
                results.append(RetryResult(row, "failed", detail))
                continue
            original_size = input_path.stat().st_size
            output_rel = next_output_relpath(root, migration, row, input_path)
            output_path = root / "r2-upload" / Path(output_rel)
            try:
                action, output_size = migration.copy_or_convert(input_path, output_path, args.quality, args.max_width)
            except Exception as exc:  # noqa: BLE001
                results.append(RetryResult(row, "failed", f"processing failed: {exc}"))
                continue
            new_url = f"{R2_BASE_URL}/{output_rel.replace('\\', '/')}"
            image_map[row.old_path] = new_url
            results.append(RetryResult(row, "success", f"{detail}; {action}", new_url, str(output_path.relative_to(root)), original_size, output_size))

    image_map_path.write_text(json.dumps(image_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_retry_report(root / "reports" / "retry-image-download-report.md", rows, results)
    update_main_report(report_path, rows, results)
    print(f"Retryable candidates: {len(retry_rows)}")
    print(f"Retry succeeded: {len([result for result in results if result.status == 'success'])}")
    print(f"Retry still failing: {len([result for result in results if result.status != 'success'])}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Retry retryable failed image downloads.")
    parser.add_argument("--root", default=".", help="Repository root.")
    parser.add_argument("--timeout", type=int, default=60, help="Timeout per attempt in seconds.")
    parser.add_argument("--attempts", type=int, default=3, help="Maximum urllib attempts per URL.")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality.")
    parser.add_argument("--max-width", type=int, default=1600, help="Maximum output width.")
    return parser


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))

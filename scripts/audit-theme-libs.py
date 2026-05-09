#!/usr/bin/env python3
"""Generate a read-only Aether static-library dependency matrix.

The script scans local Hugo content and config only, then prints a Markdown
report to stdout. It never mutates repository files, so the output can be saved
by CI as an artifact or pasted into a pull-request description before deleting
vendored theme libraries.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python < 3.11 fallback message.
    tomllib = None  # type: ignore[assignment]

SHORTCODE_RE = re.compile(r"{{\s*[<%]\s*(/?)\s*([A-Za-z][A-Za-z0-9_-]*)\b")


@dataclass(frozen=True)
class ResourceMapping:
    feature: str
    directories: tuple[str, ...]
    trigger: Callable[[dict[str, Any], Counter[str]], bool]
    source: Callable[[dict[str, Any], Counter[str]], str]


def nested_get(data: dict[str, Any], dotted_key: str, default: Any = None) -> Any:
    """Return a dotted TOML key from nested dictionaries."""
    current: Any = data
    for part in dotted_key.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def is_enabled(value: Any) -> bool:
    """Treat explicit true/non-empty values as enabled, and everything else as off."""
    return bool(value)


def format_bool(value: bool) -> str:
    return "是" if value else "否"


def format_value(value: Any) -> str:
    if isinstance(value, bool):
        return str(value).lower()
    if value is None:
        return "未设置"
    if isinstance(value, dict):
        enabled = [key for key, val in value.items() if is_enabled(val)]
        return ", ".join(sorted(enabled)) if enabled else "无启用项"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value) if value else "[]"
    return str(value)


def markdown_escape(value: Any) -> str:
    text = str(value)
    return text.replace("|", "\\|").replace("\n", "<br>")


def human_size(num_bytes: int | None) -> str:
    if num_bytes is None:
        return "目录不存在"
    units = ("B", "KiB", "MiB", "GiB")
    size = float(num_bytes)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{int(size)} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{num_bytes} B"


def directory_size(path: Path) -> int | None:
    if not path.exists():
        return None
    if path.is_file():
        return path.stat().st_size
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [name for name in dirnames if not Path(dirpath, name).is_symlink()]
        for filename in filenames:
            file_path = Path(dirpath, filename)
            if file_path.is_symlink():
                continue
            total += file_path.stat().st_size
    return total


def read_config(path: Path) -> dict[str, Any]:
    if tomllib is None:
        raise RuntimeError("Python 3.11+ is required because tomllib is unavailable")
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with path.open("rb") as file_obj:
        return tomllib.load(file_obj)


def scan_shortcodes(content_dir: Path) -> Counter[str]:
    counts: Counter[str] = Counter()
    if not content_dir.exists():
        return counts
    for path in sorted(content_dir.rglob("*.md")):
        text = path.read_text(encoding="utf-8", errors="replace")
        for closing, name in SHORTCODE_RE.findall(text):
            if not closing:
                counts[name] += 1
    return counts


def search_enabled(config: dict[str, Any], search_type: str) -> bool:
    return is_enabled(nested_get(config, "params.search.enable")) and nested_get(config, "params.search.type") == search_type


def comment_enabled(config: dict[str, Any], provider: str) -> bool:
    return is_enabled(nested_get(config, "params.page.comment.enable")) and is_enabled(
        nested_get(config, f"params.page.comment.{provider}.enable")
    )


def shortcode_source(name: str) -> Callable[[dict[str, Any], Counter[str]], str]:
    return lambda _config, shortcodes: f"shortcode.{name} count={shortcodes.get(name, 0)}"


def risk_for(active: bool, exists: bool) -> str:
    if active:
        return "高：当前触发，删除会破坏对应页面或功能"
    if exists:
        return "低：当前未触发，删除前仍需用本脚本/CI 复核"
    return "无：目录不存在"


def enabled_keys(value: Any, exclude: set[str] | None = None) -> list[str]:
    exclude = exclude or set()
    if not isinstance(value, dict):
        return []
    return sorted(key for key, val in value.items() if key not in exclude and is_enabled(val))


SOCIAL_SIMPLE_ICON_KEYS = {"douban", "gitea", "googlescholar", "ko-fi", "liberapay", "matrix", "xmpp", "zhihu"}
SHARE_SIMPLE_ICON_KEYS = {"Baidu", "Instapaper", "Line", "Myspace"}


def social_uses_simple_icons(config: dict[str, Any]) -> bool:
    social = nested_get(config, "params.social")
    if not isinstance(social, dict):
        return False
    for key, value in social.items():
        if not is_enabled(value):
            continue
        if key.lower() in SOCIAL_SIMPLE_ICON_KEYS:
            return True
        if isinstance(value, dict) and nested_get(value, "icon.Simpleicons"):
            return True
    return False


def share_uses_simple_icons(config: dict[str, Any]) -> bool:
    share = nested_get(config, "params.page.share")
    if not isinstance(share, dict) or not is_enabled(share.get("enable")):
        return False
    return any(is_enabled(share.get(key)) for key in SHARE_SIMPLE_ICON_KEYS)


def build_mappings() -> list[ResourceMapping]:
    return [
        ResourceMapping(
            "search.lunr",
            ("themes/aether/assets/lib/lunr",),
            lambda config, _shortcodes: search_enabled(config, "lunr"),
            lambda config, _shortcodes: "params.search.enable="
            f"{format_value(nested_get(config, 'params.search.enable'))}; "
            f"params.search.type={format_value(nested_get(config, 'params.search.type'))}",
        ),
        ResourceMapping(
            "search.algolia",
            ("themes/aether/assets/lib/algoliasearch",),
            lambda config, _shortcodes: search_enabled(config, "algolia"),
            lambda config, _shortcodes: "params.search.enable="
            f"{format_value(nested_get(config, 'params.search.enable'))}; "
            f"params.search.type={format_value(nested_get(config, 'params.search.type'))}",
        ),
        *[
            ResourceMapping(
                f"comment.{provider}",
                (f"themes/aether/assets/lib/{provider}",),
                lambda config, _shortcodes, provider=provider: comment_enabled(config, provider),
                lambda config, _shortcodes, provider=provider: "params.page.comment.enable="
                f"{format_value(nested_get(config, 'params.page.comment.enable'))}; "
                f"params.page.comment.{provider}.enable="
                f"{format_value(nested_get(config, f'params.page.comment.{provider}.enable'))}",
            )
            for provider in ("gitalk", "valine", "waline", "twikoo", "vssue")
        ],
        *[
            ResourceMapping(
                f"shortcode.{name}",
                directories,
                lambda _config, shortcodes, name=name: shortcodes.get(name, 0) > 0,
                shortcode_source(name),
            )
            for name, directories in {
                "mermaid": ("themes/aether/assets/lib/mermaid",),
                "echarts": ("themes/aether/assets/lib/echarts",),
                "mapbox": ("themes/aether/assets/lib/mapbox-gl",),
                "music": ("themes/aether/assets/lib/aplayer", "themes/aether/assets/lib/meting"),
                "typeit": ("themes/aether/assets/lib/typeit",),
            }.items()
        ],
        ResourceMapping(
            "math.katex",
            ("themes/aether/assets/lib/katex", "themes/aether/static/lib/katex"),
            lambda config, _shortcodes: is_enabled(nested_get(config, "params.page.math.enable")),
            lambda config, _shortcodes: "params.page.math.enable="
            f"{format_value(nested_get(config, 'params.page.math.enable'))}",
        ),
        ResourceMapping(
            "icons.fontawesome",
            ("themes/aether/assets/lib/fontawesome-free", "themes/aether/static/lib/webfonts"),
            lambda config, _shortcodes: is_enabled(nested_get(config, "params.page.fontawesome"))
            or bool(enabled_keys(nested_get(config, "params.page.share"), {"enable"}))
            or bool(enabled_keys(nested_get(config, "params.social"))),
            lambda config, _shortcodes: "params.page.fontawesome="
            f"{format_value(nested_get(config, 'params.page.fontawesome'))}; "
            f"params.page.share={format_value(nested_get(config, 'params.page.share'))}; "
            f"params.social={format_value(nested_get(config, 'params.social'))}",
        ),
        ResourceMapping(
            "icons.simple",
            ("themes/aether/assets/lib/simple-icons",),
            lambda config, _shortcodes: social_uses_simple_icons(config) or share_uses_simple_icons(config),
            lambda config, _shortcodes: "params.social="
            f"{format_value(nested_get(config, 'params.social'))}; "
            f"params.page.share={format_value(nested_get(config, 'params.page.share'))}",
        ),
        ResourceMapping(
            "page.twemoji",
            ("themes/aether/assets/lib/twemoji",),
            lambda config, _shortcodes: is_enabled(nested_get(config, "params.page.twemoji")),
            lambda config, _shortcodes: "params.page.twemoji="
            f"{format_value(nested_get(config, 'params.page.twemoji'))}",
        ),
        ResourceMapping(
            "page.lightgallery",
            ("themes/aether/assets/lib/lightgallery", "themes/aether/static/lib/fonts"),
            lambda config, _shortcodes: is_enabled(nested_get(config, "params.page.lightgallery")),
            lambda config, _shortcodes: "params.page.lightgallery="
            f"{format_value(nested_get(config, 'params.page.lightgallery'))}",
        ),
        ResourceMapping(
            "cookieconsent",
            ("themes/aether/assets/lib/cookieconsent",),
            lambda config, _shortcodes: is_enabled(nested_get(config, "params.cookieconsent.enable")),
            lambda config, _shortcodes: "params.cookieconsent.enable="
            f"{format_value(nested_get(config, 'params.cookieconsent.enable'))}",
        ),
    ]


def render_report(root: Path, config: dict[str, Any], shortcodes: Counter[str]) -> str:
    rows: list[tuple[str, str, str, str, str, str]] = []
    for mapping in build_mappings():
        active = mapping.trigger(config, shortcodes)
        source = mapping.source(config, shortcodes)
        for directory in mapping.directories:
            size = directory_size(root / directory)
            rows.append(
                (
                    directory,
                    human_size(size),
                    mapping.feature,
                    source,
                    format_bool(active),
                    risk_for(active, size is not None),
                )
            )

    shortcode_summary = ", ".join(f"{name}={count}" for name, count in shortcodes.most_common()) or "未发现"
    comment_providers = nested_get(config, "params.page.comment", {})
    comment_summary = ", ".join(
        f"{provider}={format_value(settings.get('enable'))}"
        for provider, settings in sorted(comment_providers.items())
        if isinstance(settings, dict) and "enable" in settings
    ) or "未发现 provider.enable"

    lines = [
        "# Aether 静态库依赖矩阵",
        "",
        "只读审计结果，可保存为 CI artifact 或复制到 PR 描述，作为删除主题静态库前的依据。",
        "",
        "## 扫描摘要",
        "",
        f"- Markdown 短代码统计：{shortcode_summary}",
        f"- `params.search.enable`：{format_value(nested_get(config, 'params.search.enable'))}",
        f"- `params.search.type`：{format_value(nested_get(config, 'params.search.type'))}",
        f"- `params.page.twemoji`：{format_value(nested_get(config, 'params.page.twemoji'))}",
        f"- `params.page.lightgallery`：{format_value(nested_get(config, 'params.page.lightgallery'))}",
        f"- `params.page.math.enable`：{format_value(nested_get(config, 'params.page.math.enable'))}",
        f"- `params.page.comment.*.enable`：{comment_summary}",
        f"- `params.cookieconsent.enable`：{format_value(nested_get(config, 'params.cookieconsent.enable'))}",
        f"- `params.social`：{format_value(nested_get(config, 'params.social'))}",
        f"- `params.page.share`：{format_value(nested_get(config, 'params.page.share'))}",
        "",
        "## 依赖矩阵",
        "",
        "| 目录 | 体积 | 功能 | 触发来源 | 当前是否触发 | 删除风险等级 |",
        "| --- | ---: | --- | --- | --- | --- |",
    ]
    lines.extend(
        "| " + " | ".join(markdown_escape(column) for column in row) + " |" for row in rows
    )
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Repository root (default: current directory)")
    parser.add_argument("--config", type=Path, default=Path("config.toml"), help="Path to Hugo config TOML")
    parser.add_argument("--content", type=Path, default=Path("content"), help="Path to Hugo content directory")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    config_path = args.config if args.config.is_absolute() else root / args.config
    content_dir = args.content if args.content.is_absolute() else root / args.content

    config = read_config(config_path)
    shortcodes = scan_shortcodes(content_dir)
    print(render_report(root, config, shortcodes))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Tìm kiếm Amazon qua Rainforest API cho một danh sách từ khóa, lọc theo:
  - Còn hàng (buybox availability type = in_stock)
  - Ngày giao: chấp nhận đến hết ngày deadline (mặc định 10/05/2026 — Mother's Day);
    loại nếu ngày giao sớm nhất SAU deadline (tức từ 11/05/2026 trở đi với deadline 10/05).
  - Đánh giá > 4.5 sao
  - Ghi tối đa N sản phẩm (mặc định 16) vào data/products.json để Next.js đọc (tiết kiệm credit khi dùng --cache-hours).

Yêu cầu API key:
  export RAINFOREST_API_KEY=...
  (tuỳ chọn) export AMAZON_ASSOCIATE_TAG=anvopro-20

Chi phí tín dụng: mỗi lần refresh = (số từ khóa) × (1 + include_products_count), trừ khi bỏ qua nhờ cache file.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests
from dateutil import parser as date_parser
from tabulate import tabulate

REPO_ROOT = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv

    # `.env.local` ghi đè biến môi trường (và `.env`) để key trong file luôn thắng — tránh còn RAINFOREST_API_KEY=demo từ shell.
    load_dotenv(REPO_ROOT / ".env")
    load_dotenv(REPO_ROOT / ".env.local", override=True)
except ImportError:
    pass

RAINFOREST_URL = "https://api.rainforestapi.com/request"
DEFAULT_PRODUCTS_JSON = REPO_ROOT / "data" / "products.json"


def _ensure_utf8_stdio() -> None:
    """Tránh UnicodeEncodeError khi in tiếng Việt trên Windows (cp1252)."""
    if sys.platform != "win32":
        return
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (OSError, ValueError, AttributeError):
                pass

DEFAULT_KEYWORDS = [
    "Kindle Paperwhite",
    "Espresso Machine",
    "Robot Vacuum",
    "Fitness Tracker",
    "Massage Gun",
]


def _parse_iso_or_none(s: str | None) -> date | None:
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.date()
    except ValueError:
        return None


def _parse_us_date_string(text: str, default_year: int) -> date | None:
    """Parse strings like 'Wednesday, March 12' or 'March 12, 2026'."""
    text = text.strip()
    if not text:
        return None
    low = text.lower()
    if "reviewed" in low and "on" in low:
        return None
    try:
        dt = date_parser.parse(
            text,
            default=datetime(default_year, 1, 1),
            fuzzy=True,
        )
        return dt.date()
    except (ValueError, TypeError, OverflowError):
        return None


_MONTH_RE = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)


def _extract_dates_regex(text: str, default_year: int) -> list[date]:
    out: list[date] = []
    if not text:
        return out
    for m in re.finditer(
        rf"{_MONTH_RE}\s+(\d{{1,2}})(?:\s*,\s*(\d{{4}}))?",
        text,
        flags=re.IGNORECASE,
    ):
        month_day = m.group(0)
        year = int(m.group(2)) if m.group(2) else default_year
        parsed = _parse_us_date_string(month_day + (f", {year}" if not m.group(2) else ""), year)
        if parsed:
            if not m.group(2):
                parsed = parsed.replace(year=year)
            out.append(parsed)
    return out


def collect_delivery_candidate_strings(product: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    bb = product.get("buybox_winner")
    if isinstance(bb, dict):
        av = bb.get("availability")
        if isinstance(av, dict):
            for key in ("raw", "delivery_message"):
                v = av.get(key)
                if isinstance(v, str):
                    parts.append(v)
        sb = bb.get("secondary_buybox")
        if isinstance(sb, dict):
            sav = sb.get("availability")
            if isinstance(sav, dict) and isinstance(sav.get("raw"), str):
                parts.append(sav["raw"])
        ful = bb.get("fulfillment")
        if isinstance(ful, dict):
            for key in ("standard_delivery", "fastest_delivery", "import_delivery"):
                block = ful.get(key)
                if isinstance(block, dict):
                    for dk in ("date", "name"):
                        v = block.get(dk)
                        if isinstance(v, str):
                            parts.append(v)
    sns = product.get("subscribe_and_save")
    if isinstance(sns, dict) and isinstance(sns.get("delivery_message"), str):
        parts.append(sns["delivery_message"])

    return list(dict.fromkeys(parts))


def earliest_delivery_date(product: dict[str, Any], default_year: int) -> tuple[date | None, list[date]]:
    candidates: list[date] = []
    bb = product.get("buybox_winner")
    if isinstance(bb, dict):
        ful = bb.get("fulfillment")
        if isinstance(ful, dict):
            for key in ("standard_delivery", "fastest_delivery", "import_delivery"):
                block = ful.get(key)
                if not isinstance(block, dict):
                    continue
                for dk in ("date", "name"):
                    raw = block.get(dk)
                    if not isinstance(raw, str):
                        continue
                    p_iso = _parse_iso_or_none(raw)
                    if p_iso:
                        candidates.append(p_iso)
                        continue
                    p = _parse_us_date_string(raw, default_year)
                    if p:
                        candidates.append(p)
                    candidates.extend(_extract_dates_regex(raw, default_year))

    for text in collect_delivery_candidate_strings(product):
        p = _parse_us_date_string(text, default_year)
        if p:
            candidates.append(p)
        candidates.extend(_extract_dates_regex(text, default_year))

    candidates = [c for c in candidates if c is not None]
    if not candidates:
        return None, []
    return min(candidates), candidates


def is_in_stock(product: dict[str, Any]) -> bool:
    bb = product.get("buybox_winner")
    if not isinstance(bb, dict):
        return False
    av = bb.get("availability")
    if not isinstance(av, dict):
        return False
    return av.get("type") == "in_stock"


def product_rating(product: dict[str, Any], search_hit: dict[str, Any]) -> float:
    r = product.get("rating")
    if isinstance(r, (int, float)):
        return float(r)
    r2 = search_hit.get("rating")
    if isinstance(r2, (int, float)):
        return float(r2)
    return 0.0


def product_prime(product: dict[str, Any], search_hit: dict[str, Any]) -> bool:
    bb = product.get("buybox_winner")
    if isinstance(bb, dict) and bb.get("is_prime") is True:
        return True
    return search_hit.get("is_prime") is True


def product_price_raw(product: dict[str, Any], search_hit: dict[str, Any]) -> str:
    bb = product.get("buybox_winner")
    if isinstance(bb, dict):
        price = bb.get("price")
        if isinstance(price, dict) and isinstance(price.get("raw"), str):
            return price["raw"]
    p = search_hit.get("price")
    if isinstance(p, dict) and isinstance(p.get("raw"), str):
        return p["raw"]
    prices = search_hit.get("prices")
    if isinstance(prices, list) and prices:
        pr = prices[0]
        if isinstance(pr, dict) and isinstance(pr.get("raw"), str):
            return pr["raw"]
    return "N/A"


def parse_price_value(raw: str) -> float:
    cleaned = re.sub(r"[^\d.]", "", raw or "")
    if not cleaned:
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def product_image(product: dict[str, Any], hit: dict[str, Any]) -> str:
    for obj in (product, hit):
        if not isinstance(obj, dict):
            continue
        mi = obj.get("main_image")
        if isinstance(mi, dict):
            link = mi.get("link")
            if isinstance(link, str) and link.startswith("http"):
                return link
        for key in ("image", "thumbnail"):
            v = obj.get(key)
            if isinstance(v, str) and v.startswith("http"):
                return v
    return ""


def listing_product_url(asin: str, associate_tag: str | None) -> str:
    """URL listing chuẩn amazon.com/dp (cho landing & JSON)."""
    base = f"https://www.amazon.com/dp/{asin}"
    if associate_tag:
        return f"{base}?{urlencode({'tag': associate_tag})}"
    return base


def short_product_url(asin: str, associate_tag: str | None) -> str:
    base = f"https://amzn.com/dp/{asin}"
    if associate_tag:
        return f"{base}?{urlencode({'tag': associate_tag})}"
    return base


@dataclass
class Row:
    keyword: str
    title: str
    asin: str
    price: str
    price_value: float
    link: str
    short_url: str
    image: str
    rating: float
    is_prime: bool
    delivery_min: date | None


def fetch_search_with_products(
    api_key: str,
    search_term: str,
    amazon_domain: str,
    number_of_results: int,
    include_products_count: int,
    associate_id: str | None,
    extra_params: dict[str, str],
) -> dict[str, Any]:
    params: dict[str, str | int] = {
        "api_key": api_key,
        "type": "search",
        "amazon_domain": amazon_domain,
        "search_term": search_term,
        "number_of_results": number_of_results,
        "include_products_count": include_products_count,
        "sort_by": "average_review",
        "exclude_sponsored": "true",
    }
    if associate_id:
        params["associate_id"] = associate_id
    params.update(extra_params)
    r = requests.get(RAINFOREST_URL, params=params, timeout=120)
    r.raise_for_status()
    return r.json()


def process_keyword(
    keyword: str,
    *,
    api_key: str,
    amazon_domain: str,
    associate_tag: str | None,
    deadline: date,
    min_rating: float,
    number_of_results: int,
    include_products_count: int,
    default_year: int,
    extra_params: dict[str, str],
) -> list[Row]:
    data = fetch_search_with_products(
        api_key,
        keyword,
        amazon_domain,
        number_of_results,
        include_products_count,
        associate_tag,
        extra_params,
    )
    results = data.get("search_results") or []
    rows: list[Row] = []

    for hit in results:
        if not isinstance(hit, dict):
            continue
        product = hit.get("product")
        if not isinstance(product, dict):
            continue
        if not is_in_stock(product):
            continue
        rating = product_rating(product, hit)
        if not (rating > min_rating):
            continue
        earliest, _ = earliest_delivery_date(product, default_year)
        # Chấp nhận giao đến hết `deadline`; loại nếu ngày giao sớm nhất sau deadline (>= ngày kế tiếp).
        if earliest is None or earliest > deadline:
            continue

        asin = product.get("asin") or hit.get("asin")
        if not asin or not isinstance(asin, str):
            continue
        title = product.get("title") or hit.get("title") or ""
        if not isinstance(title, str):
            title = str(title)
        price = product_price_raw(product, hit)

        rows.append(
            Row(
                keyword=keyword,
                title=title.strip(),
                asin=asin.strip(),
                price=price,
                price_value=parse_price_value(price),
                link=listing_product_url(asin.strip(), associate_tag),
                short_url=short_product_url(asin.strip(), associate_tag),
                image=product_image(product, hit),
                rating=rating,
                is_prime=product_prime(product, hit),
                delivery_min=earliest,
            )
        )

    rows.sort(key=lambda x: (not x.is_prime, -x.rating, x.delivery_min or date.max))
    return rows


def merge_to_top(rows: list[Row], limit: int) -> list[Row]:
    best: dict[str, Row] = {}
    for r in rows:
        prev = best.get(r.asin)
        if prev is None:
            best[r.asin] = r
            continue
        if (r.is_prime and not prev.is_prime) or (
            r.is_prime == prev.is_prime and r.rating > prev.rating
        ):
            best[r.asin] = r
    out = sorted(
        best.values(),
        key=lambda x: (not x.is_prime, -x.rating, x.delivery_min or date.max),
    )
    return out[:limit]


def write_products_catalog(path: Path, rows: list[Row]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "products": [
            {
                "keyword": r.keyword,
                "title": r.title,
                "asin": r.asin,
                "price": r.price,
                "priceValue": r.price_value,
                "rating": r.rating,
                "is_prime": r.is_prime,
                "image": r.image,
                "link": r.link,
            }
            for r in rows
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    _ensure_utf8_stdio()
    ap = argparse.ArgumentParser(description="Rainforest Amazon search + landing catalog.")
    ap.add_argument(
        "--deadline",
        default="2026-05-10",
        help="Ngày giao muộn nhất được chấp nhận (YYYY-MM-DD). Giao sau ngày này bị loại. Mặc định: 2026-05-10.",
    )
    ap.add_argument("--min-rating", type=float, default=4.5, help="Rating phải LỚN HƠN giá trị này.")
    ap.add_argument("--amazon-domain", default="amazon.com")
    ap.add_argument("--number-of-results", type=int, default=48)
    ap.add_argument(
        "--include-products-count",
        type=int,
        default=12,
        help="Số kết quả search kèm chi tiết product (credit thêm).",
    )
    ap.add_argument("--default-year", type=int, default=2026)
    ap.add_argument("--associate-tag", default=os.environ.get("AMAZON_ASSOCIATE_TAG", "anvopro-20"))
    ap.add_argument(
        "--products-json",
        type=Path,
        default=DEFAULT_PRODUCTS_JSON,
        help="File catalog cho Next.js (mặc định data/products.json).",
    )
    ap.add_argument(
        "--grid-size",
        type=int,
        default=16,
        help="Số sản phẩm tối đa ghi vào catalog sau khi gộp ASIN.",
    )
    ap.add_argument(
        "--cache-hours",
        type=float,
        default=24.0,
        help="Nếu file catalog tồn tại và mới hơn X giờ, bỏ qua gọi API (tiết kiệm credit).",
    )
    ap.add_argument(
        "--force-refresh",
        action="store_true",
        help="Luôn gọi API, bỏ qua cache file.",
    )
    ap.add_argument(
        "--extra-param",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Tham số GET thêm cho Rainforest.",
    )
    ap.add_argument(
        "--json-out",
        help="Tuỳ chọn: ghi thêm bản sao JSON chi tiết (mọi hàng trước khi cắt grid).",
    )
    args = ap.parse_args()

    deadline = date.fromisoformat(args.deadline)
    api_key = os.environ.get("RAINFOREST_API_KEY", "").strip()
    products_path: Path = args.products_json

    if not args.force_refresh and products_path.is_file():
        age_sec = time.time() - products_path.stat().st_mtime
        if age_sec < args.cache_hours * 3600:
            print(
                f"Bỏ qua Rainforest: dùng cache {products_path} "
                f"({age_sec / 3600:.2f}h < --cache-hours {args.cache_hours}). "
                f"Dùng --force-refresh để tải lại.",
                file=sys.stderr,
            )
            return 0

    if not api_key:
        print("Thiếu biến môi trường RAINFOREST_API_KEY.", file=sys.stderr)
        return 1

    extra_params: dict[str, str] = {}
    for raw in args.extra_param:
        if "=" not in raw:
            print(f"Bỏ qua --extra-param không hợp lệ: {raw}", file=sys.stderr)
            continue
        k, v = raw.split("=", 1)
        extra_params[k.strip()] = v.strip()

    keywords = DEFAULT_KEYWORDS
    all_rows: list[Row] = []

    print(
        f"Lọc: in_stock, rating > {args.min_rating}, "
        f"ngày giao sớm nhất ≤ {deadline.isoformat()} (loại nếu sau ngày đó). "
        f"Rainforest: include_products_count={args.include_products_count}.\n",
        file=sys.stderr,
    )

    for kw in keywords:
        try:
            rows = process_keyword(
                kw,
                api_key=api_key,
                amazon_domain=args.amazon_domain,
                associate_tag=args.associate_tag or None,
                deadline=deadline,
                min_rating=args.min_rating,
                number_of_results=args.number_of_results,
                include_products_count=args.include_products_count,
                default_year=args.default_year,
                extra_params=extra_params,
            )
        except requests.HTTPError as e:
            print(f"[{kw}] HTTP lỗi: {e}", file=sys.stderr)
            if e.response is not None:
                print(e.response.text[:500], file=sys.stderr)
            continue
        except requests.RequestException as e:
            print(f"[{kw}] Lỗi mạng: {e}", file=sys.stderr)
            continue
        all_rows.extend(rows)
        print(f"[{kw}] {len(rows)} sản phẩm thỏa điều kiện.", file=sys.stderr)

    top = merge_to_top(all_rows, args.grid_size)
    write_products_catalog(products_path, top)
    print(f"\nĐã ghi {len(top)} sản phẩm → {products_path}", file=sys.stderr)

    headers = ["Keyword", "Title", "ASIN", "Price", "Short URL", "Rating", "Prime", "Delivery"]
    table = [
        [
            r.keyword,
            (r.title[:55] + "...") if len(r.title) > 57 else r.title,
            r.asin,
            r.price,
            r.short_url,
            f"{r.rating:.1f}",
            "Y" if r.is_prime else "",
            r.delivery_min.isoformat() if r.delivery_min else "",
        ]
        for r in top
    ]
    if table:
        print(tabulate(table, headers=headers, tablefmt="github"))
    else:
        print("No products matched filters (check API key, credits, and filters).")

    if args.json_out:
        payload = [
            {
                "keyword": r.keyword,
                "title": r.title,
                "asin": r.asin,
                "price": r.price,
                "link": r.link,
                "short_url": r.short_url,
                "image": r.image,
                "rating": r.rating,
                "is_prime": r.is_prime,
                "earliest_delivery": r.delivery_min.isoformat() if r.delivery_min else None,
            }
            for r in all_rows
        ]
        Path(args.json_out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Đã ghi {len(payload)} hàng (full) -> {args.json_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

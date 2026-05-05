#!/usr/bin/env python3
"""
Tìm kiếm Amazon qua Rainforest API — 5 từ khóa cố định, mỗi danh mục đúng 16 SKU (Rainforest max_page + lấp từ pool campaign nếu thiếu).

Lọc:
  - Còn hàng (buybox availability type = in_stock)
  - Rating >= min_rating (mặc định 4.0)
  - Chỉ Prime (is_prime)
  - Ngày giao sớm nhất on/before --delivery-cutoff (mặc định 10/05/2026 → giữ nếu earliest <= 2026-05-10)

Lưu data/products.json với categories[] (theo từ khóa) + products[] (gộp phẳng, ASIN không trùng).

Yêu cầu API key:
  export RAINFOREST_API_KEY=...
  (tuỳ chọn) export AMAZON_ASSOCIATE_TAG=anvopro-20

Chi phí: ~5 × (1 + include_products_count) credit mỗi lần refresh (trừ cache file).
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
# Link trong JSON luôn /dp/{asin}?tag=... — không dùng URL listing từ API.
CANONICAL_ASSOCIATE_TAG = "anvopro-20"


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
    "fitness tracker",
    "massage gun",
    "espresso machine",
    "robot vacuum",
    "kindle paperwhite",
]


def keyword_slug(keyword: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", keyword.strip().lower()).strip("-")


def _redact_api_key_in_text(text: str) -> str:
    """Tránh in full api_key ra stderr/log khi URL lỗi."""
    return re.sub(r"api_key=[^&\s]+", "api_key=***", text, flags=re.IGNORECASE)


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


def canonical_dp_url(asin: str) -> str:
    """Chỉ tạo link từ ASIN + tag cố định (tránh 404 từ URL API)."""
    a = asin.strip()
    return f"https://www.amazon.com/dp/{a}?{urlencode({'tag': CANONICAL_ASSOCIATE_TAG})}"


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
    *,
    page: int = 1,
) -> dict[str, Any]:
    """Một trang search. Không gửi max_page cùng include_products_count — API Rainforest trả 400."""
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
    if page > 1:
        params["page"] = page
    params.update(extra_params)
    r = requests.get(RAINFOREST_URL, params=params, timeout=120)
    r.raise_for_status()
    return r.json()


def extract_rows_from_search_response(
    keyword: str,
    data: dict[str, Any],
    *,
    associate_tag: str | None,
    delivery_cutoff: date,
    min_rating: float,
    prime_only: bool,
    default_year: int,
) -> list[Row]:
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
        if prime_only and not product_prime(product, hit):
            continue
        rating = product_rating(product, hit)
        if rating < min_rating:
            continue
        earliest, _ = earliest_delivery_date(product, default_year)
        # Giao on/before cutoff (vd 10/05/2026): bỏ qua nếu không parse được hoặc sau cutoff.
        if earliest is None or earliest > delivery_cutoff:
            continue

        asin = product.get("asin") or hit.get("asin")
        if not asin or not isinstance(asin, str):
            continue
        title = product.get("title") or hit.get("title") or ""
        if not isinstance(title, str):
            title = str(title)
        price = product_price_raw(product, hit)
        asin_s = asin.strip()

        rows.append(
            Row(
                keyword=keyword,
                title=title.strip(),
                asin=asin_s,
                price=price,
                price_value=parse_price_value(price),
                link=canonical_dp_url(asin_s),
                short_url=short_product_url(asin_s, associate_tag),
                image=product_image(product, hit),
                rating=rating,
                is_prime=product_prime(product, hit),
                delivery_min=earliest,
            )
        )

    rows.sort(key=lambda x: (not x.is_prime, -x.rating, x.delivery_min or date.max))
    return rows


def process_keyword(
    keyword: str,
    *,
    api_key: str,
    amazon_domain: str,
    associate_tag: str | None,
    delivery_cutoff: date,
    min_rating: float,
    prime_only: bool,
    number_of_results: int,
    include_products_count: int,
    default_year: int,
    extra_params: dict[str, str],
    max_search_pages: int,
    per_keyword_limit: int,
) -> list[Row]:
    acc: list[Row] = []
    for page in range(1, max_search_pages + 1):
        data = fetch_search_with_products(
            api_key,
            keyword,
            amazon_domain,
            number_of_results,
            include_products_count,
            associate_tag,
            extra_params,
            page=page,
        )
        batch = extract_rows_from_search_response(
            keyword,
            data,
            associate_tag=associate_tag,
            delivery_cutoff=delivery_cutoff,
            min_rating=min_rating,
            prime_only=prime_only,
            default_year=default_year,
        )
        acc.extend(batch)
        merged = merge_to_top(acc, 9999)
        if len(merged) >= max(per_keyword_limit * 3, 48):
            break
        results = data.get("search_results") or []
        if not results:
            break
    return acc


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


def row_to_product_dict(r: Row) -> dict[str, Any]:
    return {
        "keyword": r.keyword,
        "title": r.title,
        "asin": r.asin,
        "price": r.price,
        "priceValue": r.price_value,
        "rating": r.rating,
        "is_prime": r.is_prime,
        "image": r.image,
        "link": canonical_dp_url(r.asin),
        "earliest_delivery": r.delivery_min.isoformat() if r.delivery_min else None,
    }


def pad_category_rows(
    primary: list[Row],
    limit: int,
    global_pool: list[Row],
    keyword_label: str,
    associate_tag: str | None,
) -> list[Row]:
    """Lấp ô trống: thêm SKU từ pool toàn campaign (Mother's Day), giữ đúng limit."""
    seen = {r.asin for r in primary}
    out: list[Row] = list(primary)
    for r in global_pool:
        if len(out) >= limit:
            break
        if r.asin in seen:
            continue
        seen.add(r.asin)
        out.append(
            Row(
                keyword=keyword_label,
                title=r.title,
                asin=r.asin,
                price=r.price,
                price_value=r.price_value,
                link=canonical_dp_url(r.asin),
                short_url=short_product_url(r.asin, associate_tag),
                image=r.image,
                rating=r.rating,
                is_prime=r.is_prime,
                delivery_min=r.delivery_min,
            )
        )
    return out[:limit]


def write_products_catalog(
    path: Path,
    *,
    category_rows: list[tuple[str, str, list[Row]]],
    meta: dict[str, Any],
) -> None:
    """category_rows: (slug, search_query, rows) per từ khóa."""
    path.parent.mkdir(parents=True, exist_ok=True)
    categories_out: list[dict[str, Any]] = []
    flat: list[dict[str, Any]] = []
    seen_asin: set[str] = set()

    for slug, search_query, rows in category_rows:
        dicts = [row_to_product_dict(r) for r in rows]
        categories_out.append(
            {
                "slug": slug,
                "search_query": search_query,
                "product_count": len(dicts),
                "products": dicts,
            }
        )
        for d in dicts:
            a = d["asin"]
            if a not in seen_asin:
                seen_asin.add(a)
                flat.append(d)

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "meta": meta,
        "categories": categories_out,
        "products": flat,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    _ensure_utf8_stdio()
    ap = argparse.ArgumentParser(description="Rainforest Amazon search + landing catalog.")
    ap.add_argument(
        "--delivery-cutoff",
        default="2026-05-10",
        help="Chỉ giữ SKU có ngày giao sớm nhất on/before ngày này (YYYY-MM-DD). Mặc định: 2026-05-10.",
    )
    ap.add_argument("--min-rating", type=float, default=4.0, help="Rating tối thiểu (>=). Mặc định 4.0.")
    ap.add_argument(
        "--prime-only",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Chỉ lấy sản phẩm Prime (mặc định: có). Dùng --no-prime-only để tắt.",
    )
    ap.add_argument("--amazon-domain", default="amazon.com")
    ap.add_argument("--number-of-results", type=int, default=48)
    ap.add_argument(
        "--include-products-count",
        type=int,
        default=20,
        help="Số kết quả search kèm chi tiết product / từ khóa (credit thêm). Nên >= per-keyword-limit.",
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
        "--per-keyword-limit",
        type=int,
        default=16,
        help="Số sản phẩm tối đa mỗi từ khóa (sau dedupe ASIN; thiếu sẽ lấp từ pool campaign).",
    )
    ap.add_argument(
        "--max-search-pages",
        type=int,
        default=5,
        help="Rainforest search: lặp tham số page=1..N (mỗi trang có include_products_count). Mặc định 5.",
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

    delivery_cutoff = date.fromisoformat(args.delivery_cutoff)
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
    category_raw: list[tuple[str, str, list[Row]]] = []
    mega_for_pool: list[Row] = []

    print(
        f"Lọc: in_stock, Prime={'Y' if args.prime_only else 'N'}, rating>={args.min_rating}, "
        f"earliest_delivery <= {delivery_cutoff.isoformat()}. "
        f"{args.per_keyword_limit}/từ khóa (lấp từ pool nếu thiếu). "
        f"Rainforest pages=1..{args.max_search_pages}, include_products_count={args.include_products_count}.\n",
        file=sys.stderr,
    )

    for kw in keywords:
        slug = keyword_slug(kw)
        try:
            rows = process_keyword(
                kw,
                api_key=api_key,
                amazon_domain=args.amazon_domain,
                associate_tag=args.associate_tag or None,
                delivery_cutoff=delivery_cutoff,
                min_rating=args.min_rating,
                prime_only=args.prime_only,
                number_of_results=args.number_of_results,
                include_products_count=args.include_products_count,
                default_year=args.default_year,
                extra_params=extra_params,
                max_search_pages=args.max_search_pages,
                per_keyword_limit=args.per_keyword_limit,
            )
        except requests.HTTPError as e:
            print(f"[{kw}] HTTP lỗi: {_redact_api_key_in_text(str(e))}", file=sys.stderr)
            if e.response is not None:
                print(e.response.text[:500], file=sys.stderr)
            category_raw.append((slug, kw, []))
            continue
        except requests.RequestException as e:
            print(f"[{kw}] Lỗi mạng: {e}", file=sys.stderr)
            category_raw.append((slug, kw, []))
            continue
        merged_kw = merge_to_top(rows, 9999)
        category_raw.append((slug, kw, merged_kw))
        mega_for_pool.extend(merged_kw)
        print(
            f"[{kw}] {len(merged_kw)} SKU sau lọc (trước cắt {args.per_keyword_limit} + lấp).",
            file=sys.stderr,
        )

    pool_sorted = merge_to_top(mega_for_pool, 9999)
    category_rows: list[tuple[str, str, list[Row]]] = []
    all_rows: list[Row] = []
    tag = args.associate_tag or None
    for slug, kw, rows in category_raw:
        top_kw = merge_to_top(rows, args.per_keyword_limit)
        padded = pad_category_rows(top_kw, args.per_keyword_limit, pool_sorted, kw, tag)
        category_rows.append((slug, kw, padded))
        all_rows.extend(padded)

    total_products = sum(len(t[2]) for t in category_rows)
    if total_products == 0:
        print(
            "Không lấy được SKU nào — không ghi đè products.json (giữ bản cũ). "
            "Kiểm tra RAINFOREST_API_KEY trong .env.local, credit (402), và bộ lọc.",
            file=sys.stderr,
        )
        return 2

    meta = {
        "keywords": keywords,
        "per_keyword_limit": args.per_keyword_limit,
        "min_rating": args.min_rating,
        "prime_only": args.prime_only,
        "delivery_cutoff": delivery_cutoff.isoformat(),
        "delivery_rule": "earliest_delivery <= delivery_cutoff (on or before)",
        "max_search_pages": args.max_search_pages,
        "canonical_associate_tag": CANONICAL_ASSOCIATE_TAG,
    }
    write_products_catalog(products_path, category_rows=category_rows, meta=meta)
    flat_count = len({r.asin for r in all_rows})
    print(
        f"\nĐã ghi {len(category_rows)} danh mục, {sum(len(t[2]) for t in category_rows)} SKU tổng (theo từ khóa), "
        f"{flat_count} SKU unique trong products[] → {products_path}",
        file=sys.stderr,
    )

    headers = ["Category", "Title", "ASIN", "Price", "Short URL", "Rating", "Prime", "Delivery"]
    table: list[list[str]] = []
    for slug, kw, rows in category_rows:
        for r in rows:
            table.append(
                [
                    slug,
                    (r.title[:50] + "...") if len(r.title) > 52 else r.title,
                    r.asin,
                    r.price,
                    r.short_url,
                    f"{r.rating:.1f}",
                    "Y" if r.is_prime else "",
                    r.delivery_min.isoformat() if r.delivery_min else "",
                ]
            )
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
        print(f"Đã ghi {len(payload)} hàng (per-keyword top) -> {args.json_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
health_crawl.py — 다시봄 '건강돋보기' 크롤러 + Claude 시니어 설명 재작성기

사용법:
  pip install requests beautifulsoup4 anthropic
  ANTHROPIC_API_KEY=sk-ant-... python health_crawl.py

출력: health_data.json  (health-detail.html이 로드하는 데이터)

[설정 방법]
  1. SITE_CONFIG 딕셔너리에서 타겟 사이트 URL과 CSS 셀렉터를 맞춤 설정하세요.
  2. CATEGORY_KEYWORDS로 카테고리별 검색 키워드를 수정하세요.
  3. PRODUCTS_PER_CATEGORY 로 카테고리당 베스트 노출 개수를 조절하세요.
"""

import os
import json
import time
import hashlib
import logging
import random
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup
import anthropic

# ─────────────────────────────────────────────
# 전역 설정
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

PRODUCTS_PER_CATEGORY = 3          # 카테고리당 베스트 노출 수
REQUEST_DELAY_SEC     = 1.5        # 요청 간 딜레이 (서버 부하 방지 — robots.txt 준수)
OUTPUT_FILE           = "health_data.json"
MAX_RETRIES           = 3          # 네트워크 실패 시 최대 재시도 횟수
RETRY_BACKOFF_BASE    = 2.0        # 지수 백오프 기저 (초): 2, 4, 8초
RATE_LIMIT_SLEEP_SEC  = 30         # 429 응답 시 대기 시간(초)

# 카테고리 정의: key=내부키, label=표시명, icon=이모지, keywords=검색어 목록
CATEGORIES = {
    "눈":  {"label": "눈 건강",  "icon": "👁️",  "keywords": ["루테인", "아스타잔틴", "눈 건강", "블루베리"]},
    "간":  {"label": "간 건강",  "icon": "🫀",  "keywords": ["밀크시슬", "간 건강", "실리마린", "헛개나무"]},
    "혈행": {"label": "혈행 개선", "icon": "❤️",  "keywords": ["오메가3", "EPA", "DHA", "혈행", "코엔자임Q10"]},
    "관절": {"label": "관절 건강", "icon": "🦴",  "keywords": ["글루코사민", "콘드로이틴", "관절", "칼슘"]},
    "면역": {"label": "면역 강화", "icon": "🛡️",  "keywords": ["홍삼", "프로바이오틱스", "비타민C", "아연", "면역"]},
}

# ─────────────────────────────────────────────
# [필수 수정] 타겟 사이트 설정
#
# 아래 값을 실제 크롤링할 도매 사이트에 맞게 수정하세요.
# 셀렉터는 브라우저 개발자 도구(F12) → 요소 검사로 확인하세요.
# ─────────────────────────────────────────────
SITE_CONFIG = {
    # 상품 목록 URL 패턴 ({}에 검색 키워드가 들어갑니다)
    "search_url": "https://example-wholesale.co.kr/search?q={}",

    # 목록 페이지 셀렉터
    "product_list_selector": "ul.prd-list li.item",   # 상품 하나를 감싸는 li/div
    "name_selector":         ".prd-name",              # 상품명
    "price_selector":        ".sale-price",            # 판매가 (숫자만 추출)
    "original_price_selector": ".origin-price",       # 정가 (없으면 None)
    "image_selector":        "img.prd-img",            # 대표 이미지 (src 또는 data-src)
    "detail_link_selector":  "a.prd-link",             # 상세페이지 링크 (href)

    # 상세 페이지 셀렉터
    "detail_desc_selector":  "div.prd-detail",         # 상품 상세 설명 텍스트 영역
    "detail_ingredient_selector": "table.ingredient-table",  # 성분 테이블 (없으면 None)

    # 공통
    "base_url": "https://example-wholesale.co.kr",
    "headers": {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9",
    },
}

# ─────────────────────────────────────────────
# HTTP 유틸리티
# ─────────────────────────────────────────────
_session = requests.Session()
_session.headers.update(SITE_CONFIG["headers"])


def fetch(url: str) -> Optional[BeautifulSoup]:
    """URL을 가져와 BeautifulSoup 객체를 반환. 실패 시 None.

    재시도 전략:
      - 네트워크 오류·5xx: 지수 백오프로 MAX_RETRIES 회 재시도
      - 429 (Too Many Requests): RATE_LIMIT_SLEEP_SEC 대기 후 1회 재시도
      - 404/410: 즉시 None 반환 (재시도 없음)
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            time.sleep(REQUEST_DELAY_SEC + random.uniform(0, 0.5))  # 약간의 지터 추가
            resp = _session.get(url, timeout=15)

            # 429 Rate Limit
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", RATE_LIMIT_SLEEP_SEC))
                log.warning("429 Rate Limit [%s] — %d초 대기 후 재시도", url, retry_after)
                time.sleep(retry_after)
                continue

            # 404 / 410: 리소스가 없으므로 재시도 무의미
            if resp.status_code in (404, 410):
                log.warning("리소스 없음 [%d] %s", resp.status_code, url)
                return None

            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            return BeautifulSoup(resp.text, "html.parser")

        except requests.exceptions.Timeout:
            log.warning("타임아웃 (시도 %d/%d) [%s]", attempt + 1, MAX_RETRIES, url)
        except requests.exceptions.ConnectionError as e:
            log.warning("연결 오류 (시도 %d/%d) [%s]: %s", attempt + 1, MAX_RETRIES, url, e)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            if 400 <= status < 500:
                log.warning("클라이언트 오류 [%d] %s — 재시도 안 함", status, url)
                return None
            log.warning("서버 오류 [%d] (시도 %d/%d) [%s]", status, attempt + 1, MAX_RETRIES, url)
        except requests.RequestException as e:
            log.warning("요청 오류 (시도 %d/%d) [%s]: %s", attempt + 1, MAX_RETRIES, url, e)

        if attempt < MAX_RETRIES:
            sleep_time = RETRY_BACKOFF_BASE ** (attempt + 1)
            log.info("  %d초 후 재시도...", sleep_time)
            time.sleep(sleep_time)

    log.error("fetch 최종 실패 [%s]", url)
    return None


def extract_price(text: str) -> int:
    """'29,800원' → 29800"""
    import re
    nums = re.sub(r"[^\d]", "", text)
    return int(nums) if nums else 0


def extract_image(tag, base_url: str) -> str:
    """img 태그에서 src 또는 data-src를 추출해 절대 경로로 변환."""
    if not tag:
        return ""
    src = tag.get("data-src") or tag.get("src") or ""
    if src.startswith("//"):
        src = "https:" + src
    elif src.startswith("/"):
        src = base_url.rstrip("/") + src
    return src


# ─────────────────────────────────────────────
# 크롤링 로직
# ─────────────────────────────────────────────
def _check_selectors(soup: BeautifulSoup) -> bool:
    """SITE_CONFIG 셀렉터가 현재 페이지 구조와 일치하는지 사전 점검."""
    selector = SITE_CONFIG["product_list_selector"]
    items = soup.select(selector)
    if not items:
        log.warning(
            "셀렉터 '%s' 로 매칭되는 요소가 없습니다. "
            "사이트 구조가 변경되었을 수 있습니다 — SITE_CONFIG를 확인하세요.",
            selector,
        )
        return False
    return True


def crawl_products_for_keyword(keyword: str) -> list[dict]:
    """키워드로 목록 페이지를 크롤링해 상품 기본 정보 목록을 반환."""
    from urllib.parse import quote
    url = SITE_CONFIG["search_url"].format(quote(keyword))
    log.info("검색: %s → %s", keyword, url)
    soup = fetch(url)
    if not soup:
        return []

    # 사이트 구조 변경 감지
    if not _check_selectors(soup):
        return []

    items = soup.select(SITE_CONFIG["product_list_selector"])
    products = []
    for item in items:
        try:
            name_tag  = item.select_one(SITE_CONFIG["name_selector"])
            price_tag = item.select_one(SITE_CONFIG["price_selector"])
            orig_tag  = item.select_one(SITE_CONFIG.get("original_price_selector", ""))
            img_tag   = item.select_one(SITE_CONFIG["image_selector"])
            link_tag  = item.select_one(SITE_CONFIG["detail_link_selector"])

            if not name_tag or not price_tag:
                log.debug("필수 필드 누락 (name=%s, price=%s) — 상품 스킵", name_tag, price_tag)
                continue

            name  = name_tag.get_text(strip=True)
            price = extract_price(price_tag.get_text())

            # 최소 유효성 검증
            if not name or price <= 0:
                log.debug("유효하지 않은 상품 데이터 (name='%s', price=%d) — 스킵", name, price)
                continue

            href = link_tag.get("href", "") if link_tag else ""
            if href and not href.startswith("http"):
                href = SITE_CONFIG["base_url"].rstrip("/") + href

            products.append({
                "id":             hashlib.md5(href.encode()).hexdigest()[:12],
                "name":           name,
                "price":          price,
                "original_price": extract_price(orig_tag.get_text()) if orig_tag else 0,
                "image":          extract_image(img_tag, SITE_CONFIG["base_url"]),
                "source_url":     href,
                "description_original": "",   # 상세 크롤링에서 채움
                "description_senior":   "",   # Claude가 채움
                "ingredients":    [],
            })
        except Exception as e:
            log.warning("상품 파싱 오류 (item=%s): %s", str(item)[:80], e)
            continue

    log.info("  → %d개 상품 파싱 완료", len(products))
    return products


def crawl_product_detail(product: dict) -> dict:
    """상세 페이지에서 설명 텍스트와 성분 정보를 추가로 수집."""
    if not product.get("source_url"):
        return product

    soup = fetch(product["source_url"])
    if not soup:
        return product

    desc_tag = soup.select_one(SITE_CONFIG["detail_desc_selector"])
    if desc_tag:
        # 이미지 태그 제거 후 텍스트 추출 (설명 텍스트만)
        for img in desc_tag.find_all("img"):
            img.decompose()
        product["description_original"] = desc_tag.get_text(separator="\n", strip=True)[:1500]

    ingr_tag = soup.select_one(SITE_CONFIG.get("detail_ingredient_selector", ""))
    if ingr_tag:
        product["ingredients"] = [
            td.get_text(strip=True)
            for td in ingr_tag.find_all("td")
            if td.get_text(strip=True)
        ][:10]

    return product


# ─────────────────────────────────────────────
# Claude API — 시니어 맞춤 설명 재작성
# ─────────────────────────────────────────────
_claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

REWRITE_SYSTEM = """
당신은 60~80대 시니어를 위한 건강식품 설명 전문가입니다.
아래 지침을 반드시 지키세요:
- 한 문장은 15단어 이하로 짧게 씁니다.
- 어려운 의학·화학 용어는 쉬운 말로 풀어 씁니다 (예: "루테인" → "눈의 피로를 줄여주는 성분").
- 효능을 실생활 언어로 표현합니다 (예: "항산화" → "몸속 녹이 스는 걸 막아줍니다").
- 복용 방법과 주의 사항을 명확히 한 문단으로 정리합니다.
- 전체 분량은 200자 이내입니다.
- 과대 광고 표현("최고", "기적", "완치") 은 절대 쓰지 않습니다.
출력 형식: JSON {"summary": "한 줄 요약(50자 이내)", "how_it_helps": "효능 설명(3줄)", "how_to_take": "복용법(1줄)", "caution": "주의(1줄)"}
""".strip()


def rewrite_for_senior(product: dict) -> dict:
    """Claude API로 상품 설명을 시니어 맞춤형으로 재작성."""
    original = product.get("description_original", "").strip()
    if not original:
        log.info("  설명 없음, 재작성 스킵: %s", product["name"])
        return product

    prompt = f"""상품명: {product['name']}
원본 설명:
{original[:800]}

위 내용을 시니어 맞춤형 쉬운 설명으로 재작성해주세요."""

    try:
        msg = _claude.messages.create(
            model="claude-haiku-4-5-20251001",   # 빠르고 저렴한 모델 사용
            max_tokens=512,
            system=REWRITE_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # JSON 블록 추출 (마크다운 코드블록 대응)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        product["description_senior"] = json.loads(raw.strip())
        log.info("  ✓ 재작성 완료: %s", product["name"])
    except Exception as e:
        log.warning("  재작성 실패 [%s]: %s", product["name"], e)
        # 실패 시 원본을 요약해서 넣기
        product["description_senior"] = {
            "summary":      product["name"],
            "how_it_helps": original[:100],
            "how_to_take":  "포장 지시에 따라 복용하세요.",
            "caution":      "과잉 섭취를 삼가세요.",
        }
    return product


# ─────────────────────────────────────────────
# 카테고리별 베스트 선정
# ─────────────────────────────────────────────
def pick_best(products: list[dict], n: int) -> list[dict]:
    """
    할인율 기준으로 상위 n개 선정.
    (할인율 = (정가 - 판매가) / 정가)
    정가 정보가 없으면 가격 오름차순.
    """
    def score(p):
        orig  = p.get("original_price", 0) or p.get("price", 1)
        price = p.get("price", 0) or orig
        return (orig - price) / orig if orig > 0 else 0

    seen_names = set()
    unique = []
    for p in sorted(products, key=score, reverse=True):
        if p["name"] not in seen_names:
            seen_names.add(p["name"])
            unique.append(p)
        if len(unique) >= n:
            break
    return unique


# ─────────────────────────────────────────────
# 메인 실행
# ─────────────────────────────────────────────
def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise EnvironmentError(
            "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.\n"
            "  export ANTHROPIC_API_KEY=sk-ant-..."
        )

    result = {
        "generated_at": datetime.now().isoformat(),
        "categories": {}
    }

    for cat_key, cat_info in CATEGORIES.items():
        log.info("━━ 카테고리: %s ━━", cat_info["label"])
        raw_products: list[dict] = []

        # 1. 키워드별 크롤링
        for kw in cat_info["keywords"]:
            items = crawl_products_for_keyword(kw)
            log.info("  '%s' → %d개 수집", kw, len(items))
            raw_products.extend(items)

        # 2. 베스트 N개 선정
        best = pick_best(raw_products, PRODUCTS_PER_CATEGORY)
        log.info("  베스트 %d개 선정", len(best))

        # 3. 상세 크롤링 + Claude 재작성
        enriched = []
        for p in best:
            p = crawl_product_detail(p)
            p = rewrite_for_senior(p)
            p["category"] = cat_key
            p["crawled_at"] = datetime.now().date().isoformat()
            enriched.append(p)

        result["categories"][cat_key] = {
            "label":    cat_info["label"],
            "icon":     cat_info["icon"],
            "products": enriched,
        }

    # 4. JSON 저장
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    log.info("━━ 완료! 저장: %s ━━", OUTPUT_FILE)


if __name__ == "__main__":
    main()

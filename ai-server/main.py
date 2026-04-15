import sys

# Fast platform bypass to avoid slow WMI queries in Python 3.13/Windows 11
if sys.platform == "win32":
    import platform

    platform.system = lambda: "Windows"

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import json
import re
import unicodedata
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Marketplace Gemini Chatbot")

# Cho phép Frontend Angular gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:3000",
        "https://frontend-bb25.onrender.com",
        "https://nestjs-zvmg.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Cấu hình Gemini
NESTJS_API_URL = "https://nestjs-zvmg.onrender.com/api"


class ChatMessage(BaseModel):
    message: str
    token: str = None
    accessToken: str = None  # Hỗ trợ cả 2 tên biến từ frontend
    history: list = []


# --- TOOL FUNCTIONS FOR NESTJS ---

def _normalize_text(value: str) -> str:
    if not value or not isinstance(value, str):
        return ""
    s = value.strip().lower()
    # Vietnamese special letter: normalize đ/Đ -> d/D so "điện thoại" matches "dien thoai"
    s = s.replace("đ", "d").replace("Đ", "D")
    s = "".join(
        ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn"
    )
    return " ".join(s.split())

def _extract_search_intent_keyword(text: str) -> dict:
    """Map user text to a search strategy backed by DB inventory."""
    t = _normalize_text(text)
    if not t:
        return {"mode": "text", "query": ""}
    # Category-like intents
    if re.search(r"\b(dien thoai|smartphone|phone)\b", t):
        return {
            "mode": "any",
            "keywords": ["iphone", "samsung", "xiaomi", "oppo", "vivo", "realme"],
            "label": "điện thoại",
        }
    if re.search(r"\b(laptop|notebook|macbook)\b", t):
        return {
            "mode": "any",
            "keywords": ["laptop", "macbook", "dell", "asus", "hp", "lenovo", "acer"],
            "label": "laptop",
        }
    if re.search(r"\b(tai nghe|earphone|headphone|airpods)\b", t):
        return {
            "mode": "any",
            "keywords": ["tai nghe", "airpods", "headphone", "earphone"],
            "label": "tai nghe",
        }
    if re.search(r"\b(ao|quan|giay)\b", t):
        # Keep the clothing keyword itself; backend search will match product names.
        return {"mode": "text", "query": t}
    # Brand -> category mapping (treat as phone)
    if re.search(r"\b(iphone|samsung|xiaomi|oppo|vivo|realme)\b", t):
        return {"mode": "text", "query": t}
    return {"mode": "text", "query": t}


def search_products_from_inventory(query: str):
    """Fallback search when API is down - search locally from inventory."""
    all_data = list_inventory()
    if not all_data or not isinstance(all_data, list):
        return []
    if not query:
        return all_data[:12]
    category_keywords = {
        "điện thoại": [
            "iphone",
            "samsung",
            "xiaomi",
            "oppo",
            "vivo",
            "realme",
            "huawei",
            "google pixel",
            "smartphone",
            "mobile",
            "phone",
            "điện thoại thông minh",
            "android",
            "ios",
            "flagship",
            "điện thoại gaming",
            "điện thoại giá rẻ",
        ],
        "phụ kiện điện thoại": [
            "ốp lưng",
            "case",
            "cường lực",
            "screen protector",
            "sạc",
            "charger",
            "củ sạc",
            "fast charge",
            "sạc nhanh",
            "tai nghe",
            "earphone",
            "airpods",
            "earbuds",
            "cáp",
            "cable",
            "lightning",
            "type c",
            "pin dự phòng",
            "power bank",
            "dock sạc",
            "giá đỡ điện thoại",
        ],
        "laptop": [
            "laptop",
            "macbook",
            "dell",
            "hp",
            "asus",
            "acer",
            "lenovo",
            "msi",
            "gaming laptop",
            "ultrabook",
            "notebook",
            "máy tính xách tay",
            "laptop văn phòng",
            "laptop gaming",
            "laptop sinh viên",
        ],
        "máy tính": [
            "pc",
            "desktop",
            "computer",
            "máy tính bàn",
            "workstation",
            "all in one",
            "aio",
            "mini pc",
        ],
        "linh kiện máy tính": [
            "cpu",
            "gpu",
            "ram",
            "ssd",
            "hdd",
            "mainboard",
            "bo mạch",
            "card màn hình",
            "vga",
            "psu",
            "nguồn máy tính",
            "nvidia",
            "amd",
            "intel",
            "tản nhiệt",
            "cooler",
        ],
        "điện tử": [
            "tv",
            "tivi",
            "smart tv",
            "android tv",
            "loa",
            "speaker",
            "bluetooth speaker",
            "âm thanh",
            "sound system",
            "soundbar",
            "tai nghe",
            "headphone",
            "earbuds",
            "camera",
            "máy ảnh",
            "dslr",
            "mirrorless",
            "webcam",
        ],
        "đồ gia dụng": [
            "appliance",
            "máy giặt",
            "washing machine",
            "tủ lạnh",
            "fridge",
            "refrigerator",
            "lò vi sóng",
            "microwave",
            "nồi cơm điện",
            "rice cooker",
            "máy lạnh",
            "air conditioner",
            "điều hòa",
            "quạt",
            "fan",
            "máy sấy",
            "máy hút bụi",
            "robot hút bụi",
            "máy lọc không khí",
            "air purifier",
        ],
        "thời trang": [
            "clothing",
            "fashion",
            "quần áo",
            "outfit",
            "style",
            "đồ thể thao",
            "sportswear",
            "streetwear",
            "local brand",
            "unisex",
            "basic",
            "minimal",
        ],
        "áo": [
            "shirt",
            "t-shirt",
            "tee",
            "áo thun",
            "áo sơ mi",
            "hoodie",
            "sweater",
            "jacket",
            "áo khoác",
            "tanktop",
        ],
        "quần": [
            "pants",
            "jeans",
            "denim",
            "shorts",
            "quần jean",
            "quần dài",
            "quần short",
            "jogger",
            "cargo",
            "slacks",
        ],
        "giày dép": [
            "shoes",
            "sneaker",
            "running shoes",
            "nike",
            "adidas",
            "puma",
            "new balance",
            "giày thể thao",
            "dép",
            "sandal",
            "boot",
        ],
        "túi xách": [
            "bag",
            "handbag",
            "backpack",
            "balô",
            "tote",
            "wallet",
            "ví",
            "clutch",
            "crossbody",
        ],
        "mỹ phẩm": [
            "cosmetic",
            "skincare",
            "makeup",
            "son",
            "lipstick",
            "lip balm",
            "kem dưỡng",
            "moisturizer",
            "serum",
            "essence",
            "toner",
            "sữa rửa mặt",
            "cleanser",
            "kem chống nắng",
            "sunscreen",
            "spf",
            "foundation",
            "cushion",
            "makeup remover",
        ],
        "mẹ và bé": [
            "baby",
            "kids",
            "trẻ em",
            "newborn",
            "bỉm",
            "tã",
            "diaper",
            "sữa",
            "milk powder",
            "đồ chơi trẻ em",
            "toy",
            "xe đẩy",
            "stroller",
            "ghế ăn dặm",
        ],
        "thể thao": [
            "sport",
            "fitness",
            "gym",
            "yoga",
            "dụng cụ tập",
            "tạ",
            "dumbbell",
            "máy chạy bộ",
            "treadmill",
            "xe đạp tập",
            "exercise bike",
            "dây kháng lực",
            "resistance band",
        ],
        "xe cộ": [
            "xe máy",
            "motorbike",
            "ô tô",
            "car",
            "xe điện",
            "electric bike",
            "xe đạp",
            "phụ kiện xe",
            "helmet",
            "mũ bảo hiểm",
            "camera hành trình",
            "dashcam",
        ],
        "sách": [
            "book",
            "novel",
            "ebook",
            "truyện",
            "manga",
            "comic",
            "sách giáo khoa",
            "sách kỹ năng",
        ],
        "văn phòng phẩm": [
            "stationery",
            "bút",
            "pen",
            "vở",
            "notebook",
            "giấy",
            "printer",
            "máy in",
            "ink",
            "mực in",
        ],
        "thú cưng": [
            "pet",
            "dog",
            "cat",
            "thức ăn chó",
            "dog food",
            "cat food",
            "cát mèo",
            "lồng",
            "chuồng",
            "pet accessories",
            "toy pet",
        ],
        "thực phẩm": [
            "food",
            "snack",
            "đồ ăn",
            "bánh",
            "kẹo",
            "đồ uống",
            "beverage",
            "trà",
            "cà phê",
            "coffee",
            "tea",
            "healthy food",
            "eat clean",
            "protein",
        ],
        "apple": [
            "iphone",
            "ipad",
            "macbook",
            "imac",
            "apple watch",
            "airpods",
            "ios",
            "macos",
            "apple ecosystem",
        ],
        "gaming": [
            "game",
            "gaming",
            "console",
            "ps5",
            "playstation",
            "xbox",
            "nintendo switch",
            "gaming gear",
            "gaming mouse",
            "gaming keyboard",
        ],
        "nội thất": [
            "furniture",
            "sofa",
            "bàn",
            "ghế",
            "table",
            "chair",
            "giường",
            "bed",
            "tủ",
            "wardrobe",
            "kệ",
            "shelf",
        ],
        "du lịch": [
            "travel",
            "du lịch",
            "vali",
            "luggage",
            "suitcase",
            "balo du lịch",
            "travel backpack",
        ],
    }
    q_clean = _normalize_text(query)
    q_words = [w for w in q_clean.split() if len(w) >= 2]  # Skip short words
    matches = []

    # Check if any keyword from mapping matches query
    matched_group_keywords = set()
    for keyword, categories in category_keywords.items():
        if keyword in q_clean:
            matched_group_keywords.update(categories)

    for p in all_data:
        if not p or not isinstance(p, dict):
            continue

        p_name = _normalize_text(p.get("name") or "")
        p_cat = _normalize_text(p.get("category") or "")
        p_brand = _normalize_text(p.get("brand") or "")

        score = 0

        if matched_group_keywords:
            if p_cat in matched_group_keywords or p_brand in matched_group_keywords:
                score += 10

        for w in q_words:
            if w in p_name:
                score += 3
            elif w in p_cat:
                score += 2
            elif w in p_brand:
                score += 1

        if score > 0:
            matches.append((p, score))

    if matches:
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches[:12]]

    return []


def search_products(query: str):
    """Tìm kiếm sản phẩm thông minh theo tên, từ khóa hoặc danh mục."""
    try:
        print(f"Tool calling: search_products - {query}")
        # NestJS ProductController expects `limit` (not `pageSize`)
        params = "limit=12"
        q_clean = _normalize_text(query)
        q_words = [w for w in q_clean.split() if len(w) >= 2]
        primary_word = q_words[0] if q_words else ""

        # Xử lý các từ khóa chung chung
        generic_keywords = ["tất cả", "sản phẩm", "hàng", "có gì", "đồ", "mới"]
        if q_clean and q_clean not in generic_keywords:
            params += f"&search={query}"

        try:
            res = requests.get(f"{NESTJS_API_URL}/product?{params}", timeout=5)
            if res.status_code != 200:
                print(
                    f"API returned {res.status_code}. Falling back to inventory search."
                )
                return search_products_from_inventory(q_clean)
            data = res.json()
        except (requests.ConnectionError, requests.Timeout, ValueError) as e:
            print(f"API connection/parse error: {e}. Falling back to inventory search.")
            return search_products_from_inventory(q_clean)

        if data is None:
            return []
        items = data.get("data", data) if isinstance(data, dict) else data

        # Nếu search trực tiếp không ra kết quả, thử lấy inventory lọc thông minh
        if (not items or not isinstance(items, list) or len(items) == 0) and q_clean:
            print(
                f"Search direct failed for '{query}', trying intelligent inventory match..."
            )
            all_data = list_inventory()
            print(
                f"list_inventory returned: type={type(all_data)}, len={len(all_data) if isinstance(all_data, list) else 'N/A'}"
            )
            if all_data and isinstance(all_data, list):
                q_words = q_clean.split()
                strong_words = [w for w in q_words if len(w) >= 4]

                def score_product(p):
                    """Tính điểm match cho sản phẩm dựa trên tên, danh mục, thương hiệu"""
                    score = 0
                    p_name = _normalize_text(p.get("name") or "")
                    p_category = _normalize_text(p.get("category") or "")
                    p_brand = _normalize_text(p.get("brand") or "")

                    strong_matched = False
                    for word in q_words:
                        if word in p_name:
                            score += 3  # Tên sản phẩm ưu tiên cao nhất
                            if len(word) >= 4:
                                strong_matched = True
                        if word in p_category:
                            score += 2  # Danh mục thứ hai
                            if len(word) >= 4:
                                strong_matched = True
                        if word in p_brand:
                            score += 2  # Thương hiệu bằng danh mục
                            if len(word) >= 4:
                                strong_matched = True

                    # If the query contains any strong word (len>=4), require at least
                    # one strong-word match; otherwise we get too many category matches.
                    if strong_words and not strong_matched:
                        return 0
                    return score

                # Lọc sản phẩm có ít nhất 1 từ khóa match
                matched = [p for p in all_data if score_product(p) > 0]
                if matched:
                    # Sắp xếp theo điểm cao nhất
                    items = sorted(matched, key=score_product, reverse=True)
                else:
                    # Relax matching: if no strong-word results, allow category matches
                    # by dropping the strong-word constraint and re-scoring.
                    if strong_words:
                        strong_words = []
                        matched = [p for p in all_data if score_product(p) > 0]
                        if matched:
                            items = sorted(matched, key=score_product, reverse=True)
                            # continue to output mapping below
                        else:
                            matched = []

                    # Nếu không match từ nào, thử fuzzy match đơn giản
                    import difflib

                    for word in q_words:
                        candidates = [
                            p
                            for p in all_data
                            if p
                            and isinstance(p, dict)
                            and difflib.SequenceMatcher(
                                None, word, _normalize_text(p.get("name") or "")
                            ).ratio()
                            > 0.6
                        ]
                        if candidates:
                            items = candidates
                            break

        if isinstance(items, list) and len(items) > 0:
            # Reduce noise: prefer items whose *name* matches the primary keyword.
            if primary_word:
                name_matched = [
                    p
                    for p in items
                    if p
                    and isinstance(p, dict)
                    and primary_word in _normalize_text(p.get("name") or "")
                ]
                if name_matched:
                    items = name_matched
            return [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "price": p.get("price"),
                    "image": p.get("image"),
                    "rating": p.get("rating", 4.8),
                    "sold": p.get("sold", p.get("soldCount", 0)),
                    "description": (p.get("description") or "")[:100] + "...",
                }
                for p in items[:12]
                if p and isinstance(p, dict)
            ]
        return []
    except Exception as e:
        print(f"Search Error: {e}")
        return []


def get_product_details(product_id: int):
    """Lấy chi tiết sản phẩm, bao gồm các phân loại (màu sắc, kích thước, SKU) và thông số kỹ thuật."""
    try:
        print(f"Tool calling: get_product_details - ID {product_id}")
        res = requests.get(f"{NESTJS_API_URL}/product/{product_id}")
        if res.status_code != 200:
            return {"error": f"Không tìm thấy sản phẩm ID {product_id}"}
        p = res.json()
        return {
            "id": p.get("id"),
            "name": p.get("name"),
            "price": p.get("price"),
            "description": p.get("description"),
            "attributes": p.get(
                "attributes"
            ),  # [{name: 'Màu sắc', options: [...]}, ...]
            "variants": p.get(
                "variants"
            ),  # [{sku: '...', attributes: {...}, stock: ...}, ...]
            "category": p.get("category", {}).get("name"),
            "brand": p.get("brand", {}).get("name"),
            "stock": p.get("stock"),
        }
    except Exception as e:
        return {"error": str(e)}


def list_inventory():
    """Lấy danh sách TẤT CẢ sản phẩm đang có trong kho với đầy đủ thông tin. Giúp bạn tư vấn chính xác khi tìm kiếm chung chung."""
    try:
        print("Tool calling: list_inventory")
        try:
            # NestJS ProductController expects `limit` (not `pageSize`)
            res = requests.get(f"{NESTJS_API_URL}/product?limit=100", timeout=5)
            if res.status_code != 200:
                print(
                    f"API returned {res.status_code} for inventory. Returning empty list."
                )
                return []
            data = res.json()
        except (requests.ConnectionError, requests.Timeout, ValueError) as e:
            print(f"API error on inventory: {e}. Returning empty list.")
            return []

        if data is None:
            return []
        items = data.get("data", data) if isinstance(data, dict) else data
        if isinstance(items, list) and len(items) > 0:
            # Trả về full info để có thể dùng trực tiếp làm kết quả search
            result = []
            for p in items:
                if not p or not isinstance(p, dict):
                    continue
                category_obj = p.get("category")
                category_name = (
                    category_obj.get("name") if isinstance(category_obj, dict) else None
                )
                brand_obj = p.get("brand")
                brand_name = (
                    brand_obj.get("name") if isinstance(brand_obj, dict) else None
                )
                result.append(
                    {
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "category": category_name,
                        "brand": brand_name,
                        "price": p.get("price"),
                        "image": p.get("image"),
                        "rating": p.get("rating", 4.8),
                        "sold": p.get("soldCount", 0),
                        "description": (p.get("description") or "")[:100] + "...",
                    }
                )
            return result
        return []
    except Exception as e:
        print(f"Inventory Error: {e}")
        return []


def check_user_profile(token: str):
    """Kiểm tra hồ sơ người dùng hiện tại (phone, address) và địa chỉ giao hàng đã lưu."""
    try:
        print(f"Tool calling: check_user_profile")
        res = requests.get(
            f"{NESTJS_API_URL}/users/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        if res.status_code == 200:
            user = res.json()
            # Lấy địa chỉ từ UserAddress table
            addr_res = requests.get(
                f"{NESTJS_API_URL}/address",
                headers={"Authorization": f"Bearer {token}"},
            )
            addresses = addr_res.json() if addr_res.status_code == 200 else []
            default_addr = next(
                (a for a in addresses if a.get("isDefault")),
                addresses[0] if addresses else None,
            )
            shipping_address = None
            if default_addr:
                parts = [
                    default_addr.get("detail", ""),
                    default_addr.get("wardName", ""),
                    default_addr.get("provinceName", ""),
                ]
                shipping_address = ", ".join(p for p in parts if p)
            return {
                "address": shipping_address or user.get("address"),
                "phone": (
                    default_addr.get("phone") if default_addr else user.get("phone")
                ),
                "addressId": default_addr.get("id") if default_addr else None,
            }
        return {"error": "Lấy thông tin thất bại. Người dùng có thể chưa đăng nhập."}
    except Exception as e:
        return {"error": str(e)}


def update_user_profile(token: str, address: str, phone: str):
    """Cập nhật địa chỉ và số điện thoại cho người dùng."""
    try:
        print(f"Tool calling: update_user_profile - {address}, {phone}")
        res = requests.patch(
            f"{NESTJS_API_URL}/users/profile",
            json={"address": address, "phone": phone},
            headers={"Authorization": f"Bearer {token}"},
        )
        if res.status_code in [200, 201]:
            return {"success": True, "message": "Cập nhật thông tin thành công."}
        return {"error": "Cập nhật thất bại."}
    except Exception as e:
        return {"error": str(e)}


def search_product_by_name(name: str):
    """Tìm sản phẩm theo tên chính xác để đặt hàng."""
    try:
        print(f"Tool calling: search_product_by_name - {name}")
        # Clean name for search
        clean_name = name.strip().lower()

        # Get all products and find exact match
        all_data = list_inventory()
        if not all_data or not isinstance(all_data, list):
            return None

        for p in all_data:
            if not p or not isinstance(p, dict):
                continue
            p_name = (p.get("name") or "").lower()
            if clean_name in p_name or p_name in clean_name:
                return p

        return None
    except Exception as e:
        print(f"Search by name error: {e}")
        return None


def extract_product_name_from_text(text: str):
    if not text or not isinstance(text, str):
        return None
    cleaned = text.replace("\n", " ").strip()
    m = re.search(r"sản phẩm\s+(.+?)\s+có\s", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r"🛍️\s*([^\n]+?)\s+có\s", cleaned, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return None


def find_product_id_in_history(history: list):
    if not history or not isinstance(history, list):
        return None
    for h in reversed(history):
        if h.get("role") in ("model", "assistant"):
            content = h.get("content", "")
            if not content:
                continue
            m = re.search(r"product_id:(\d+)", content)
            if m:
                return int(m.group(1))
    return None


def find_product_name_in_history(history: list):
    if not history or not isinstance(history, list):
        return None
    for h in reversed(history):
        if h.get("role") in ("model", "assistant"):
            name = extract_product_name_from_text(h.get("content", ""))
            if name:
                return name
    for h in reversed(history):
        if h.get("role") == "user":
            content = h.get("content", "")
            if any(
                keyword in content.lower()
                for keyword in [
                    "đặt hàng",
                    "mua",
                    "sản phẩm",
                    "iphone",
                    "samsung",
                    "điện thoại",
                ]
            ):
                return content.strip()
    return None


def resolve_product_id_from_history(req):
    p_id = find_product_id_in_history(req.history)
    if p_id:
        return p_id
    product_name = find_product_name_in_history(req.history)
    if product_name:
        found = search_product_by_name(product_name)
        if found and isinstance(found, dict) and found.get("id"):
            return found.get("id")
    return None


def resolve_selected_variants_from_history(history: list):
    if not history or not isinstance(history, list):
        return {"color": None, "size": None, "payment": None}

    for h in reversed(history):
        if h.get("role") in ("model", "assistant"):
            content = h.get("content", "") or ""
            m = re.search(
                r"product_id:(\d+)(?:,color:([^,\)\n_]*))?(?:,size:([^,\)\n_]*))?(?:,payment:([^,\)\n_]*))?",
                content,
            )
            if m:
                return {
                    "color": (
                        m.group(2).strip()
                        if m.group(2) and m.group(2).strip()
                        else None
                    ),
                    "size": (
                        m.group(3).strip()
                        if m.group(3) and m.group(3).strip()
                        else None
                    ),
                    "payment": (
                        m.group(4).strip().upper()
                        if m.group(4) and m.group(4).strip()
                        else None
                    ),
                }
    return {"color": None, "size": None, "payment": None}


def place_order_for_user(
    token: str,
    product_id: int,
    quantity: int = 1,
    color: str = None,
    size: str = None,
    paymentMethod: str = "COD",
):
    """Tạo đơn hàng đặt mua sản phẩm. Tham số paymentMethod có thể là 'COD' hoặc 'VNPAY'."""
    try:
        actual_token = token or ""
        paymentMethod = paymentMethod.upper() if paymentMethod else "COD"
        if paymentMethod == "VISA":
            paymentMethod = "VNPAY"
        print(
            f"Tool calling: place_order_for_user - Product {product_id}, Payment {paymentMethod}, Color {color}, Size {size}"
        )

        # 0. Validate product exists trước khi đặt hàng
        product_details = get_product_details(product_id)
        if isinstance(product_details, dict) and "error" in product_details:
            return {
                "error": f"Sản phẩm ID {product_id} không tồn tại hoặc không khả dụng."
            }

        # 1. Lấy giỏ hàng hiện tại để kiểm tra duplicate
        try:
            cart_get_res = requests.get(
                f"{NESTJS_API_URL}/cart",
                headers={"Authorization": f"Bearer {actual_token}"},
            )
            if cart_get_res.status_code == 200:
                current_cart = cart_get_res.json()
                existing_items = current_cart.get("items", [])

                # Tìm và xóa item trùng (cùng product + variant)
                duplicate_removed = False
                for item in existing_items:
                    # Xử lý empty string/null giống backend
                    item_color = item.get("color")
                    item_size = item.get("size")
                    # Convert empty string to None for comparison
                    item_color = None if item_color == "" else item_color
                    item_size = None if item_size == "" else item_size
                    context_color = None if color == "" else color
                    context_size = None if size == "" else size

                    if (
                        item.get("productId") == product_id
                        and (
                            not context_size
                            or (item_size or "").lower() == context_size.lower()
                        )
                        and (
                            not context_color
                            or (item_color or "").lower() == context_color.lower()
                        )
                    ):
                        # Xóa item cũ để tránh duplicate
                        print(f"Removing duplicate item {item.get('id')} from cart")
                        delete_res = requests.delete(
                            f"{NESTJS_API_URL}/cart/items/{item.get('id')}",
                            headers={"Authorization": f"Bearer {actual_token}"},
                        )
                        if delete_res.status_code in [200, 204]:
                            duplicate_removed = True
                            print(
                                f"Successfully removed duplicate item {item.get('id')}"
                            )
                        else:
                            print(
                                f"Failed to remove duplicate item: {delete_res.status_code}"
                            )

                # Chờ một chút để đảm bảo xóa hoàn tất
                if duplicate_removed:
                    import time

                    time.sleep(0.5)
        except Exception as e:
            print(f"Warning: Could not check/clean cart: {e}")

        # 2. Thêm vào giỏ hàng
        cart_payload = {"productId": product_id, "quantity": quantity}
        if color:
            cart_payload["color"] = color
        if size:
            cart_payload["size"] = size

        cart_res = requests.post(
            f"{NESTJS_API_URL}/cart/items",
            json=cart_payload,
            headers={"Authorization": f"Bearer {actual_token}"},
        )
        if cart_res.status_code not in [200, 201]:
            print(f"Cart error body: {cart_res.text}")
            return {
                "error": f"Lỗi giỏ hàng (Status {cart_res.status_code}): {cart_res.text[:200]}"
            }

        # 3. Checkout
        cart_data = cart_res.json()
        items = cart_data.get("items", [])
        # Tìm item khớp product + variant
        new_item = next(
            (
                i
                for i in items
                if i.get("productId") == product_id
                and (not color or (i.get("color") or "").lower() == color.lower())
                and (not size or (i.get("size") or "").lower() == size.lower())
            ),
            None,
        )
        if not new_item:
            new_item = next(
                (i for i in items if i.get("productId") == product_id), None
            )

        checkout_payload = {"paymentMethod": paymentMethod}
        if new_item:
            checkout_payload["itemIds"] = [new_item["id"]]

        # Lấy addressId mặc định
        try:
            addr_res = requests.get(
                f"{NESTJS_API_URL}/address",
                headers={"Authorization": f"Bearer {actual_token}"},
            )
            if addr_res.status_code == 200:
                addresses = addr_res.json()
                default_addr = next(
                    (a for a in addresses if a.get("isDefault")),
                    addresses[0] if addresses else None,
                )
                if default_addr:
                    checkout_payload["addressId"] = default_addr["id"]
        except:
            pass

        res = requests.post(
            f"{NESTJS_API_URL}/order/checkout",
            json=checkout_payload,
            headers={"Authorization": f"Bearer {actual_token}"},
        )

        if res.status_code in [200, 201]:
            return {"success": True, "order": res.json()}
        print(f"Checkout error body: {res.text}")
        return {
            "error": f"Lỗi chốt đơn (Status {res.status_code})",
            "details": res.text[:200],
        }
    except Exception as e:
        return {"error": str(e)}


available_tools = {
    "search_products": search_products,
    "get_product_details": get_product_details,
    "list_inventory": list_inventory,
    "check_user_profile": check_user_profile,
    "update_user_profile": update_user_profile,
    "place_order_for_user": place_order_for_user,
}

SYSTEM_INSTRUCTION = """
Bạn là trợ lý AI bán hàng chuyên nghiệp của một sàn thương mại điện tử.

🎯 MỤC TIÊU:
- Hiểu nhu cầu người dùng
- Tư vấn sản phẩm phù hợp
- Hướng dẫn chọn biến thể (màu, size, dung lượng)
- Hỗ trợ đặt hàng nhanh chóng

---

🛡️ PHẠM VI HOẠT ĐỘNG (Marketplace-only)
- Em chỉ hỗ trợ các tác vụ gắn với website (dựa trên các tools được cung cấp):
  - Tìm sản phẩm / xem danh sách trong kho
  - Xem chi tiết sản phẩm (kèm options/attributes)
  - Hướng dẫn chọn variant (màu/size)
  - Lấy thông tin địa chỉ/SĐT từ profile và hỗ trợ cập nhật
  - Chốt đơn (COD hoặc VNPAY) sau khi user xác nhận đầy đủ
- Nếu câu hỏi “strange nhưng liên quan website” không thể xử lý theo đúng các tác vụ/flow trên (ví dụ: câu hỏi về đăng ký người bán, quản trị/admin, chính sách chung, pháp lý/hoàn tiền, tài khoản/bảo mật, hoặc bất kỳ nội dung nào không dẫn đến các tools/flow đặt hàng), em PHẢI từ chối và chuyển hướng về các lựa chọn trong phạm vi hỗ trợ.
- Khi từ chối, em không cố “best-effort” đoán ý để đặt hàng và không xuất các context tag đặt đơn.

💭 TƯ VẤN / GỢI Ý LỰA CHỌN (Advice detection)
- Nếu user có dấu hiệu cần được tư vấn chọn sản phẩm (ví dụ: “em nên mua gì”, “nên chọn loại nào”, “phù hợp với”, “giúp em chọn”, “có nên…”, “so sánh…”) thì:
  - Hỏi tối đa 2 câu làm rõ về nhu cầu (ngân sách/giá, mục đích/sử dụng, ràng buộc như size/dung lượng nếu có).
  - Sau khi có đủ thông tin, dùng tools để gợi ý 2-3 lựa chọn phù hợp kèm lý do ngắn gọn.
  - Tránh tự khẳng định nếu thiếu dữ liệu; luôn hướng user tới việc chọn variant/đặt hàng trong phạm vi website.

🧠 NGUYÊN TẮC HOẠT ĐỘNG:

1. PHÂN LOẠI Ý ĐỊNH (INTENT)
- "search": tìm sản phẩm
- "product_detail": hỏi chi tiết
- "order": muốn mua / đặt hàng
- "variant": chọn màu/size
- "confirm": xác nhận đặt hàng
- "other": chat bình thường

---

2. KHI NGƯỜI DÙNG TÌM KIẾM
- Nếu query chung chung (ví dụ: "điện thoại", "laptop"):
  → Dùng list_inventory để biết shop có gì
  → Gợi ý sản phẩm phổ biến + bán chạy
  
- Nếu query cụ thể (ví dụ: "iphone 15"):
  → Dùng search_products để tìm chính xác
  → Trả đúng sản phẩm liên quan
  
- Luôn:
  ✔ Gợi ý thêm sản phẩm tương tự
  ✔ Đưa ra nhận xét (bán chạy, giá tốt, đáng mua)
  ✔ Thêm emoji: 🔥✨🛒📦

---

3. KHI NGƯỜI DÙNG MUỐN MUA
LUÔN làm theo flow:

Bước 1: Dùng get_product_details để lấy chi tiết sản phẩm
Bước 2: Nếu có variant (attributes) → hỏi chọn màu/size
Bước 3: Hỏi phương thức thanh toán (COD hoặc VNPAY)
Bước 4: Dùng check_user_profile để lấy địa chỉ/SĐT
Bước 5: Xác nhận đơn hàng với đầy đủ thông tin
Bước 6: Khi user xác nhận "Có" → gọi place_order_for_user

---

4. KHI CHỌN VARIANT
- Hiển thị rõ:
  • Màu sắc: [danh sách màu]
  • Size / Dung lượng: [danh sách size]
  
- Nếu user chọn sai:
  → Báo lỗi + gợi ý lại các lựa chọn hợp lệ
  
- Format hiển thị:
  🛍️ Sản phẩm **[Tên]** có các lựa chọn:
  • Màu sắc: Đen, Trắng, Xanh
  • Dung lượng: 128GB, 256GB, 512GB
  
  Bạn muốn chọn loại nào?

---

5. KHI XÁC NHẬN ĐƠN
Luôn trả về dạng:

Lưu ý:
- Chỉ xuất context tag `_(product_id:...,color:...,size:...,payment:...)_` khi đã có đủ `product_id` và `payment`.
- Nếu sản phẩm không yêu cầu variant, `color/size` có thể để rỗng trong tag.

🛒 Xác nhận đặt đơn:
📦 Tên sản phẩm: [Tên] - [Màu] / [Size]
📍 Địa chỉ: [Địa chỉ giao hàng]
📞 SĐT: [Số điện thoại]
💳 Thanh toán: [COD/VNPAY]

⚠️ **Bạn xác nhận đặt đơn hàng này chứ?**
1️⃣ Có
2️⃣ Không

_(product_id:[ID],color:[màu],size:[size],payment:[COD/VNPAY])_

---

6. PHONG CÁCH TRẢ LỜI
- Ngôn ngữ: Tiếng Việt
- Tone: trẻ trung, thân thiện, nhiệt tình
- Có emoji: 🛒🔥✨📦💳🎉
- Không quá dài dòng
- Luôn có CTA (call to action)
- Xưng hô: "em" (bot), "bạn" (user)

---

7. GỢI Ý THÔNG MINH
Luôn thêm:
- Sản phẩm liên quan
- Lựa chọn thay thế
- Upsell (cao cấp hơn) nếu phù hợp
- Giá rẻ hơn nếu user hỏi "rẻ"
- Nhận xét về sản phẩm (bán chạy, đánh giá cao, hot trend)

---

8. QUICK REPLIES
Luôn đề xuất các lựa chọn nhanh:
- Tên màu sắc cụ thể
- Tên size cụ thể
- "COD" / "VNPAY"
- "Có" / "Không"
- "Xem thêm"
- "Sản phẩm tương tự"

---

9. RULE QUAN TRỌNG
❌ KHÔNG nói "không có" ngay lập tức trong phạm vi tìm kiếm/tư vấn sản phẩm.
✔ Nếu chưa tìm được kết quả phù hợp, hãy gợi ý lựa chọn gần giống hoặc hướng dẫn cách đặt câu hỏi để tìm đúng sản phẩm.

❌ KHÔNG trả lời trống
✔ Luôn có gợi ý tiếp theo

❌ KHÔNG bỏ qua bước nào trong flow đặt hàng
✔ Phải hỏi đầy đủ: variant → payment → confirm

❌ KHÔNG tự ý đặt hàng mà không xác nhận
✔ Phải có bước xác nhận cuối cùng

---

10. XỬ LÝ LỖI
- Nếu không tìm thấy sản phẩm:
  → "Dạ, hiện tại shop chưa có [tên]. Nhưng em có thể gợi ý cho bạn [sản phẩm tương tự]"
  
- Nếu user chọn variant không hợp lệ:
  → "❌ Lựa chọn không hợp lệ! Sản phẩm này chỉ có: [danh sách hợp lệ]"
  
- Nếu thiếu thông tin:
  → "Em cần thêm thông tin [địa chỉ/SĐT] để hoàn tất đơn hàng nhé!"

---

11. CONTEXT TRACKING
- Chỉ xuất context tag khi đang ở đúng bước của flow đặt hàng hợp lệ:
  - Khi đã đủ để tiến sang bước tiếp theo (ví dụ: đã có product_id; và nếu cần variant/thanh toán thì cũng phải đủ).
- KHÔNG xuất context tag trong trường hợp:
  - đang tư vấn/gợi ý trước khi user chọn rõ sản phẩm/variant/payment
  - hoặc khi em từ chối yêu cầu ngoài phạm vi
- Dùng context tag này để track trạng thái đơn hàng.

---

🎯 VÍ DỤ RESPONSE:

User: "tìm iphone"
AI: "🔥 iPhone đang rất hot nè! Em có mấy mẫu này cho bạn:
• **iPhone 15 Pro Max** - Flagship đỉnh cao
• **iPhone 14** - Giá tốt, bán chạy nhất
• **iPhone 13** - Phổ thông, đáng mua

Bạn muốn xem chi tiết mẫu nào? 😊"

User: "mua iphone 15"
AI: "🛍️ Sản phẩm **iPhone 15 Pro Max** có các lựa chọn:
• Màu sắc: Titan Tự Nhiên, Titan Xanh, Titan Trắng, Titan Đen
• Dung lượng: 256GB, 512GB, 1TB

Bạn muốn chọn loại nào? Và thanh toán bằng:
1️⃣ Tiền mặt (COD)
2️⃣ Chuyển khoản (VNPAY)

Ví dụ: *Titan Đen, 256GB, COD*
_(product_id:123)_"

---

QUAN TRỌNG:
- Luôn dùng tools (search_products, get_product_details, check_user_profile, place_order_for_user)
- Không tự bịa thông tin sản phẩm
- Phải có đầy đủ thông tin trước khi gọi place_order_for_user
"""


@app.post("/api/chat")
async def chat(req: ChatMessage):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "reply": "Chưa có API Key Gemini trong file .env. Bạn hãy kiểm tra lại nhé."
        }

    # Deterministic search fallback: if user is clearly searching (e.g. "iphone",
    # "tìm iphone"), answer using real product data to avoid hallucinations and
    # keep the experience working even when Gemini is rate-limited.
    try:
        msg_raw = (req.message or "").strip()
        msg_lower = msg_raw.lower()
        is_greeting = any(
            k in msg_lower
            for k in [
                "alo",
                "a lô",
                "hello",
                "hi",
                "hey",
                "chào",
                "chao",
                "xin chào",
                "xin chao",
                "bạn ơi",
                "ban oi",
            ]
        )
        is_questionish = any(
            k in msg_lower
            for k in [
                "?",
                "là ai",
                "la ai",
                "ai v",
                "ai vậy",
                "ai vay",
                "là gì",
                "la gi",
                "gì vậy",
                "gi vay",
                "who",
                "what",
                "mày là ai",
                "may la ai",
                "bạn là ai",
                "ban la ai",
            ]
        )
        is_search_intent = (
            msg_lower.startswith("tìm ")
            or msg_lower.startswith("tim ")
            or msg_lower.startswith("tìm kiếm")
            or msg_lower.startswith("tim kiem")
            or msg_lower.startswith("search ")
            or msg_lower.startswith("xem ")
            or msg_lower.startswith("mua ")
            or msg_lower.startswith("đặt ")
            or msg_lower.startswith("dat ")
            or msg_lower.startswith("t muốn tìm")
            or msg_lower.startswith("toi muon tim")
        )

        # If the message contains a clear product keyword/brand, treat it as search intent
        # even when the sentence is conversational ("t muốn điện thoại iphone", etc.).
        has_product_keyword = re.search(
            r"\b(iphone|samsung|xiaomi|oppo|vivo|realme|laptop|macbook|dell|asus|acer|lenovo|hp|tai\s*nghe|airpods|sac|charger|loa|tv|tivi|áo|ao|quần|quan|giày|giay)\b",
            msg_lower,
            flags=re.IGNORECASE,
        )
        if has_product_keyword:
            is_search_intent = True

        # Allow single/short keyword queries like "iphone", but avoid treating
        # general chat questions as search.
        allow_keyword_query = (
            (has_product_keyword or re.search(r"\d", msg_lower))
            and not is_questionish
            and not is_greeting
            and len(msg_raw) <= 30
            and len(msg_raw.split()) <= 5
        )

        # Do NOT treat greetings/general chat as product search.
        if is_greeting and not is_search_intent and not has_product_keyword:
            reply = (
                "Dạ em đây ạ. Em có thể giúp bạn **tìm sản phẩm** và **đặt hàng**.\n\n"
                "Bạn muốn tìm gì ạ? Ví dụ: **tìm iphone**, **tìm samsung**, **laptop dell**."
            )
            return {
                "reply": reply,
                "products": None,
                "history": req.history + [{"role": "model", "content": reply}],
            }

        if msg_raw and (is_search_intent or allow_keyword_query):
            q = (
                msg_lower.replace("tìm kiếm", "")
                .replace("tim kiem", "")
                .replace("tìm", "")
                .replace("tim", "")
                .strip()
            )
            q = q or msg_raw

            # Normalize user query to the core keyword(s) to avoid sending
            # full conversational text into the DB search.
            q_norm = q
            q_norm = re.sub(
                r"^(t\s*muốn|t\s*muon|toi\s*muon|mình\s*muốn|minh\s*muon|cho\s*tôi|cho\s*toi)\s+",
                "",
                q_norm,
                flags=re.IGNORECASE,
            )
            q_norm = re.sub(
                r"\b(điện\s*thoại|dien\s*thoai|sản\s*phẩm|san\s*pham|hàng|hang|loại|loai)\b",
                " ",
                q_norm,
                flags=re.IGNORECASE,
            )
            q_norm = " ".join(q_norm.split()).strip()
            q_norm = q_norm or q
            intent = _extract_search_intent_keyword(q_norm)
            if intent.get("mode") == "any":
                inv = list_inventory()
                kws = intent.get("keywords") or []
                label = intent.get("label") or q_norm
                if inv and kws:
                    matched = []
                    for p in inv:
                        if not p or not isinstance(p, dict):
                            continue
                        blob = " ".join(
                            [
                                _normalize_text(p.get("name") or ""),
                                _normalize_text(p.get("category") or ""),
                                _normalize_text(p.get("brand") or ""),
                            ]
                        )
                        if any(_normalize_text(k) in blob for k in kws):
                            matched.append(p)
                    # Prefer items where name matches a keyword, then sold desc
                    def _rank(pp):
                        name_norm = _normalize_text(pp.get("name") or "")
                        name_hit = 1 if any(_normalize_text(k) in name_norm for k in kws) else 0
                        sold = pp.get("sold") or 0
                        return (name_hit, sold)

                    matched.sort(key=_rank, reverse=True)
                    top = matched[:5]
                    if top:
                        lines = [f"🔥 Mình tìm thấy một vài sản phẩm thuộc nhóm **{label}** nè:"]
                        for p in top:
                            name = p.get("name") or "Sản phẩm"
                            price = p.get("price")
                            price_str = (
                                f"{price:,} VNĐ" if isinstance(price, (int, float)) else ""
                            )
                            p_id = p.get("id")
                            id_str = f" (Mã: P{p_id})" if p_id else ""
                            lines.append(
                                f"- **{name}**{id_str}"
                                + (f" — {price_str}" if price_str else "")
                            )
                        lines.append("")
                        lines.append("Bạn muốn xem chi tiết sản phẩm nào? (gửi **ID** hoặc tên sản phẩm)")
                        reply = "\n".join(lines)
                        return {
                            "reply": reply,
                            "products": top,
                            "history": req.history + [{"role": "model", "content": reply}],
                        }

                reply = (
                    f"Hiện tại mình chưa thấy sản phẩm thuộc nhóm **{label}** trong kho. "
                    "Bạn thử tìm theo hãng/model cụ thể nhé (ví dụ: **iphone**, **samsung s2**)."
                )
                return {
                    "reply": reply,
                    "products": None,
                    "history": req.history + [{"role": "model", "content": reply}],
                }

            q_norm = intent.get("query") or q_norm

            # If the normalized query is too short, ask for a clearer keyword.
            if len(q_norm) < 2:
                reply = "Bạn muốn tìm sản phẩm gì ạ? Bạn gõ giúp em 1-2 từ khoá rõ hơn nhé (ví dụ: **iphone**, **samsung**, **laptop**)."
                return {
                    "reply": reply,
                    "products": None,
                    "history": req.history + [{"role": "model", "content": reply}],
                }

            # If user sent a numeric id, treat as product detail request.
            if q_norm.isdigit():
                details = get_product_details(int(q_norm))
                if isinstance(details, dict) and details.get("error"):
                    reply = f"Không tìm thấy sản phẩm ID **{q_norm}**. Bạn thử ID khác hoặc gõ tên sản phẩm nhé."
                    return {
                        "reply": reply,
                        "products": None,
                        "history": req.history + [{"role": "model", "content": reply}],
                    }
                name = details.get("name") or f"ID {q}"
                price = details.get("price")
                price_str = (
                    f"{price:,} VNĐ" if isinstance(price, (int, float)) else ""
                )
                desc = (details.get("description") or "").strip()
                desc = desc[:250] + ("..." if len(desc) > 250 else "")
                reply = (
                    f"📦 **{name}**\n"
                    + (f"💰 Giá: {price_str}\n" if price_str else "")
                    + (f"📝 Mô tả: {desc}\n" if desc else "")
                    + "\nBạn muốn **mua** sản phẩm này hay xem sản phẩm khác?"
                )
                return {
                    "reply": reply,
                    "products": None,
                    "history": req.history + [{"role": "model", "content": reply}],
                }

            products = search_products(q_norm)
            if products:
                # Filter out items that don't match query words in the *product name*.
                # This avoids noisy category matches (e.g. "áo thun" pulling unrelated items).
                q_words = [w for w in _normalize_text(q_norm).split() if len(w) >= 2]
                if q_words:
                    filtered = []
                    for p in products:
                        if not p or not isinstance(p, dict):
                            continue
                        name_norm = _normalize_text(p.get("name") or "")
                        if any(w in name_norm for w in q_words):
                            filtered.append(p)
                    if filtered:
                        products = filtered

                # If user typed a product name and we have a clear exact match,
                # return product details from DB instead of a generic list.
                exact = next(
                    (
                        p
                        for p in products
                        if isinstance(p, dict)
                        and (p.get("name") or "").strip().lower() == q.strip().lower()
                    ),
                    None,
                )
                if exact and exact.get("id"):
                    details = get_product_details(int(exact["id"]))
                    if isinstance(details, dict) and not details.get("error"):
                        name = details.get("name") or exact.get("name") or "Sản phẩm"
                        price = details.get("price")
                        price_str = (
                            f"{price:,} VNĐ" if isinstance(price, (int, float)) else ""
                        )
                        desc = (details.get("description") or "").strip()
                        desc = desc[:250] + ("..." if len(desc) > 250 else "")
                        reply = (
                            f"📦 **{name}**\n"
                            + (f"💰 Giá: {price_str}\n" if price_str else "")
                            + (f"📝 Mô tả: {desc}\n" if desc else "")
                            + "\nBạn muốn **mua** sản phẩm này hay xem sản phẩm khác?"
                        )
                        return {
                            "reply": reply,
                            "products": None,
                            "history": req.history + [{"role": "model", "content": reply}],
                        }

                lines = [
                    f"🔥 Mình tìm thấy một vài sản phẩm phù hợp với **{q_norm}** nè:",
                ]
                for p in products[:5]:
                    name = p.get("name") or "Sản phẩm"
                    price = p.get("price")
                    price_str = f"{price:,} VNĐ" if isinstance(price, (int, float)) else ""
                    p_id = p.get("id")
                    id_str = f" (Mã: P{p_id})" if p_id else ""
                    lines.append(
                        f"- **{name}**{id_str}" + (f" — {price_str}" if price_str else "")
                    )
                lines.append("")
                lines.append("Bạn muốn xem chi tiết sản phẩm nào? (gửi **ID** hoặc tên sản phẩm)")
                reply = "\n".join(lines)
                return {
                    "reply": reply,
                    "products": products,
                    "history": req.history + [{"role": "model", "content": reply}],
                }

            # No direct match → ask user to refine keywords (avoid dumping whole inventory).
            reply = (
                f"Hiện tại mình chưa tìm thấy sản phẩm khớp **{q_norm}**. "
                "Bạn thử gõ từ khoá ngắn hơn (tên hãng / model) nhé, ví dụ: **iphone 15**, **samsung s2**, **laptop dell**."
            )
            return {
                "reply": reply,
                "products": None,
                "history": req.history + [{"role": "model", "content": reply}],
            }
    except Exception as _det_err:
        # If deterministic path fails, continue to Gemini path.
        pass

    # Avoid slow/blocking Windows cert store access during imports by forcing
    # a known CA bundle (requests' certifi location) before importing google SDK.
    os.environ.setdefault("SSL_CERT_FILE", requests.certs.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", requests.certs.where())

    import google.generativeai as genai

    genai.configure(api_key=api_key)

    # Chuyển đổi history sang format Gemini SDK (parts)
    gemini_history = []
    for m in req.history:
        # Frontend stores roles as "user" and "model". Map both "model" and
        # "assistant" to Gemini's "model" role for correct conversational context.
        role = "model" if m.get("role") in ("assistant", "model") else "user"
        content = m.get("content") or ""
        if content:
            gemini_history.append({"role": role, "parts": [{"text": content}]})

    try:
        # Thử lần lượt các model từ nhẹ đến nặng
        last_error = None
        response = None
        for model_name in [
            "gemini-3.0-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.5-pro-preview-tts",
            "gemini-2.5-flash-preview-tts",
            "gemini-2.5-flash-image",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview",
            "gemini-2.5-flash-lite-preview-tts",
            "gemini-2.5-flash-lite-preview-image",
            "gemini-2.5-flash-lite-preview-tts-image",
        ]:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    tools=[
                        search_products,
                        get_product_details,
                        list_inventory,
                        check_user_profile,
                        update_user_profile,
                        search_product_by_name,
                        place_order_for_user,
                    ],
                    system_instruction=SYSTEM_INSTRUCTION,
                )
                chat_session = model.start_chat(
                    history=gemini_history, enable_automatic_function_calling=True
                )
                response = chat_session.send_message(req.message)
                break
            except Exception as model_err:
                last_error = model_err
                err_text = str(model_err) or ""
                err_lower = err_text.lower()

                # If the API key is expired/invalid, do not try other models.
                # This avoids wasting requests/quota and gives a clearer signal.
                if (
                    "api_key_invalid" in err_text
                    or "api key expired" in err_lower
                    or "api key is invalid" in err_lower
                    or "invalid api key" in err_lower
                ):
                    reply = (
                        "Xin lỗi, hệ thống AI đang lỗi cấu hình Gemini "
                        "(API key đã hết hạn/không hợp lệ). "
                        "Bạn vui lòng kiểm tra `GEMINI_API_KEY` trong "
                        "`ai-server/.env` và khởi động lại server."
                    )
                    return {
                        "reply": reply,
                        "products": None,
                        "history": req.history + [{"role": "model", "content": reply}],
                    }

                print(
                    f"Model {model_name} failed: {str(model_err)[:80]}, trying next..."
                )
                continue

        if response is None:
            raise last_error

        # Xử lý trả về kết quả thành công
        return {
            "reply": response.text,
            "products": None,
            "history": req.history + [{"role": "model", "content": response.text}],
        }

    except Exception as e:
        # Do not run hardcoded parsing fallbacks; Gemini is the single source
        # of intent/relevance. When it fails, return a safe marketplace-only message.
        print(f"Gemini Error: {type(e).__name__}")
        err_text = str(e) or ""
        err_lower = err_text.lower()
        if (
            "api_key_invalid" in err_text
            or "api key expired" in err_lower
            or "api key is invalid" in err_lower
            or "invalid api key" in err_lower
        ):
            reply = (
                "Xin lỗi, hệ thống AI đang lỗi cấu hình Gemini "
                "(API key đã hết hạn/không hợp lệ). "
                "Bạn vui lòng kiểm tra `GEMINI_API_KEY` trong "
                "`ai-server/.env` và khởi động lại server."
            )
            return {
                "reply": reply,
                "products": None,
                "history": req.history + [{"role": "model", "content": reply}],
            }

        reply = (
            "Xin lỗi, hiện hệ thống AI chưa thể xử lý yêu cầu của bạn lúc này. "
            "Bạn thử lại theo dạng: "
            "'tìm sản phẩm: iphone', 'xem chi tiết sản phẩm: 123', hoặc 'mua sản phẩm ...' nhé."
        )
        return {
            "reply": reply,
            "products": None,
            "history": req.history + [{"role": "model", "content": reply}],
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

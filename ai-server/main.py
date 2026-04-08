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
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = FastAPI(title="Marketplace Gemini Chatbot")

# Cho phép Frontend Angular gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

NESTJS_API_URL = "http://localhost:3000/api"


class ChatMessage(BaseModel):
    message: str
    token: str = None
    accessToken: str = None  # Hỗ trợ cả 2 tên biến từ frontend
    history: list = []


# --- TOOL FUNCTIONS FOR NESTJS ---


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
    q_clean = query.lower().strip()
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

        p_name = (p.get("name") or "").lower()
        p_cat = (p.get("category") or "").lower()
        p_brand = (p.get("brand") or "").lower()

        score = 0

        # Tier 1: Match category group keywords (like "điện thoại" → "iphone")
        if matched_group_keywords:
            if p_cat in matched_group_keywords or p_brand in matched_group_keywords:
                score += 10

        # Tier 2: Direct name/category/brand match
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
        params = "pageSize=12"
        q_clean = query.strip().lower()

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

                def score_product(p):
                    """Tính điểm match cho sản phẩm dựa trên tên, danh mục, thương hiệu"""
                    score = 0
                    p_name = (p.get("name") or "").lower()
                    p_category = (p.get("category") or "").lower()
                    p_brand = (p.get("brand") or "").lower()

                    for word in q_words:
                        if word in p_name:
                            score += 3  # Tên sản phẩm ưu tiên cao nhất
                        if word in p_category:
                            score += 2  # Danh mục thứ hai
                        if word in p_brand:
                            score += 2  # Thương hiệu bằng danh mục
                    return score

                # Lọc sản phẩm có ít nhất 1 từ khóa match
                matched = [p for p in all_data if score_product(p) > 0]
                if matched:
                    # Sắp xếp theo điểm cao nhất
                    items = sorted(matched, key=score_product, reverse=True)
                else:
                    # Nếu không match từ nào, thử fuzzy match đơn giản
                    import difflib

                    for word in q_words:
                        candidates = [
                            p
                            for p in all_data
                            if p
                            and isinstance(p, dict)
                            and difflib.SequenceMatcher(
                                None, word, (p.get("name") or "").lower()
                            ).ratio()
                            > 0.6
                        ]
                        if candidates:
                            items = candidates
                            break

        if isinstance(items, list) and len(items) > 0:
            return [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "price": p.get("price"),
                    "image": p.get("image"),
                    "rating": p.get("rating", 4.8),
                    "sold": p.get("sold", p.get("soldCount", 0)),
                    "description": p.get("description", "")[:100] + "...",
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
            res = requests.get(f"{NESTJS_API_URL}/product?pageSize=100", timeout=5)
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
                headers={"Authorization": f"Bearer {actual_token}"}
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
                    
                    if (item.get("productId") == product_id and
                        (not context_size or (item_size or "").lower() == context_size.lower()) and
                        (not context_color or (item_color or "").lower() == context_color.lower())):
                        # Xóa item cũ để tránh duplicate
                        print(f"Removing duplicate item {item.get('id')} from cart")
                        delete_res = requests.delete(
                            f"{NESTJS_API_URL}/cart/items/{item.get('id')}",
                            headers={"Authorization": f"Bearer {actual_token}"}
                        )
                        if delete_res.status_code in [200, 204]:
                            duplicate_removed = True
                            print(f"Successfully removed duplicate item {item.get('id')}")
                        else:
                            print(f"Failed to remove duplicate item: {delete_res.status_code}")
                
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
❌ KHÔNG nói "không có" ngay lập tức
✔ Luôn đề xuất sản phẩm gần giống

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
- Luôn lưu product_id trong reply: _(product_id:[ID])_
- Lưu variant đã chọn: _(product_id:[ID],color:[màu],size:[size])_
- Lưu payment: _(product_id:[ID],color:[màu],size:[size],payment:[COD/VNPAY])_
- Dùng context này để track trạng thái đơn hàng

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

    print(f"Loaded API Key: {api_key[:8]}***")

    # Chuyển đổi history sang format Gemini SDK (parts)
    gemini_history = []
    for m in req.history:
        role = "model" if m.get("role") == "assistant" else "user"
        content = m.get("content") or ""
        if content:
            gemini_history.append({"role": role, "parts": [{"text": content}]})

    try:
        # Thử lần lượt các model từ nhẹ đến nặng
        last_error = None
        response = None
        for model_name in [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.0-flash-001",
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
        error_msg = str(e)
        print(f"Gemini Error (Falling back): {error_msg}")

        token = req.token or req.accessToken
        msg_lower = req.message.lower()

        # --- CHẾ ĐỘ DỰ PHÒNG THÔNG MINH (STATEFUL FALLBACK) ---
        # Tìm message bot cuối cùng (không phải user)
        last_bot_reply = ""
        for h in reversed(req.history):
            if h.get("role") in ("model", "assistant"):
                last_bot_reply = h.get("content", "").lower()
                break

        reply = ""
        products = None  # Khởi tạo mặc định để tránh UnboundLocalError

        # A. Xử lý XÁC NHẬN đơn hàng
        if (
            any(
                kw in msg_lower
                for kw in ["có", "xác nhận", "đúng", "đồng ý", "ok", "chốt", "yes"]
            )
            and "bạn xác nhận đặt" in last_bot_reply
        ):
            p_id = resolve_product_id_from_history(req)
            pay_match = re.search(r"payment:([A-Z]+)", last_bot_reply, re.IGNORECASE)
            color_match = re.search(r"color:([^,)\n_]+)", last_bot_reply)
            size_match = re.search(r"size:([^,)\n_]+)", last_bot_reply)
            if p_id:
                payment = pay_match.group(1).strip().upper() if pay_match else "COD"
                color = (
                    color_match.group(1).strip()
                    if color_match and color_match.group(1).strip()
                    else None
                )
                size = (
                    size_match.group(1).strip()
                    if size_match and size_match.group(1).strip()
                    else None
                )
                res = place_order_for_user(
                    token, p_id, 1, color=color, size=size, paymentMethod=payment
                )
                if isinstance(res, dict) and res.get("success"):
                    reply = f"✅ Đặt hàng thành công! Mã đơn **#{res['order'].get('id')}**. Cảm ơn bạn! 🎉"
                else:
                    reply = f"❌ Lỗi khi chốt đơn: {res.get('error', 'Server bận')}."
                return {
                    "reply": reply,
                    "products": None,
                    "history": req.history + [{"role": "assistant", "content": reply}],
                }

        # B. Xử lý đặt hàng — lấy chi tiết SP, hỏi variant + thanh toán
        elif any(kw in msg_lower for kw in ["đặt", "mua", "order", "múc"]):
            print(f"FALLBACK: Processing order request: {msg_lower}")
            # Thử tìm product ID trước - chỉ match khi có từ khóa rõ ràng
            match = re.search(r"(?:id|sản phẩm|mã)\s*(\d+)", msg_lower, re.IGNORECASE)
            p_id = None

            if match:
                p_id = int(match.group(1))
                print(f"FALLBACK: Found ID in message: {p_id}")
            else:
                # Không có ID, thử tìm theo tên sản phẩm
                product_name = re.sub(
                    r"(?:đặt|mua|order|múc|tôi muốn|cho tôi)",
                    "",
                    msg_lower,
                    flags=re.IGNORECASE,
                ).strip()
                print(f"FALLBACK: Searching by name: '{product_name}'")
                if product_name:
                    found_product = search_product_by_name(product_name)
                    if found_product and isinstance(found_product, dict):
                        p_id = found_product.get("id")
                        print(
                            f"FALLBACK: Found product by name: {found_product.get('name')} (ID: {p_id})"
                        )
                    else:
                        print("FALLBACK: Product not found by name")

            if p_id:
                # Lấy chi tiết sản phẩm
                details = get_product_details(p_id)
                p_name = (
                    details.get("name", f"ID {p_id}")
                    if isinstance(details, dict)
                    else f"ID {p_id}"
                )
                attributes = (
                    details.get("attributes", []) if isinstance(details, dict) else []
                )

                # Lấy địa chỉ giao hàng đúng
                profile = check_user_profile(token) if token else {}
                addr = (
                    profile.get("address", "Chưa cập nhật")
                    if isinstance(profile, dict)
                    else "Chưa cập nhật"
                )
                phone = profile.get("phone", "") if isinstance(profile, dict) else ""

                if attributes:
                    # Còn variant chưa chọn — hỏi trước
                    attr_lines = ""
                    for attr in attributes:
                        opts = ", ".join(attr.get("options", []))
                        attr_lines += f"\n• {attr['name']}: {opts}"
                    reply = (
                        f"🛍️ Sản phẩm **{p_name}** có các lựa chọn:{attr_lines}\n\n"
                        f"Bạn muốn chọn loại nào? Và thanh toán bằng:\n"
                        f"1️⃣ Tiền mặt (COD)\n2️⃣ Chuyển khoản (VNPAY)\n\n"
                        f"Ví dụ: *Màu Đen, Size XL, COD*\n"
                        f"_(product_id:{p_id})_"
                    )
                else:
                    # Không có variant — hỏi thanh toán
                    reply = (
                        f"🛒 Bạn muốn đặt mua **{p_name}**\n"
                        f"📍 Địa chỉ: {addr}\n"
                        f"📞 SĐT: {phone}\n\n"
                        f"Chọn phương thức thanh toán:\n"
                        f"1️⃣ Tiền mặt (COD)\n2️⃣ Chuyển khoản (VNPAY)\n\n"
                        f"Gõ **COD** hoặc **VNPAY** để xác nhận đặt đơn."
                    )
                    # Lưu context vào reply để fallback A có thể đọc
                    reply += f"\n_(product_id:{p_id})_"
            else:
                reply = "Không tìm thấy sản phẩm trong ngữ cảnh. Bạn thử gõ lại 'Mua sản phẩm [tên sản phẩm]' nhé!"

        # B2. Người dùng chọn variant (khi bot vừa hỏi lựa chọn)
        elif (
            "có các lựa chọn" in last_bot_reply
            or "bạn muốn chọn loại nào" in last_bot_reply
            or "_(product_id:" in last_bot_reply
        ):
            p_id = resolve_product_id_from_history(req)
            if not p_id:
                # Nếu không tìm được ID, cố gắng đọc tên sản phẩm từ ngữ cảnh và map về ID
                name_guess = find_product_name_in_history(req.history)
                if name_guess:
                    found = search_product_by_name(name_guess)
                    if found and isinstance(found, dict):
                        p_id = found.get("id")

            if not p_id:
                reply = "Không tìm thấy sản phẩm trong ngữ cảnh. Vui lòng chọn lại sản phẩm bằng nút Mua hoặc gõ lại tên sản phẩm chính xác."
                return {
                    "reply": reply,
                    "products": None,
                    "history": req.history + [{"role": "assistant", "content": reply}],
                }

            previous = resolve_selected_variants_from_history(req.history)
            color = previous.get("color")
            size = previous.get("size")
            payment = previous.get("payment")

            if any(kw in msg_lower for kw in ["vnpay", "chuyển khoản"]):
                payment = "VNPAY"
            elif any(kw in msg_lower for kw in ["cod", "tiền mặt", "tiền", "mặt"]):
                payment = "COD"

            if p_id:
                details = get_product_details(p_id)
                p_name = (
                    details.get("name", f"ID {p_id}")
                    if isinstance(details, dict)
                    else f"ID {p_id}"
                )
                attributes = (
                    details.get("attributes", []) if isinstance(details, dict) else []
                )

                invalid_attrs = []
                for attr in attributes:
                    attr_name_raw = attr.get("name", "")
                    attr_name = attr_name_raw.lower()
                    valid_options = attr.get("options", [])
                    matched_opt = next(
                        (opt for opt in valid_options if opt.lower() in msg_lower), None
                    )
                    if matched_opt:
                        if any(k in attr_name for k in ["màu", "color"]):
                            color = matched_opt
                        elif any(
                            k in attr_name
                            for k in ["size", "kích", "bộ nhớ", "dung lượng"]
                        ):
                            size = matched_opt
                        continue

                    attr_keywords = []
                    if any(k in attr_name for k in ["màu", "color"]):
                        attr_keywords = ["màu", "color", "màu sắc"]
                    elif any(
                        k in attr_name for k in ["size", "kích", "bộ nhớ", "dung lượng"]
                    ):
                        attr_keywords = [
                            "size",
                            "kích",
                            "bộ nhớ",
                            "dung lượng",
                            "dung lượng",
                            "gb",
                            "tb",
                        ]

                    referenced_attr = any(
                        keyword in msg_lower for keyword in attr_keywords
                    )
                    if not referenced_attr:
                        continue

                    invalid_tokens = [
                        w
                        for w in re.split(r"[,\s]+", req.message.strip())
                        if len(w) > 1
                    ]
                    invalid_tokens = [
                        w
                        for w in invalid_tokens
                        if w.lower()
                        not in {
                            "và",
                            "với",
                            "cod",
                            "vnpay",
                            "tiền",
                            "mặt",
                            "chuyển",
                            "khoản",
                            "mua",
                            "đặt",
                            "ok",
                            "nhé",
                            "xin",
                            "cho",
                            "tôi",
                            "muốn",
                        }
                    ]
                    invalid_tokens = [
                        w
                        for w in invalid_tokens
                        if not any(w.lower() == opt.lower() for opt in valid_options)
                    ]
                    if invalid_tokens:
                        opts_str = ", ".join(f"**{o}**" for o in valid_options)
                        invalid_attrs.append(f"• {attr_name_raw}: {opts_str}")

                selected_parts = []
                if color:
                    selected_parts.append(f"Màu: {color}")
                if size:
                    selected_parts.append(f"Bộ nhớ/Size: {size}")
                current_selection = (
                    ", ".join(selected_parts) if selected_parts else None
                )

                missing_attrs = []
                for attr in attributes:
                    attr_name_raw = attr.get("name", "")
                    if (
                        any(k in attr_name_raw.lower() for k in ["màu", "color"])
                        and not color
                    ):
                        missing_attrs.append((attr_name_raw, attr.get("options", [])))
                    if (
                        any(
                            k in attr_name_raw.lower()
                            for k in ["size", "kích", "bộ nhớ", "dung lượng"]
                        )
                        and not size
                    ):
                        missing_attrs.append((attr_name_raw, attr.get("options", [])))

                if invalid_attrs:
                    reply = (
                        f"❌ Lựa chọn không hợp lệ! Sản phẩm **{p_name}** chỉ có:\n"
                        + "\n".join(invalid_attrs)
                        + f"\n\nVui lòng chọn lại nhé! \n_(product_id:{p_id},color:{color or ''},size:{size or ''})_"
                    )
                elif missing_attrs:
                    prompt_lines = ""
                    for attr_name_raw, opts in missing_attrs:
                        opts_str = ", ".join(opts)
                        prompt_lines += f"\n• {attr_name_raw}: {opts_str}"

                    if current_selection:
                        reply = (
                            f"✅ Đã chọn: **{current_selection}**\n\n"
                            f"Còn thiếu lựa chọn sau đây cho sản phẩm **{p_name}**:{prompt_lines}\n\n"
                            f"Bạn tiếp tục chọn nhé. Ví dụ: *{missing_attrs[0][0]} {missing_attrs[0][1][0]}*\n"
                            f"_(product_id:{p_id},color:{color or ''},size:{size or ''},payment:{payment or ''})_"
                        )
                    else:
                        reply = (
                            f"Bạn cần chọn thêm tùy chọn cho sản phẩm **{p_name}**:{prompt_lines}\n\n"
                            f"Ví dụ: *Màu Đen* hoặc *{missing_attrs[0][0]} {missing_attrs[0][1][0]}*\n"
                            f"_(product_id:{p_id},color:{color or ''},size:{size or ''},payment:{payment or ''})_"
                        )
                elif not payment:
                    reply = (
                        f"✅ Đã chọn: **{current_selection or 'Mặc định'}**\n\n"
                        f"Chọn phương thức thanh toán:\n"
                        f"1️⃣ Tiền mặt (COD)\n2️⃣ Chuyển khoản (VNPAY)\n"
                        f"_(product_id:{p_id},color:{color or ''},size:{size or ''})_"
                    )
                else:
                    profile = check_user_profile(token) if token else {}
                    reply = (
                        f"🛒 Xác nhận đặt đơn:\n"
                        f"📦 **{p_name}** — {current_selection or 'Mặc định'}\n"
                        f"📍 Địa chỉ: {profile.get('address', 'Chưa cập nhật')}\n"
                        f"📞 SĐT: {profile.get('phone', '')}\n"
                        f"💳 Thanh toán: {'Tiền mặt (COD)' if payment == 'COD' else 'VNPAY'}\n\n"
                        f"⚠️ **Bạn xác nhận đặt đơn hàng này chứ?**\n"
                        f"1️⃣ Có\n2️⃣ Không\n"
                        f"_(product_id:{p_id},color:{color or ''},size:{size or ''},payment:{payment})_"
                    )
            else:
                reply = "Không tìm thấy sản phẩm trong ngữ cảnh. Bạn thử gõ lại 'Mua sản phẩm ID X' nhé!"

        # B3. Người dùng chọn thanh toán sau khi đã chọn variant
        elif any(
            kw in msg_lower for kw in ["cod", "vnpay", "tiền mặt", "chuyển khoản"]
        ):
            p_id = resolve_product_id_from_history(req)
            p_id = int(p_id) if p_id else None

            if p_id:
                previous = resolve_selected_variants_from_history(req.history)
                color = previous.get("color")
                size = previous.get("size")
                payment = previous.get("payment")

                if any(kw in msg_lower for kw in ["vnpay", "chuyển khoản"]):
                    payment = "VNPAY"
                elif any(kw in msg_lower for kw in ["cod", "tiền mặt", "tiền", "mặt"]):
                    payment = "COD"

                details = get_product_details(p_id)
                p_name = (
                    details.get("name", f"ID {p_id}")
                    if isinstance(details, dict)
                    else f"ID {p_id}"
                )
                attributes = (
                    details.get("attributes", []) if isinstance(details, dict) else []
                )
                missing_attrs = []
                for attr in attributes:
                    attr_name_raw = attr.get("name", "")
                    if (
                        any(k in attr_name_raw.lower() for k in ["màu", "color"])
                        and not color
                    ):
                        missing_attrs.append((attr_name_raw, attr.get("options", [])))
                    if (
                        any(
                            k in attr_name_raw.lower()
                            for k in ["size", "kích", "bộ nhớ", "dung lượng"]
                        )
                        and not size
                    ):
                        missing_attrs.append((attr_name_raw, attr.get("options", [])))

                profile = check_user_profile(token) if token else {}
                addr = (
                    profile.get("address", "Chưa cập nhật")
                    if isinstance(profile, dict)
                    else "Chưa cập nhật"
                )
                phone = profile.get("phone", "") if isinstance(profile, dict) else ""
                variant_parts = [v for v in [color, size] if v]
                variant_str = ", ".join(variant_parts) if variant_parts else "Mặc định"

                if missing_attrs:
                    prompt_lines = ""
                    for attr_name_raw, opts in missing_attrs:
                        opts_str = ", ".join(opts)
                        prompt_lines += f"\n• {attr_name_raw}: {opts_str}"
                    reply = (
                        f"✅ Đã chọn: **{variant_str}**\n\n"
                        f"Còn thiếu lựa chọn sau đây cho sản phẩm **{p_name}**:{prompt_lines}\n\n"
                        f"Bạn tiếp tục chọn nhé. Ví dụ: *{missing_attrs[0][0]} {missing_attrs[0][1][0]}*\n"
                        f"_(product_id:{p_id},color:{color or ''},size:{size or ''},payment:{payment or ''})_"
                    )
                else:
                    reply = (
                        f"🛒 Xác nhận đặt đơn:\n"
                        f"📦 **{p_name}** — {variant_str}\n"
                        f"📍 Địa chỉ: {addr}\n"
                        f"📞 SĐT: {phone}\n"
                        f"💳 Thanh toán: {'Tiền mặt (COD)' if payment == 'COD' else 'VNPAY'}\n\n"
                        f"⚠️ **Bạn xác nhận đặt đơn hàng này chứ?**\n"
                        f"1️⃣ Có\n2️⃣ Không\n"
                        f"_(product_id:{p_id},color:{color or ''},size:{size or ''},payment:{payment})_"
                    )
            else:
                reply = "Không tìm thấy sản phẩm. Bạn thử lại nhé!"

        # C. Tìm kiếm sản phẩm
        elif any(
            kw in msg_lower
            for kw in [
                "tìm",
                "tìm kiếm",
                "sản phẩm",
                "iphone",
                "samsung",
                "laptop",
                "điện thoại",
                "di động",
                "áo",
                "quần",
                "hàng",
                "loại",
                "bán",
                "xem",
                "có gì",
                "cần",
                "đồ",
            ]
        ):
            stop_words = [
                "tìm",
                "tìm kiếm",
                "sản phẩm",
                "cho tôi",
                "tôi muốn",
                "có",
                "bán",
                "không",
                "giúp",
                "xem",
                "có gì",
                "danh sách",
                "hiển thị",
                "liệt kê",
                "cần",
            ]
            clean_query = msg_lower
            for w in stop_words:
                clean_query = clean_query.replace(w, " ")
            clean_query = " ".join(clean_query.split()).strip()

            # Smart category + brand mapping để nhận diện danh mục từ từ khóa
            category_keywords = {
                "điện thoại": [
                    "điện thoại",
                    "smartphone",
                    "phone",
                    "mobile",
                    "iphone",
                    "samsung",
                    "xiaomi",
                    "oppo",
                    "vivo",
                    "realme",
                    "android",
                    "ios",
                ],
                "laptop": [
                    "laptop",
                    "notebook",
                    "ultrabook",
                    "macbook",
                    "dell",
                    "asus",
                    "hp",
                    "lenovo",
                    "acer",
                    "msi",
                    "gaming laptop",
                ],
                "áo": [
                    "áo",
                    "shirt",
                    "t-shirt",
                    "tshirt",
                    "hoodie",
                    "jacket",
                    "sweater",
                ],
                "quần": ["quần", "pants", "jeans", "shorts", "jogger"],
                "mũ": ["mũ", "nón", "hat", "cap"],
                "apple": [
                    "apple",
                    "iphone",
                    "ipad",
                    "macbook",
                    "airpods",
                    "ios",
                    "macos",
                ],
            }
            matched_categories = set()
            for keyword, categories in category_keywords.items():
                if keyword in clean_query.lower():
                    matched_categories.update(categories)

            search_key = clean_query
            synonyms = {
                "điện thoại": ["iphone", "smartphone", "mobile", "phone"],
                "di động": ["iphone", "smartphone", "mobile"],
                "máy tính": ["laptop", "pc", "desktop", "computer"],
                "áo": ["áo thun", "shirt", "t-shirt", "hoodie", "jacket"],
                "mũ": ["nón", "hat", "cap"],
                "giày": ["shoes", "sneaker", "giày thể thao"],
                "tai nghe": ["earphone", "headphone", "earbuds", "airpods"],
                "sạc": ["charger", "củ sạc", "fast charge"],
                "túi": ["bag", "backpack", "handbag", "balô"],
                "đồng hồ": ["watch", "smartwatch", "apple watch"],
                "tivi": ["tv", "smart tv"],
                "loa": ["speaker", "bluetooth speaker"],
                "máy lạnh": ["điều hòa", "air conditioner"],
                "xe máy": ["motorbike", "bike"],
                "ô tô": ["car", "auto"],
                "đồ ăn": ["food", "snack"],
                "cà phê": ["coffee"],
            }
            if search_key.lower() in synonyms:
                search_key = synonyms[search_key.lower()]

            # Nếu query quá ngắn hoặc chung chung, dùng query rỗng để search top products
            if len(search_key) < 2:
                search_key = ""

            products = search_products(search_key) if search_key else []

            # Nếu API search không ra kết quả nhưng có category match, dùng local filter by category
            if (not products or len(products) == 0) and matched_categories:
                print(
                    f"Falling back to category-based search for: {matched_categories}"
                )
                all_items = list_inventory()
                if isinstance(all_items, list) and len(all_items) > 0:
                    # Filter by matched categories (case-insensitive)
                    matched_cat_lower = set(c.lower() for c in matched_categories)
                    products = [
                        p
                        for p in all_items
                        if p
                        and p.get("category")
                        and p.get("category").lower() in matched_cat_lower
                    ]

            # Nếu vẫn không ra, thử keyword-based search như cũ
            if not products or len(products) == 0:
                all_items = list_inventory()
                matches = []
                if isinstance(all_items, list) and len(all_items) > 0:
                    # Local fuzzy search với tính điểm
                    q_words = clean_query.lower().split()
                    for p in all_items:
                        if not p:
                            continue
                        p_name = (p.get("name") or "").lower()
                        p_cat = (p.get("category") or "").lower()
                        p_brand = (p.get("brand") or "").lower()

                        # Tính điểm match - tên > category > brand
                        score = 0
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
                        products = [m[0] for m in matches[:10]]

            if isinstance(products, list) and len(products) >= 1:
                top_names = [p.get("name", "N/A") for p in products[:3] if p]
                names_str = " / ".join(f"**{n}**" for n in top_names)
                if len(products) > 1:
                    reply = f"Dạ, mình đã tìm thấy một số {clean_query or 'mặt hàng'} chất lượng như: {names_str}... 🎈\n\nBạn xem danh sách dưới này nhé!"
                else:
                    p_name = (
                        products[0].get("name", "Sản phẩm")
                        if products[0]
                        else "Sản phẩm"
                    )
                    reply = f"Dạ, mình có mẫu **{p_name}** rất ưng ý nè! Bạn xem thử nhé? 😊"
            else:
                reply = f"Dạ, hiện tại kho mình chưa có '{clean_query}'. Nhưng bên em có nhiều mẫu khác rất đẹp, bạn cứ thử tìm theo tên thương hiệu xem sao nhé! 🎁"
                products = None

        # D. Cập nhật profile
        elif any(kw in msg_lower for kw in ["địa chỉ", "sdt", "số điện thoại"]):
            if not token:
                reply = "Bạn vui lòng đăng nhập để cập nhật thông tin nhé!"
            else:
                reply = "Tôi đã ghi nhận thông tin của bạn! Hệ thống đang cập nhật địa chỉ và số điện thoại mới cho tài khoản của bạn."

        # E. Fallback mặc định
        else:
            reply = "Chào khách! Bạn hãy thử gõ: **'Tìm sản phẩm'** hoặc **'Mua sản phẩm'** để tôi phục vụ ngay nhé! 😊"

        return {
            "reply": reply,
            "products": products,
            "history": req.history + [{"role": "model", "content": reply}],
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

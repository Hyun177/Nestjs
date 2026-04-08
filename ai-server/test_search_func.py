#!/usr/bin/env python
import sys
sys.path.insert(0, '/NestJS/Nestjs/ai-server')

# Import functions từ main
import requests
NESTJS_API_URL = "http://localhost:3000/api"

def list_inventory():
    """Lấy danh sách TẤT CẢ sản phẩm đang có trong kho với đầy đủ thông tin. Giúp bạn tư vấn chính xác khi tìm kiếm chung chung."""
    try:
        print("Tool calling: list_inventory")
        try:
            res = requests.get(f"{NESTJS_API_URL}/product?pageSize=100", timeout=5)
            if res.status_code != 200:
                print(f"API returned {res.status_code} for inventory. Returning empty list.")
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
                category_name = category_obj.get("name") if isinstance(category_obj, dict) else None
                brand_obj = p.get("brand")
                brand_name = brand_obj.get("name") if isinstance(brand_obj, dict) else None
                result.append({
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "category": category_name,
                    "brand": brand_name,
                    "price": p.get("price"),
                    "image": p.get("image"),
                    "rating": p.get("rating", 4.8),
                    "sold": p.get("soldCount", 0),
                    "description": (p.get("description") or "")[:100] + "..."
                })
            return result
        return []
    except Exception as e:
        print(f"Inventory Error: {e}")
        import traceback
        traceback.print_exc()
        return []

def search_products_from_inventory(query: str):
    """Fallback search when API is down - search locally from inventory."""
    all_data = list_inventory()
    if not all_data or not isinstance(all_data, list):
        return []
    
    if not query:
        return all_data[:12]
    
    # Smart category keyword mapping - handle Vietnamese terms
    category_keywords = {
        "điện thoại": ["iphone", "samsung", "xiaomi", "oppo", "vivo"],
        "di động": ["iphone", "samsung", "xiaomi"],
        "laptop": ["laptop", "macbook", "dell"],
        "máy tính": ["laptop", "macbook", "dell"],
        "đồ gia dụng": ["appliance"],
        "thời trang": ["túi xách", "đồ thể thao", "clothing", "fashion"],
        "áo": ["clothing", "shirt"],
        "apple": ["iphone", "ipad", "mac", "apple"],
    }
    
    q_clean = query.lower().strip()
    q_words = q_clean.split()
    matches = []
    
    # Check if any keyword matches query
    matched_keywords = set()
    for keyword in category_keywords.keys():
        if keyword in q_clean:
            matched_keywords.update(category_keywords[keyword])
    
    print(f"  Query: '{query}' -> cleaned: '{q_clean}'")
    print(f"  Matched keywords from mapping: {matched_keywords}")
    
    for p in all_data:
        if not p or not isinstance(p, dict):
            continue
        
        p_name = (p.get('name') or "").lower()
        p_cat = (p.get('category') or "").lower()
        p_brand = (p.get('brand') or "").lower()
        
        score = 0
        
        # If we matched category keywords, prioritize items in those categories
        if matched_keywords:
            if p_cat in matched_keywords or p_brand in matched_keywords:
                score += 10
        
        # Regular keyword matching
        for w in q_words:
            # Skip very short words that might match too much
            if len(w) < 2:
                continue
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

# Test
print("=" * 60)
print("Testing search_products_from_inventory('iphone')")
print("=" * 60)
try:
    result = search_products_from_inventory('iphone')
    print(f"\nResult type: {type(result)}")
    print(f"Result count: {len(result)}")
    for r in result[:3]:
        print(f"\n{r.get('name')} - Category: {r.get('category')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Testing search_products_from_inventory('điện thoại')")
print("=" * 60)
try:
    result = search_products_from_inventory('điện thoại')
    print(f"\nResult type: {type(result)}")
    print(f"Result count: {len(result)}")
    for r in result[:3]:
        print(f"\n{r.get('name')} - Category: {r.get('category')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Testing search_products_from_inventory('apple')")
print("=" * 60)
try:
    result = search_products_from_inventory('apple')
    print(f"\nResult type: {type(result)}")
    print(f"Result count: {len(result)}")
    for r in result[:3]:
        print(f"\n{r.get('name')} - Brand: {r.get('brand')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

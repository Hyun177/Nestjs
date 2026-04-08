#!/usr/bin/env python
import requests

NESTJS_API_URL = "http://localhost:3000/api"

# Test 1: Get raw inventory
print("=" * 50)
print("Test 1: Get raw inventory")
print("=" * 50)
try:
    res = requests.get(f"{NESTJS_API_URL}/product?pageSize=5", timeout=5)
    print(f"Status: {res.status_code}")
    data = res.json()
    print(f"Data type: {type(data)}")
    if isinstance(data, dict):
        items = data.get("data", data)
    else:
        items = data
    print(f"Items type: {type(items)}")
    print(f"Items count: {len(items) if isinstance(items, list) else 'N/A'}")
    
    if isinstance(items, list):
        for i, item in enumerate(items[:3]):
            print(f"\nItem {i}:")
            print(f"  Type: {type(item)}")
            if item is None:
                print("  Value: None")
            elif isinstance(item, dict):
                print(f"  Keys: {item.keys()}")
                print(f"  Name: {item.get('name')}")
                print(f"  Category: {item.get('category')}")
            else:
                print(f"  Value: {item}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

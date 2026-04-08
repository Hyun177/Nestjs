#!/usr/bin/env python
import requests

# Test product details API
print("Testing product details API...")
try:
    response = requests.get("http://localhost:3000/api/product/4", timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Product name: {data.get('name')}")
        print(f"Product ID: {data.get('id')}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

# Test search by name
print("\nTesting search by name function...")
import sys
sys.path.insert(0, '.')

from main import search_product_by_name

result = search_product_by_name("Iphone 4")
if result:
    print(f"Found: {result.get('name')} (ID: {result.get('id')})")
else:
    print("Not found")
#!/usr/bin/env python
import requests
NESTJS_API_URL = "http://localhost:3000/api"

# Get all products to check categories
res = requests.get(f"{NESTJS_API_URL}/product?pageSize=20")
items = res.json().get('data', [])

print("All categories found:")
categories = set()
for item in items:
    cat = item.get('category', {})
    if isinstance(cat, dict):
        cat_name = cat.get('name', '')
        categories.add(cat_name.lower())

for cat in sorted(categories):
    print(f"  - {cat}")

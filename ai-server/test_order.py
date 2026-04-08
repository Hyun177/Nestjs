#!/usr/bin/env python
import requests

# Test AI chat với đặt hàng theo tên sản phẩm
test_messages = [
    "Tôi muốn đặt hàng sản phẩm Iphone 4",
    "Tôi muốn mua iPhone 17 Pro 256GB",
    "Đặt hàng Samsung S2"
]

for msg in test_messages:
    print(f"\n=== Testing: {msg} ===")
    try:
        response = requests.post("http://localhost:8000/api/chat", json={
            "message": msg,
            "token": "test_token",  # Add token
            "history": []  # Empty history
        }, timeout=10)

        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Reply: {data.get('reply', '')[:300]}...")
        else:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
#!/usr/bin/env python
import requests

# Test fallback mode bằng cách gửi request với message có từ khóa đặt hàng
print("Testing fallback mode for ordering...")

try:
    response = requests.post("http://localhost:8000/api/chat", json={
        "message": "Tôi muốn đặt hàng sản phẩm Iphone 4",
        "token": "",
        "history": []
    }, timeout=10)

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Reply: {data.get('reply', '')}")
    else:
        print(f"Response: {response.text}")

except Exception as e:
    print(f"Exception: {e}")
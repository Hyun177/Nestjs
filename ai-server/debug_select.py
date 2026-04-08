import requests

history = [
    {'role': 'user', 'content': 'Tôi muốn đặt hàng sản phẩm iPhone 17 Pro 256GB | Chính hãng'},
    {'role': 'assistant', 'content': '🛍️ Sản phẩm **iPhone 17 Pro 256GB | Chính hãng** có các lựa chọn:\n• Màu sắc: Xanh Dương, Cam, Bạc\n• Dung lượng: 256GB, 512GB, 1TB\n\nBạn muốn chọn loại nào? Và thanh toán bằng:\n1️⃣ Tiền mặt (COD)\n2️⃣ Chuyển khoản (VNPAY)\n\nVí dụ: *Màu Đen, Size XL, COD*'}
]

resp = requests.post('http://localhost:8000/api/chat', json={'message': 'Xanh Dương', 'token': None, 'history': history}, timeout=10)
print(resp.status_code)
print(resp.text)

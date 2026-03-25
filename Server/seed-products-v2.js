const mysql = require('mysql2/promise');

const DB = {
  host: '127.0.0.1',
  user: 'root',
  password: 'huyblue123',
  database: 'nestjs_db',
};

async function seed() {
  const conn = await mysql.createConnection(DB);
  console.log('✅ Connected to', DB.database);

  try {
    // Get a user ID (admin usually)
    const [[adminUser]] = await conn.execute("SELECT id FROM users LIMIT 1");
    if (!adminUser) throw new Error("No users found to assign products");

    // Get categories
    const [[phoneCat]] = await conn.execute("SELECT id FROM category WHERE name LIKE '%Điện thoại%' OR name LIKE '%Phone%' LIMIT 1");
    const [[shirtCat]] = await conn.execute("SELECT id FROM category WHERE name LIKE '%Áo%' OR name LIKE '%Shirt%' LIMIT 1");

    // Get brands
    const [[appleBrand]] = await conn.execute("SELECT id FROM brand WHERE name LIKE '%Apple%' LIMIT 1");
    const [[nikeBrand]] = await conn.execute("SELECT id FROM brand WHERE name LIKE '%Nike%' LIMIT 1");

    const categoryId = phoneCat ? phoneCat.id : 1;
    const shirtCategoryId = shirtCat ? shirtCat.id : 1;
    const brandId = appleBrand ? appleBrand.id : 1;
    const brandIdNike = nikeBrand ? nikeBrand.id : 1;

    const products = [
      {
        name: 'iPhone 15 Pro Max Titanium',
        price: 34990000,
        originalPrice: 36990000,
        description: `THÔNG TIN SẢN PHẨM:
        - Màn hình Super Retina XDR 6.7 inch mượt mà.
        - Khung viền Titanium nhẹ và bền nhất từng có trên iPhone.
        - Hệ thống Camera Pro 48MP cho hình ảnh siêu sắc nét.
        - Cổng sạc USB-C thế hệ mới truyền tải dữ liệu nhanh chóng.
        CHÍNH SÁCH BẢO HÀNH:
        1. Bảo hành 12 tháng chính hãng.
        2. 1 đổi 1 trong 30 ngày nếu có lỗi phần cứng.`,
        categoryId: categoryId,
        brandId: brandId,
        stock: 50,
        rating: 4.8,
        numReviews: 124,
        isFeatured: true,
        image: '/uploads/iphone-15.jpg',
        images: JSON.stringify(['/uploads/iphone-15-back.jpg', '/uploads/iphone-15-side.jpg']),
        attributes: JSON.stringify([
          { name: 'Dung lượng', options: ['128GB', '256GB', '512GB', '1TB'] },
          { name: 'Màu sắc', options: ['Titanium', 'Black', 'Blue', 'White'] }
        ]),
        variants: JSON.stringify([
          { sku: 'IP15PM-TITAN-128', price: 34990000, stock: 10, attributes: { 'Dung lượng': '128GB', 'Màu sắc': 'Titanium' } },
          { sku: 'IP15PM-TITAN-256', price: 36990000, stock: 5, attributes: { 'Dung lượng': '256GB', 'Màu sắc': 'Titanium' } },
          { sku: 'IP15PM-BLACK-128', price: 34990000, stock: 0, attributes: { 'Dung lượng': '128GB', 'Màu sắc': 'Black' } }
        ])
      },
      {
        name: 'Áo T-shirt One Life Graphic',
        price: 260000,
        originalPrice: 300000,
        description: `ĐẶC ĐIỂM NỔI BẬT:
        - Chất liệu 100% cotton giấy siêu thoáng mát.
        - Hình in Graphic 3D không bong tróc khi giặt máy.
        - Form dáng Boxy hiện đại, dễ dàng phối đồ.
        HƯỚNG DẪN GIẶT ỦI:
        - Giặt ở nhiệt độ thường.
        - Không sử dụng chất tẩy mạnh.
        - Lộn trái khi phơi để giữ màu bền lâu.`,
        categoryId: shirtCategoryId,
        brandId: brandIdNike,
        stock: 100,
        rating: 4.5,
        numReviews: 45,
        isFeatured: true,
        image: '/uploads/shirt-green.jpg',
        images: JSON.stringify(['/uploads/shirt-back.jpg', '/uploads/shirt-model.jpg']),
        attributes: JSON.stringify([
          { name: 'Size', options: ['Small', 'Medium', 'Large', 'X-Large'] },
          { name: 'Màu sắc', options: ['Olive', 'Đen', 'Xanh'] }
        ]),
        variants: JSON.stringify([
          { sku: 'SHIRT-OLIVE-S', price: 260000, stock: 20, attributes: { 'Size': 'Small', 'Màu sắc': 'Olive' } },
          { sku: 'SHIRT-BLACK-S', price: 280000, stock: 15, attributes: { 'Size': 'Small', 'Màu sắc': 'Đen' } }
        ])
      }
    ];

    for (const p of products) {
      await conn.execute(
        `INSERT INTO product (name, price, originalPrice, description, categoryId, brandId, stock, rating, numReviews, isFeatured, image, images, attributes, variants, userId, isArchived, soldCount, viewCount) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
        [p.name, p.price, p.originalPrice, p.description, p.categoryId, p.brandId, p.stock, p.rating, p.numReviews, p.isFeatured, p.image, p.images, p.attributes, p.variants || null, adminUser.id]
      );
    }

    console.log('🎉 Seeded 2 beautiful products with variants!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
}

seed();

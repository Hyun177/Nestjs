const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

async function testComplete() {
  console.log('🧪 Complete System Test\n');
  
  // 1. Test Environment Variables
  console.log('1️⃣ Environment Variables:');
  console.log(`✅ DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : '❌ Missing'}`);
  console.log(`✅ CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ Missing'}`);
  console.log(`✅ MAIL_HOST: ${process.env.MAIL_HOST || '❌ Missing'}`);
  console.log(`✅ FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
  console.log(`✅ BASE_URL: ${process.env.BASE_URL || '❌ Missing'}`);
  
  // 2. Test Cloudinary Connection
  console.log('\n2️⃣ Cloudinary Connection:');
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful');
    console.log(`   Rate limit: ${result.rate_limit_remaining}/${result.rate_limit_allowed}`);
  } catch (error) {
    console.log('❌ Cloudinary connection failed:', error.message);
  }
  
  // 3. Test Image URL Generation
  console.log('\n3️⃣ Image URL Generation:');
  const testPaths = [
    '/uploads/test.jpg',
    'https://res.cloudinary.com/dpzhjnldx/image/upload/v123/test.jpg',
    null,
    undefined,
    ''
  ];
  
  testPaths.forEach(path => {
    let result;
    if (!path) {
      result = 'https://via.placeholder.com/300x200?text=No+Image';
    } else if (path.startsWith('http')) {
      result = path;
    } else {
      const baseUrl = process.env.BASE_URL || 'https://nestjs-zvmg.onrender.com';
      result = `${baseUrl}${path}`;
    }
    console.log(`   Input: ${path || 'null/undefined'}`);
    console.log(`   Output: ${result}`);
    console.log('   ---');
  });
  
  // 4. Test URLs
  console.log('4️⃣ Expected URLs:');
  console.log(`   Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`   Backend: ${process.env.BASE_URL}`);
  console.log(`   Cloudinary: https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}`);
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Deployment Checklist:');
  console.log('   □ Set all environment variables on Render');
  console.log('   □ Deploy backend with latest changes');
  console.log('   □ Deploy frontend with ImageService');
  console.log('   □ Test image loading');
  console.log('   □ Test email sending');
}

testComplete().catch(console.error);
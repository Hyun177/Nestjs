const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  try {
    console.log('Testing Cloudinary upload...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    
    // Test upload with a sample image URL
    const result = await cloudinary.uploader.upload(
      'https://via.placeholder.com/300x200.png',
      {
        folder: 'nestjs-uploads',
        use_filename: true,
        unique_filename: true,
      }
    );
    
    console.log('✅ Upload successful!');
    console.log('Public ID:', result.public_id);
    console.log('Secure URL:', result.secure_url);
    console.log('URL:', result.url);
    console.log('Format:', result.format);
    console.log('Resource Type:', result.resource_type);
    
    // Test if URL is accessible
    const fetch = require('node-fetch');
    const response = await fetch(result.secure_url);
    console.log('URL accessible:', response.ok ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

testUpload();
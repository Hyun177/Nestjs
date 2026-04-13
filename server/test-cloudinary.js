const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  try {
    console.log('Testing Cloudinary connection...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    
    // Test API connection
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    
    // Test upload with a simple text file
    const uploadResult = await cloudinary.uploader.upload_stream(
      { resource_type: 'raw', public_id: 'test_connection' },
      (error, result) => {
        if (error) {
          console.error('❌ Upload test failed:', error);
        } else {
          console.log('✅ Upload test successful:', result.secure_url);
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    console.log('Will use local storage fallback');
  }
}

testCloudinary();
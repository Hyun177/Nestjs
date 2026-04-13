const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugImages() {
  try {
    console.log('🔍 Debugging image URLs...\n');
    
    // Get some products with images
    const products = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        image: true,
      }
    });
    
    console.log('📦 Sample products:');
    products.forEach(product => {
      console.log(`ID: ${product.id}`);
      console.log(`Name: ${product.name}`);
      console.log(`Image: ${product.image}`);
      
      // Check if it's a full URL or relative path
      if (product.image) {
        const isFullUrl = product.image.startsWith('http');
        console.log(`Type: ${isFullUrl ? 'Full URL' : 'Relative path'}`);
        
        if (!isFullUrl) {
          console.log(`Full URL would be: https://nestjs-zvmg.onrender.com${product.image}`);
        }
      }
      console.log('---');
    });
    
    // Check environment
    console.log('\n🌍 Environment:');
    console.log(`BASE_URL: ${process.env.BASE_URL}`);
    console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugImages();
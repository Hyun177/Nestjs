import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse, LocalUploadResponse } from './cloudinary-response';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  private isCloudinaryConfigured(): boolean {
    const configured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!configured) {
      console.warn('Cloudinary not configured - missing env vars');
    } else {
      console.log(
        'Cloudinary configured with cloud:',
        process.env.CLOUDINARY_CLOUD_NAME,
      );
    }

    return configured;
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<CloudinaryResponse | LocalUploadResponse> {
    // Nếu Cloudinary không được cấu hình, sử dụng local storage
    if (!this.isCloudinaryConfigured()) {
      console.warn('Cloudinary not configured, using local storage fallback');
      return this.uploadToLocal(file);
    }

    try {
      console.log('Uploading to Cloudinary:', file.originalname);

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'nestjs-uploads',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload failed:', error);
              // Fallback to local storage
              this.uploadToLocal(file).then(resolve).catch(reject);
              return;
            }
            if (!result) {
              console.error('Cloudinary upload failed: No result');
              this.uploadToLocal(file).then(resolve).catch(reject);
              return;
            }

            console.log('Cloudinary upload successful:', result.secure_url);
            resolve(result);
          },
        );
        Readable.from(file.buffer).pipe(uploadStream);
      });
    } catch (error) {
      console.error('Cloudinary error, falling back to local storage:', error);
      return this.uploadToLocal(file);
    }
  }

  private uploadToLocal(
    file: Express.Multer.File,
  ): Promise<LocalUploadResponse> {
    try {
      console.log('Using local storage fallback for:', file.originalname);

      // Tạo thư mục uploads nếu chưa có
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Tạo tên file unique
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${randomString}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Lưu file
      fs.writeFileSync(filePath, file.buffer);

      // Trả về format giống Cloudinary
      const baseUrl =
        process.env.BASE_URL || 'https://nestjs-zvmg.onrender.com';
      const publicUrl = `${baseUrl}/uploads/${fileName}`;

      console.log('Local upload successful:', publicUrl);

      return Promise.resolve({
        public_id: fileName.replace(fileExtension, ''),
        secure_url: publicUrl,
        url: publicUrl,
        format: fileExtension.replace('.', ''),
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
        bytes: file.size,
        width: undefined,
        height: undefined,
        created_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Local upload failed: ${message}`);
    }
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly baseUrl = 'https://nestjs-zvmg.onrender.com';
  private readonly localUrl = 'http://localhost:3000';

  constructor() {}

  /**
   * Get full image URL - handles both Cloudinary and local URLs
   */
  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return this.getPlaceholderUrl();
    }

    // If already a full URL (Cloudinary or external), return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // If relative path, prepend base URL
    const baseUrl = this.isLocalDevelopment() ? this.localUrl : this.baseUrl;
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Get placeholder image URL
   */
  getPlaceholderUrl(): string {
    return 'https://via.placeholder.com/300x200?text=No+Image';
  }

  /**
   * Check if running in local development
   */
  private isLocalDevelopment(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * Preload image to check if it exists
   */
  async checkImageExists(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Get image URL with fallback to placeholder if image doesn't exist
   */
  async getImageUrlWithFallback(imagePath: string | null | undefined): Promise<string> {
    const url = this.getImageUrl(imagePath);
    
    if (url === this.getPlaceholderUrl()) {
      return url;
    }

    const exists = await this.checkImageExists(url);
    return exists ? url : this.getPlaceholderUrl();
  }
}
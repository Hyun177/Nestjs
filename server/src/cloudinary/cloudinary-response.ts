import { UploadApiResponse } from 'cloudinary';

export type CloudinaryResponse = UploadApiResponse;

// Simple interface for local uploads
export interface LocalUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at: string;
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface FileUploadResult {
  filename: string;
  path: string;
  url: string;
  size: number;
}

@Injectable()
export class FileUploadService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    // Use /var/data on production (Render), ./uploads locally
    const isProduction = process.env.NODE_ENV === 'production';
    this.uploadDir = isProduction
      ? '/var/data/uploads'
      : path.join(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(
    buffer: Buffer,
    filename: string,
    subfolder?: string,
  ): FileUploadResult {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const uniqueFilename = `${name}-${timestamp}${ext}`;

    // Create subdirectory if specified
    const folder = subfolder
      ? path.join(this.uploadDir, subfolder)
      : this.uploadDir;
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    // Save file
    const filePath = path.join(folder, uniqueFilename);
    fs.writeFileSync(filePath, buffer);

    // Generate URL (adjust based on your API domain)
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const relativePath = subfolder
      ? `/uploads/${subfolder}/${uniqueFilename}`
      : `/uploads/${uniqueFilename}`;
    const url = `${apiUrl}${relativePath}`;

    return {
      filename: uniqueFilename,
      path: filePath,
      url,
      size: buffer.length,
    };
  }

  deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }
}

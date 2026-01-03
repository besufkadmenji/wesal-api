import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface FileUploadResult {
  filename: string;
  path: string;
  url: string;
  size: number;
}

@Injectable()
export class FileUploadService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private endpoint?: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'wesal');
    this.region = this.configService.get<string>('S3_REGION', 'auto');
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.s3Client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint }),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  async saveFile(
    buffer: Buffer,
    filename: string,
    subfolder?: string,
  ): Promise<FileUploadResult> {
    // Create unique filename using UUID to prevent file collisions
    const ext = path.extname(filename);
    const uniqueFilename = `${uuidv4()}${ext}`;

    // Build S3 key with optional subfolder
    const s3Key = subfolder ? `${subfolder}/${uniqueFilename}` : uniqueFilename;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: buffer,
    });

    try {
      await this.s3Client.send(putCommand);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }

    // Generate S3 URL
    const baseUrl = this.endpoint ? this.endpoint.replace(/\/$/, '') : ``;
    const url = `${baseUrl}/${s3Key}`;

    return {
      filename: uniqueFilename,
      path: s3Key,
      url,
      size: buffer.length,
    };
  }

  deleteFile(s3Key: string): boolean {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.s3Client.send(deleteCommand);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  getUploadDir(): string {
    return `s3://${this.bucket}`;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
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
  /**
   * Temporary, for local development: with no S3 credentials configured,
   * files are kept on disk under `uploads/` instead of failing every upload.
   */
  private localDir: string | null;

  constructor(private configService: ConfigService) {
    this.localDir = this.configService.get<string>('S3_ACCESS_KEY')
      ? null
      : path.resolve(
          this.configService.get<string>(
            'UPLOAD_DIR',
            path.join(process.cwd(), 'uploads'),
          ),
        );
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
    const uniqueFilename = `${randomUUID()}${ext}`;

    // Build S3 key with optional subfolder
    const s3Key = subfolder ? `${subfolder}/${uniqueFilename}` : uniqueFilename;

    if (this.localDir) {
      const target = this.localPath(s3Key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, buffer);
      return {
        filename: uniqueFilename,
        path: s3Key,
        url: `/files/${s3Key}`,
        size: buffer.length,
      };
    }

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

  async getFile(s3Key: string): Promise<Buffer> {
    if (this.localDir) return this.readLocal(s3Key);
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(getCommand);
      // Convert stream to buffer
      if (!response.Body) {
        throw new Error('File body is empty');
      }
      const chunks: Buffer[] = [];
      const stream = response.Body as unknown as NodeJS.ReadableStream;
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error fetching file from S3:', error);
      throw error;
    }
  }

  deleteFile(s3Key: string): boolean {
    if (this.localDir) {
      unlink(this.localPath(s3Key)).catch(() => undefined);
      return true;
    }
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

  async getFileWithMetadata(
    s3Key: string,
  ): Promise<{ buffer: Buffer; contentType?: string }> {
    if (this.localDir) return { buffer: await this.readLocal(s3Key) };
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(getCommand);

      if (!response.Body) {
        throw new Error('File body is empty');
      }

      const chunks: Buffer[] = [];
      const stream = response.Body as unknown as NodeJS.ReadableStream;

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      return {
        buffer,
        contentType: response.ContentType,
      };
    } catch (error) {
      console.error('Error fetching file with metadata from S3:', error);
      throw error;
    }
  }

  async getFileStream(
    s3Key: string,
    range?: { start: number; end: number },
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength: number;
    contentRange?: string;
  }> {
    if (this.localDir) {
      const target = this.localPath(s3Key);
      const { size } = await this.statLocal(target);
      return {
        stream: createReadStream(target, range),
        contentLength: range ? range.end - range.start + 1 : size,
        contentRange: range
          ? `bytes ${range.start}-${range.end}/${size}`
          : undefined,
      };
    }
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ...(range && { Range: `bytes=${range.start}-${range.end}` }),
    });

    try {
      const response = await this.s3Client.send(getCommand);

      if (!response.Body) {
        throw new Error('File body is empty');
      }

      return {
        stream: response.Body as unknown as NodeJS.ReadableStream,
        contentType: response.ContentType,
        contentLength: response.ContentLength ?? 0,
        contentRange: response.ContentRange,
      };
    } catch (error) {
      console.error('Error fetching file stream from S3:', error);
      throw error;
    }
  }

  async getFileMetadata(
    s3Key: string,
  ): Promise<{ contentType?: string; contentLength: number }> {
    if (this.localDir) {
      const { size } = await this.statLocal(this.localPath(s3Key));
      return { contentLength: size };
    }
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(getCommand);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength ?? 0,
      };
    } catch (error) {
      console.error('Error fetching file metadata from S3:', error);
      throw error;
    }
  }

  getUploadDir(): string {
    return this.localDir ?? `s3://${this.bucket}`;
  }

  /** Keys stay inside the upload folder (no `../` escapes). */
  private localPath(key: string): string {
    const root = this.localDir!;
    const target = path.resolve(root, key);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error('NoSuchKey: invalid file path');
    }
    return target;
  }

  private async readLocal(key: string): Promise<Buffer> {
    try {
      return await readFile(this.localPath(key));
    } catch {
      // Same wording as S3 so callers answer 404.
      throw new Error(`NoSuchKey: ${key}`);
    }
  }

  private async statLocal(target: string) {
    try {
      return await stat(target);
    } catch {
      throw new Error(`NoSuchKey: ${path.basename(target)}`);
    }
  }
}

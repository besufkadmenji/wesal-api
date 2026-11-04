import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { FileUploadService } from './file-upload.service';

describe('FileUploadService without S3 credentials (local disk)', () => {
  let dir: string;
  let service: FileUploadService;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'wesal-uploads-'));
    const env: Record<string, string> = { UPLOAD_DIR: dir };
    const config = {
      get: (key: string, fallback?: string) => env[key] ?? fallback,
    };
    service = new FileUploadService(config as never);
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('saves to disk and reads the file back', async () => {
    const saved = await service.saveFile(Buffer.from('photo'), 'ad.jpg');
    expect(saved.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(service.getUploadDir()).toBe(dir);
    expect((await service.getFile(saved.path)).toString()).toBe('photo');
    const { buffer } = await service.getFileWithMetadata(saved.path);
    expect(buffer.toString()).toBe('photo');
  });

  it('reports a missing file the way S3 does, so routes answer 404', async () => {
    await expect(service.getFile('missing.jpg')).rejects.toThrow('NoSuchKey');
  });

  it('refuses keys that leave the upload folder', async () => {
    await expect(service.getFile('../../etc/passwd')).rejects.toThrow(
      'NoSuchKey',
    );
  });
});

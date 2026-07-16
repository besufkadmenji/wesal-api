/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CsvExportService } from './csv-export.service';
import type { Response } from 'express';

describe('CsvExportService - Sensitive Field Protection', () => {
  let service: CsvExportService;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    service = new CsvExportService();
    mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('Recursive Sensitive Field Removal', () => {
    it('should remove password from top-level fields', () => {
      const data = [
        {
          id: '1',
          name: 'User 1',
          password: 'secret123',
          email: 'user@example.com',
        },
      ];

      service.exportToCsv(data, 'test', mockResponse as Response);

      const sentData = (mockResponse.send as jest.Mock).mock
        .calls[0][0] as unknown;
      expect(sentData).not.toContain('password');
      expect(sentData).not.toContain('secret123');
      expect(sentData).toContain('User 1');
      expect(sentData).toContain('user@example.com');
    });

    it('should remove password from nested provider object', () => {
      const data = [
        {
          id: '1',
          providerId: '123',
          provider: {
            id: '123',
            name: 'Provider Name',
            password: 'secretpassword',
            email: 'provider@example.com',
          },
          signedAt: new Date('2024-01-01'),
        },
      ];

      service.exportToCsv(data, 'test', mockResponse as Response);

      const sentData = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentData).not.toContain('password');
      expect(sentData).not.toContain('secretpassword');
      expect(sentData).toContain('Provider Name');
    });

    it('should remove all sensitive token fields', () => {
      const data = [
        {
          id: '1',
          name: 'User',
          password: 'secret',
          refreshToken: 'refresh_token_123',
          accessToken: 'access_token_456',
          apiKey: 'api_key_789',
          resetToken: 'reset_token_abc',
        },
      ];

      service.exportToCsv(data, 'test', mockResponse as Response);

      const sentData = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentData).not.toContain('password');
      expect(sentData).not.toContain('refreshToken');
      expect(sentData).not.toContain('accessToken');
      expect(sentData).not.toContain('apiKey');
      expect(sentData).not.toContain('resetToken');
      expect(sentData).toContain('User');
    });

    it('should handle deeply nested sensitive fields', () => {
      const data = [
        {
          id: '1',
          contract: {
            provider: {
              user: {
                name: 'John',
                password: 'hidden',
              },
            },
          },
        },
      ];

      service.exportToCsv(data, 'test', mockResponse as Response);

      const sentData = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentData).not.toContain('password');
      expect(sentData).not.toContain('hidden');
      expect(sentData).toContain('John');
    });

    it('should handle arrays with sensitive data', () => {
      const data = [
        {
          id: '1',
          users: [
            { name: 'User 1', password: 'pass1' },
            { name: 'User 2', password: 'pass2' },
          ],
        },
      ];

      service.exportToCsv(data, 'test', mockResponse as Response);

      const sentData = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentData).not.toContain('password');
      expect(sentData).not.toContain('pass1');
      expect(sentData).not.toContain('pass2');
    });
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Readable } from 'stream';
import { ComplaintService } from './complaint.service';
import { ComplaintStatus } from './enums/complaint-status.enum';
import { ComplaintMessageAuthorType } from './enums/complaint-message-author-type.enum';
import { AdminPermissionType } from '../admin/enums/admin-permission-type.enum';

describe('ComplaintService', () => {
  const complaintRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const messageRepository = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const conversationRepository = { findOne: jest.fn() };
  const contractRepository = { findOne: jest.fn() };
  const fileUploadService = { saveFile: jest.fn() };
  const service = new ComplaintService(
    complaintRepository as never,
    messageRepository as never,
    conversationRepository as never,
    contractRepository as never,
    fileUploadService as never,
  );
  const principal = {
    sub: 'customer-id',
    email: 'customer@example.com',
    type: 'user' as const,
  };
  const input = {
    conversationId: 'conversation-id',
    title: 'Provider issue',
    description: 'The provider did not follow the agreed terms.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    conversationRepository.findOne.mockResolvedValue({
      id: input.conversationId,
      userId: principal.sub,
      providerId: 'provider-id',
      listingId: 'listing-id',
    });
  });

  it('enforces one complaint per reporter and conversation', async () => {
    complaintRepository.findOne.mockResolvedValue({ id: 'existing-id' });

    await expect(service.create(input, undefined, principal)).rejects.toThrow(
      'already submitted',
    );
    expect(complaintRepository.save).not.toHaveBeenCalled();
  });

  it('rejects evidence whose MIME is not PNG or JPEG', async () => {
    complaintRepository.findOne.mockResolvedValue(null);
    const upload = Promise.resolve({
      filename: 'evidence.gif',
      mimetype: 'image/gif',
      encoding: '7bit',
      createReadStream: () => Readable.from(Buffer.from('GIF89a')),
    });

    await expect(
      service.create(input, [upload as never], principal),
    ).rejects.toThrow('PNG or JPEG');
    expect(fileUploadService.saveFile).not.toHaveBeenCalled();
  });

  it('rejects a cross-user complaint before checking duplicates', async () => {
    conversationRepository.findOne.mockResolvedValue({
      id: input.conversationId,
      userId: 'another-customer',
      providerId: 'provider-id',
      listingId: 'listing-id',
    });

    await expect(service.create(input, undefined, principal)).rejects.toThrow(
      'Unauthorized complaint access',
    );
    expect(complaintRepository.findOne).not.toHaveBeenCalled();
  });

  it('derives the complaint reviewer and thread author from the admin token', async () => {
    const complaint = {
      id: 'complaint-id',
      status: ComplaintStatus.PENDING,
      reviewedByAdminId: null,
      reviewedAt: null,
    };
    complaintRepository.findOne.mockResolvedValue(complaint);

    const message = await service.addAdminMessage(
      complaint.id,
      'We are reviewing this complaint.',
      {
        sub: 'admin-id',
        email: 'admin@example.com',
        permissionType: AdminPermissionType.MODERATOR,
      },
    );

    expect(complaint).toMatchObject({
      status: ComplaintStatus.UNDER_REVIEW,
      reviewedByAdminId: 'admin-id',
    });
    expect(messageRepository.create).toHaveBeenCalledWith({
      complaintId: complaint.id,
      authorId: 'admin-id',
      authorType: ComplaintMessageAuthorType.ADMIN,
      content: 'We are reviewing this complaint.',
    });
    expect(message).toMatchObject({ authorId: 'admin-id' });
  });
});

import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send } })),
}));
jest.mock('@react-email/components', () => ({
  render: jest.fn(() => Promise.resolve('<p>email</p>')),
}));

const service = (env: Record<string, string | undefined>) =>
  new EmailService({
    get: (key: string) => env[key],
    getOrThrow: (key: string) => env[key] ?? 'value',
  } as unknown as ConfigService);

/** H-31: no hard-coded blind copy; EMAIL_BCC opts in. */
describe('EmailService BCC', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ error: null });
  });

  it('sends no BCC by default', async () => {
    await service({}).sendContractTerminationEmail('p@x.test', 'r', 'en');
    const [message] = send.mock.calls[0] as [Record<string, unknown>];
    expect(message).not.toHaveProperty('bcc');
  });

  it('copies EMAIL_BCC addresses when set', async () => {
    await service({
      EMAIL_BCC: ' ops@wesal.test, audit@wesal.test ',
    }).sendContractTerminationEmail('p@x.test', 'r', 'en');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: ['ops@wesal.test', 'audit@wesal.test'],
      }),
    );
  });
});

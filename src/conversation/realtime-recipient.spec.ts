import { isMessagePayloadParticipant } from './message.resolver';
import { ConversationSenderType } from './enums/sender-type.enum';
import { isNotificationPayloadRecipient } from '../notification/notification.resolver';
import { NotificationRecipientType } from '../notification/enums/notification-recipient-type.enum';

describe('participant realtime recipient filters', () => {
  const user = {
    sub: 'b035c9de-e143-4f30-b3ef-0fe8aadf9223',
    email: 'user@example.com',
    type: 'user' as const,
  };
  const provider = {
    sub: '766aa2a9-592a-4a2a-9714-aa3b92ba64b9',
    email: 'provider@example.com',
    type: 'provider' as const,
  };

  it('delivers a message only to participants with the matching role', () => {
    const payload = {
      messageAdded: {} as never,
      participants: [
        { id: user.sub, type: ConversationSenderType.USER },
        { id: provider.sub, type: ConversationSenderType.PROVIDER },
      ],
    };

    expect(isMessagePayloadParticipant(payload, user)).toBe(true);
    expect(isMessagePayloadParticipant(payload, provider)).toBe(true);
    expect(
      isMessagePayloadParticipant(payload, {
        ...user,
        sub: provider.sub,
      }),
    ).toBe(false);
  });

  it('delivers a notification only to its recipient and role', () => {
    const payload = {
      notificationAdded: {
        recipientId: user.sub,
        recipientType: NotificationRecipientType.USER,
      } as never,
    };

    expect(isNotificationPayloadRecipient(payload, user)).toBe(true);
    expect(isNotificationPayloadRecipient(payload, provider)).toBe(false);
    expect(
      isNotificationPayloadRecipient(payload, {
        ...provider,
        sub: user.sub,
      }),
    ).toBe(false);
  });
});

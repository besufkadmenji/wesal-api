import { registerEnumType } from '@nestjs/graphql';

/**
 * Discriminator for a message sender / conversation participant.
 * A conversation is between one customer (User) and one Provider, so the
 * acting party is identified by both its id and which entity it is.
 */
export enum ConversationSenderType {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  SYSTEM = 'SYSTEM',
}

registerEnumType(ConversationSenderType, {
  name: 'ConversationSenderType',
  description: 'Whether a message sender is a User, Provider, or the platform',
});

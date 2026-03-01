import { InputType, OmitType } from '@nestjs/graphql';
import { UpdateUserInput } from './update-user.input';

/**
 * Input for self-service profile updates.
 * The `id` field is omitted because the authenticated user's
 * own ID is derived from the JWT token in the resolver.
 */
@InputType()
export class UpdateMeInput extends OmitType(UpdateUserInput, ['id'] as const) {}

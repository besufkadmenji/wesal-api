import { Field, ObjectType } from '@nestjs/graphql';
import { Provider } from '../../provider/entities/provider.entity';

@ObjectType()
export class ProviderAuthResponse {
  @Field()
  accessToken: string;

  @Field(() => Provider)
  provider: Provider;
}

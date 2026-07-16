import { Test, TestingModule } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { lexicographicSortSchema, printSchema } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ConversationResolver } from './conversation/conversation.resolver';
import { MessageResolver } from './conversation/message.resolver';
import { ContractResolver } from './contract/contract.resolver';
import { PaymentResolver } from './payment/payment.resolver';

describe('public transaction GraphQL schema', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('exposes intent-based operations and omits unsafe generic mutations', async () => {
    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create(
      [
        ConversationResolver,
        MessageResolver,
        ContractResolver,
        PaymentResolver,
      ],
      {
        scalarsMap: [{ type: () => Object, scalar: GraphQLJSON }],
      },
    );
    const sdl = printSchema(lexicographicSortSchema(schema));

    expect(sdl).toContain(
      'createConversation(input: CreateConversationInput!)',
    );
    expect(sdl).toContain('markConversationRead(conversationId: String!)');
    expect(sdl).toContain('contractQuote(input: ContractQuoteInput!)');
    expect(sdl).toContain('acceptContract(input: AcceptContractInput!)');
    expect(sdl).toContain('rejectContract(input: RejectContractInput!)');
    expect(sdl).toContain('resendContract(input: ResendContractInput!)');
    expect(sdl).toContain('payContract(contractId: String!)');
    expect(sdl).toContain('payConversationFee(conversationId: String!)');

    for (const removedMutation of [
      'updateConversation',
      'removeConversation',
      'updateMessage',
      'removeMessage',
      'updateContract',
      'removeContract',
      'createPayment',
      'updatePayment',
      'removePayment',
      'refundPayment',
    ]) {
      expect(sdl).not.toContain(`${removedMutation}(`);
    }
  });
});

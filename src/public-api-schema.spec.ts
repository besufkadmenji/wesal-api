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
import { FavoriteResolver } from './favorite/favorite.resolver';
import { ComplaintResolver } from './complaint/complaint.resolver';
import { ListingResolver } from './listing/listing.resolver';
import { ReportResolver } from './report/report.resolver';
import { ProviderResolver } from './provider/provider.resolver';
import { NotificationResolver } from './notification/notification.resolver';

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
        FavoriteResolver,
        ComplaintResolver,
        ListingResolver,
        ReportResolver,
        ProviderResolver,
        NotificationResolver,
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
    expect(sdl).toContain('restartConversation(conversationId: String!)');
    expect(sdl).toContain('conversationStats: ConversationStats!');
    expect(sdl).toContain('participantMessageAdded: Message!');
    expect(sdl).toContain('notificationAdded: Notification!');
    expect(sdl).toContain('contractQuote(input: ContractQuoteInput!)');
    expect(sdl).toContain('acceptContract(input: AcceptContractInput!)');
    expect(sdl).toContain('rejectContract(input: RejectContractInput!)');
    expect(sdl).toContain('completeContract(input: CompleteContractInput!)');
    expect(sdl).toContain(
      'providerCompleteContract(input: ProviderCompleteContractInput!)',
    );
    expect(sdl).toContain(
      'requestContractCancellation(input: CancelContractInput!)',
    );
    expect(sdl).toContain(
      'refuseContractDelivery(input: RefuseDeliveryInput!)',
    );
    expect(sdl).toContain(
      'adminResolveContract(input: AdminResolveContractInput!)',
    );
    expect(sdl).toContain('resendContract(input: ResendContractInput!)');
    expect(sdl).toContain('payContract(contractId: String!)');
    expect(sdl).toContain('payConversationFee(conversationId: String!)');
    expect(sdl).not.toContain('payPremiumAd(');
    expect(sdl).toContain(
      'setProviderFavorite(favorite: Boolean!, providerId: String!)',
    );
    expect(sdl).toContain('myFavoriteProviders(');
    expect(sdl).toContain('isProviderFavorite(providerId: String!)');
    expect(sdl).not.toContain('requestFeaturedPromotion(');
    expect(sdl).toContain('myListing(id: ID!): Listing!');
    expect(sdl).toContain('removeProviderAvatar: Boolean!');
    expect(sdl).not.toContain('removeProviderAvatar(id:');
    expect(sdl).toContain('createComplaint(');
    expect(sdl).toContain('myComplaints(');
    expect(sdl).toContain('adminComplaints(');
    expect(sdl).toContain('conversationFeeReport(');
    expect(sdl).toContain('premiumAdFeeReport(');
    expect(sdl).toContain('contractFinancialReport(');

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
      'createFavorite',
      'updateFavorite',
      'removeFavorite',
      'updateComplaint',
      'removeComplaint',
      'reviewComplaint',
    ]) {
      expect(sdl).not.toContain(`${removedMutation}(`);
    }
  });
});

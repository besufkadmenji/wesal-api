export const OPERATIONS = {
  preflight: `
    query DemoSeedPreflight {
      getSetting {
        platformManagerName
        platformManagerSignature
        contractAcceptanceWindowEnabled
        contractAcceptanceWindowDays
      }
      categories(input: { page: 1, limit: 100, status: ACTIVE, sortOrder: ASC }) {
        items { id publicId nameEn nameAr status }
        meta { total }
      }
      cities(pagination: { page: 1, limit: 100, status: ACTIVE, sortOrder: ASC }) {
        items { id countryId nameEn nameAr status }
        meta { total }
      }
    }
  `,
  adminLogin: `
    mutation DemoSeedAdminLogin($input: AdminLoginInput!) {
      adminLogin(input: $input) { accessToken admin { id email status } }
    }
  `,
  providers: `
    query DemoSeedProviders($pagination: ProviderPaginationInput!) {
      providers(pagination: $pagination) {
        items {
          id email phone emailVerified phoneVerified status avatarFilename
          signedContract { status }
        }
        meta { total }
      }
    }
  `,
  providerByEmail: `
    query DemoSeedProviderByEmail($email: String!) {
      providerByEmail(email: $email) {
        id email phone emailVerified phoneVerified status avatarFilename
        signedContract { status }
      }
    }
  `,
  users: `
    query DemoSeedUsers($pagination: UserPaginationInput!) {
      users(pagination: $pagination) {
        items { id email phone emailVerified phoneVerified status avatarFilename }
        meta { total }
      }
    }
  `,
  registerProvider: `
    mutation DemoSeedRegisterProvider($input: RegisterProviderInput!) {
      registerProvider(input: $input) {
        id email phone emailVerified phoneVerified status avatarFilename
      }
    }
  `,
  verifyProviderOtp: `
    mutation DemoSeedVerifyProviderOtp($input: VerifyOtpInput!) {
      verifyProviderOtp(input: $input)
    }
  `,
  activateProvider: `
    mutation DemoSeedActivateProvider($id: ID!) {
      activateProvider(id: $id) { id status emailVerified phoneVerified }
    }
  `,
  loginProvider: `
    mutation DemoSeedLoginProvider($input: LoginProviderInput!) {
      loginProvider(input: $input) {
        accessToken
        provider {
          id email phone emailVerified phoneVerified status avatarFilename
          signedContract { status }
        }
      }
    }
  `,
  updateProvider: `
    mutation DemoSeedUpdateProvider($input: UpdateProviderInput!) {
      updateProvider(updateProviderInput: $input) { id avatarFilename }
    }
  `,
  signContract: `
    mutation DemoSeedSignContract($input: SignContractInput!) {
      signProviderContract(input: $input) {
        id signedContract { id status serviceProviderSignature }
      }
    }
  `,
  registerUser: `
    mutation DemoSeedRegisterUser($input: RegisterInput!) {
      register(input: $input) {
        id email phone emailVerified phoneVerified status avatarFilename
      }
    }
  `,
  verifyUserOtp: `
    mutation DemoSeedVerifyUserOtp($input: VerifyOtpInput!) {
      verifyOtp(input: $input)
    }
  `,
  loginUser: `
    mutation DemoSeedLoginUser($input: LoginInput!) {
      login(input: $input) {
        accessToken
        user { id email phone emailVerified phoneVerified status avatarFilename }
      }
    }
  `,
  updateUser: `
    mutation DemoSeedUpdateUser($input: UpdateMeInput!) {
      updateMe(updateMeInput: $input) { id avatarFilename }
    }
  `,
  myListings: `
    query DemoSeedMyListings($input: ListingPaginationInput!) {
      myListings(paginationInput: $input) {
        items {
          id providerId categoryId name description
          photos { id filename originalFilename size sortOrder type }
        }
        meta { page total totalPages hasNext }
      }
    }
  `,
  createListing: `
    mutation DemoSeedCreateListing($input: CreateListingInput!) {
      createListing(createListingInput: $input) {
        id providerId categoryId name description
        photos { id filename originalFilename size sortOrder type }
      }
    }
  `,
  conversations: `
    query DemoSeedConversations($input: ConversationPaginationInput) {
      conversations(input: $input) {
        items {
          id listingId providerId userId
          access { feeRequired canSend paidAt }
        }
        meta { total }
      }
    }
  `,
  conversation: `
    query DemoSeedConversation($id: String!) {
      conversation(id: $id) {
        id listingId providerId userId
        access { feeRequired canSend paidAt }
      }
    }
  `,
  createConversation: `
    mutation DemoSeedCreateConversation($input: CreateConversationInput!) {
      createConversation(input: $input) {
        id listingId providerId userId
        access { feeRequired canSend paidAt }
      }
    }
  `,
  payConversationFee: `
    mutation DemoSeedPayConversationFee($conversationId: String!) {
      payConversationFee(conversationId: $conversationId) {
        conversation { id }
        access { feeRequired canSend paidAt }
      }
    }
  `,
  messages: `
    query DemoSeedMessages($input: MessagePaginationInput) {
      messages(input: $input) {
        items { id conversationId senderId senderType content createdAt }
        meta { total }
      }
    }
  `,
  createMessage: `
    mutation DemoSeedCreateMessage($input: CreateMessageInput!) {
      createMessage(input: $input) {
        id conversationId senderId senderType content createdAt
      }
    }
  `,
  messageAdded: `
    subscription DemoSeedMessageAdded($conversationId: String!) {
      messageAdded(conversationId: $conversationId) {
        id conversationId senderId senderType content createdAt
      }
    }
  `,
} as const;

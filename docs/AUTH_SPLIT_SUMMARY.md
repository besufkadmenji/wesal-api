# Authentication Split: User vs Provider

## Overview
Successfully split authentication into separate flows for **Users** (clients) and **Providers** (service providers). No role-based checking - completely separate entities and endpoints.

## What Changed

### 1. Separate Entities
- **User**: Regular clients who use services
- **Provider**: Service providers who offer services
- No shared `role` field - completely independent entities

### 2. Authentication Services

#### UserAuth (existing - updated)
- **Service**: `AuthService` ([src/auth/auth.service.ts](../src/auth/auth.service.ts))
- **Resolver**: `AuthResolver` ([src/auth/auth.resolver.ts](../src/auth/auth.resolver.ts))
- **Mutations**:
  - `register` - User registration
  - `login` - User login
  - `verifyOtp` - Verify user email/phone
  - `forgotPassword`, `resetPassword` - Password recovery
  - `changeEmail`, `changePhone`, `changePassword` - Account management

#### ProviderAuth (new)
- **Service**: `ProviderAuthService` ([src/auth/provider-auth.service.ts](../src/auth/provider-auth.service.ts))
- **Resolver**: `ProviderAuthResolver` ([src/auth/provider-auth.resolver.ts](../src/auth/provider-auth.resolver.ts))
- **Mutations**:
  - `registerProvider` - Provider registration
  - `loginProvider` - Provider login
  - `verifyProviderOtp` - Verify provider email/phone
  - `forgotProviderPassword`, `resetProviderPassword` - Password recovery
  - `changeProviderEmail`, `changeProviderPhone`, `changeProviderPassword` - Account management

### 3. Registration DTOs

#### User Registration ([src/auth/dto/register.input.ts](../src/auth/dto/register.input.ts))
```graphql
input RegisterInput {
  name: String!
  email: String!
  password: String!
  dialCode: String
  phone: String!
  avatarFilename: String
  cityId: String
  countryId: String
}
```

#### Provider Registration ([src/auth/dto/register-provider.input.ts](../src/auth/dto/register-provider.input.ts))
```graphql
input RegisterProviderInput {
  name: String!
  email: String!
  password: String!
  dialCode: String
  phone: String!
  
  # Provider-specific required fields
  commercialName: String!
  commercialRegistrationNumber: String!
  
  # Optional provider fields
  avatarFilename: String
  categoryIds: [String!]
  bankName: String
  ibanNumber: String
  commercialRegistrationFilename: String
  address: String
  latitude: Float
  longitude: Float
  cityId: String
  countryId: String
}
```

### 4. JWT Token Differentiation
Tokens include a `type` field to distinguish between user and provider:

**User Token:**
```typescript
{
  sub: userId,
  email: user.email,
  type: 'user'
}
```

**Provider Token:**
```typescript
{
  sub: providerId,
  email: provider.email,
  type: 'provider'
}
```

### 5. Provider Status Workflow
Providers go through an approval process:
1. **PENDING_APPROVAL** - Initial state after registration
2. **ACTIVE** - Approved by admin (can login)
3. **REJECTED** - Application rejected
4. **SUSPENDED** - Temporarily suspended
5. **DEACTIVATED** - Permanently deactivated

Only ACTIVE providers can login successfully.

## GraphQL Endpoints

### User Authentication
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    user { id name email }
    accessToken
  }
}

mutation Login($input: LoginInput!) {
  login(input: $input) {
    user { id name email }
    accessToken
  }
}
```

### Provider Authentication
```graphql
mutation RegisterProvider($input: RegisterProviderInput!) {
  registerProvider(input: $input) {
    provider { id name email commercialName status }
    accessToken
  }
}

mutation LoginProvider($input: LoginProviderInput!) {
  loginProvider(input: $input) {
    provider { id name email commercialName status }
    accessToken
  }
}
```

## Updated Entity Relations

### Contract
- **client** → references `User`
- **provider** → references `Provider` (changed from User)

### Listing
- **provider** → references `Provider` (changed from User)

### SignedContract
- **userId** → references `User` (nullable)
- **providerId** → references `Provider` (nullable)
- Supports contracts with both users and providers

## Files Modified

### Created
- [src/auth/provider-auth.service.ts](../src/auth/provider-auth.service.ts) - Provider authentication logic
- [src/auth/provider-auth.resolver.ts](../src/auth/provider-auth.resolver.ts) - Provider GraphQL mutations
- [src/auth/dto/register-provider.input.ts](../src/auth/dto/register-provider.input.ts) - Provider registration DTO
- [src/auth/dto/login-provider.input.ts](../src/auth/dto/login-provider.input.ts) - Provider login DTO
- [src/auth/dto/provider-auth-response.ts](../src/auth/dto/provider-auth-response.ts) - Provider auth response type

### Updated
- [src/auth/auth.module.ts](../src/auth/auth.module.ts) - Added Provider entity and ProviderAuth services
- [src/auth/auth.service.ts](../src/auth/auth.service.ts) - Removed role and provider validation logic
- [src/auth/dto/register.input.ts](../src/auth/dto/register.input.ts) - Removed role and provider fields
- [src/auth/dto/login.input.ts](../src/auth/dto/login.input.ts) - Removed role field
- [src/signed-contract/signed-contract.resolver.ts](../src/signed-contract/signed-contract.resolver.ts) - Changed query from `signedContractByUserId` to `signedContractByProviderId`

## Migration Notes

### For Frontend Applications
1. **User Registration**: Continue using `register` mutation (no role parameter needed)
2. **Provider Registration**: Use new `registerProvider` mutation
3. **Login**: 
   - Users → `login` mutation
   - Providers → `loginProvider` mutation
4. **Token Storage**: Store JWT token same as before (type is embedded in token)

### Database Migration Required
The split creates a new `provider` table. You'll need to migrate existing provider users:

```sql
-- Migration pseudocode (adjust to your needs)
INSERT INTO provider (id, name, email, phone, password, commercialName, ...)
SELECT id, name, email, phone, password, commercialName, ...
FROM user
WHERE role = 'PROVIDER';

-- Update contract.providerId
UPDATE contract
SET providerId = userId
WHERE userId IN (SELECT id FROM user WHERE role = 'PROVIDER');

-- Update listing.providerId  
UPDATE listing
SET providerId = userId
WHERE userId IN (SELECT id FROM user WHERE role = 'PROVIDER');

-- Delete provider records from user table
DELETE FROM user WHERE role = 'PROVIDER';
```

## Benefits

1. **Cleaner Domain Model**: Users and Providers have different fields and business logic
2. **Type Safety**: Frontend can use separate types for User and Provider
3. **Simpler Auth**: No role parameter needed - endpoint itself determines entity type
4. **Better Security**: Provider-specific validations (commercial registration, approval flow)
5. **Flexibility**: Can add provider-specific features without affecting User entity

## Testing

Build successful:
```bash
pnpm run build
# ✓ No TypeScript errors
```

Server starts without errors:
```bash
pnpm run start:dev
# ✓ All modules load successfully
```

## Next Steps

1. **Database Migration**: Run migration script to move existing providers
2. **Frontend Updates**: Update registration/login forms to use new mutations
3. **Admin Dashboard**: Update provider management to use Provider entity
4. **Testing**: Add E2E tests for provider authentication flow

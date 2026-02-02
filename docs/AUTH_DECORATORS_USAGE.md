# Authentication Decorators Usage

## Overview
The authentication system now fully supports both `@CurrentUser` and `@CurrentProvider` decorators. The JWT guard automatically determines whether to populate `request.user` or `request.provider` based on the token's `type` field.

## How It Works

### JWT Token Structure

**User Token:**
```typescript
{
  sub: "user-id",
  email: "user@example.com",
  type: "user"  // ← Determines which decorator works
}
```

**Provider Token:**
```typescript
{
  sub: "provider-id",
  email: "provider@example.com",
  type: "provider"  // ← Determines which decorator works
}
```

### JWT Guard Behavior

The `JwtAuthGuard` now checks the token's `type` field and sets the appropriate request property:

```typescript
// If token.type === 'provider'
request.provider = jwtPayload  // @CurrentProvider will work

// If token.type === 'user'
request.user = jwtPayload       // @CurrentUser will work
```

## Decorator Usage

### @CurrentUser Decorator

Use this in resolvers/controllers that should be accessed by regular users:

```typescript
import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => User)
export class UserResolver {
  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(
    @CurrentUser() user: JwtPayload,  // ← Extracts from request.user
  ): Promise<User> {
    // user.sub contains the user ID
    // user.email contains the user email
    // user.type === 'user'
    return this.userService.findOne(user.sub);
  }
}
```

### @CurrentProvider Decorator

Use this in resolvers/controllers that should be accessed by service providers:

```typescript
import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentProvider } from '../auth/decorators/current-provider.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => Provider)
export class ProviderResolver {
  @Query(() => Provider)
  @UseGuards(JwtAuthGuard)
  async getCurrentProvider(
    @CurrentProvider() provider: JwtPayload,  // ← Extracts from request.provider
  ): Promise<Provider> {
    // provider.sub contains the provider ID
    // provider.email contains the provider email
    // provider.type === 'provider'
    return this.providerService.findOne(provider.sub);
  }
}
```

## Security Considerations

### Type Validation

If an endpoint requires a specific type (user or provider), you should validate it:

```typescript
@Mutation(() => Listing)
@UseGuards(JwtAuthGuard)
async createListing(
  @CurrentProvider() provider: JwtPayload,
  @Args('input') input: CreateListingInput,
): Promise<Listing> {
  // Validate that the token is actually from a provider
  if (!provider || provider.type !== 'provider') {
    throw new UnauthorizedException('Only providers can create listings');
  }
  
  return this.listingService.create(provider.sub, input);
}
```

### Optional Authentication

Both decorators can return `undefined` if used without a guard or if the token is invalid:

```typescript
@Query(() => [Listing])
async getListings(
  @CurrentProvider() provider?: JwtPayload,  // ← Optional
): Promise<Listing[]> {
  // If provider is logged in, show their listings
  if (provider) {
    return this.listingService.findByProviderId(provider.sub);
  }
  
  // Otherwise show all public listings
  return this.listingService.findAll();
}
```

## Examples from Codebase

### User Endpoints
- [src/user/user.resolver.ts](../src/user/user.resolver.ts) - `getCurrentUser` query
- [src/auth/auth.resolver.ts](../src/auth/auth.resolver.ts) - `changePassword`, `changeEmail` mutations

### Provider Endpoints
- [src/provider/provider.resolver.ts](../src/provider/provider.resolver.ts) - `getCurrentProvider` query
- [src/listing/listing.resolver.ts](../src/listing/listing.resolver.ts) - `createListing`, `updateListing` mutations
- [src/auth/provider-auth.resolver.ts](../src/auth/provider-auth.resolver.ts) - `changeProviderPassword` mutation

## Migration from Role-based System

### Before (Role-based):
```typescript
@Query(() => User)
@UseGuards(JwtAuthGuard)
async getCurrentUser(
  @CurrentUser() user: JwtPayload,
): Promise<User> {
  // Had to check user.role === 'USER' or 'PROVIDER'
  if (user.role === 'USER') {
    return this.userService.findOne(user.sub);
  } else {
    throw new ForbiddenException('Not a user');
  }
}
```

### After (Type-based):
```typescript
@Query(() => User)
@UseGuards(JwtAuthGuard)
async getCurrentUser(
  @CurrentUser() user: JwtPayload,  // Only works with user tokens
): Promise<User> {
  // No role check needed - decorator only populated for user tokens
  return this.userService.findOne(user.sub);
}

@Query(() => Provider)
@UseGuards(JwtAuthGuard)
async getCurrentProvider(
  @CurrentProvider() provider: JwtPayload,  // Only works with provider tokens
): Promise<Provider> {
  // Separate endpoint for providers
  return this.providerService.findOne(provider.sub);
}
```

## Testing

You can test the decorators by:

1. **Login as User**:
   ```graphql
   mutation {
     login(input: { emailOrPhone: "user@test.com", password: "pass123" }) {
       accessToken  # Token has type: 'user'
     }
   }
   ```

2. **Use @CurrentUser**:
   ```graphql
   query {
     getCurrentUser {  # Works with user token
       id
       name
       email
     }
   }
   ```

3. **Login as Provider**:
   ```graphql
   mutation {
     loginProvider(input: { emailOrPhone: "provider@test.com", password: "pass123" }) {
       accessToken  # Token has type: 'provider'
     }
   }
   ```

4. **Use @CurrentProvider**:
   ```graphql
   query {
     getCurrentProvider {  # Works with provider token
       id
       name
       commercialName
     }
   }
   ```

## Troubleshooting

### "Cannot read property 'sub' of undefined"
- Check that `@UseGuards(JwtAuthGuard)` is applied to the resolver/query
- Verify the JWT token is sent in Authorization header: `Bearer <token>`
- Ensure the token type matches the decorator (`user` token for `@CurrentUser`, `provider` token for `@CurrentProvider`)

### Wrong entity type error
- User token used with `@CurrentProvider` → `provider` will be `undefined`
- Provider token used with `@CurrentUser` → `user` will be `undefined`
- Solution: Use the correct decorator for the token type

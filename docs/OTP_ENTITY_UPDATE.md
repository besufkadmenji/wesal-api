# OTP Entity Update: Supporting Both Users and Providers

## Overview
Updated the OTP entity to support verification codes for both **Users** and **Providers** using a single table with nullable foreign keys.

## Changes Made

### 1. OTP Entity ([src/auth/entities/otp.entity.ts](../src/auth/entities/otp.entity.ts))

#### Before:
- Only supported `userId` field (required)
- Single relation to `User` entity

#### After:
- Supports both `userId` and `providerId` (both nullable)
- Relations to both `User` and `Provider` entities
- Database constraint ensures exactly one FK is set: `@Check` constraint

```typescript
@Check(`("userId" IS NOT NULL AND "providerId" IS NULL) OR ("providerId" IS NOT NULL AND "userId" IS NULL)`)
export class Otp {
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  providerId?: string;

  @ManyToOne(() => Provider, { nullable: true })
  provider?: Provider;
  
  // ... other fields
}
```

### 2. Provider Auth Service Updates

Fixed all OTP operations in `ProviderAuthService` to use `providerId` instead of incorrectly using `userId`:

**generateAndSendOtp**:
```typescript
const otp = this.otpRepository.create({
  providerId,  // ✅ Was: userId: providerId (incorrect)
  target,
  type,
  code,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  // ...
});
```

**verifyOtp** - Provider lookup:
```typescript
const provider = await this.providerRepository.findOne({
  where: { id: otp.providerId },  // ✅ Was: otp.userId (incorrect)
});
```

**Password Reset Token**:
```typescript
const payload = { 
  sub: otp.providerId,  // ✅ Was: otp.userId (incorrect)
  type: 'password_reset_provider' 
};
```

### 3. User Auth Service

No changes needed - `AuthService` already correctly uses `userId` field.

## Database Constraint

The OTP table now enforces that exactly one of `userId` or `providerId` must be set:

```sql
CHECK (
  ("userId" IS NOT NULL AND "providerId" IS NULL) OR 
  ("providerId" IS NOT NULL AND "userId" IS NULL)
)
```

This prevents:
- Creating OTPs with both fields set
- Creating OTPs with neither field set

## Usage Examples

### Creating OTP for User
```typescript
const otp = this.otpRepository.create({
  userId: '123-user-id',
  providerId: null,  // or undefined
  target: 'user@example.com',
  type: OtpType.EMAIL_VERIFICATION,
  code: '1234',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  isUsed: false,
});
```

### Creating OTP for Provider
```typescript
const otp = this.otpRepository.create({
  userId: null,  // or undefined
  providerId: '456-provider-id',
  target: 'provider@example.com',
  type: OtpType.EMAIL_VERIFICATION,
  code: '1234',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  isUsed: false,
});
```

### Querying OTP by User
```typescript
const otp = await this.otpRepository.findOne({
  where: {
    userId: userId,
    target: email,
    type: OtpType.EMAIL_VERIFICATION,
    isUsed: false,
    expiresAt: MoreThan(new Date()),
  },
});
```

### Querying OTP by Provider
```typescript
const otp = await this.otpRepository.findOne({
  where: {
    providerId: providerId,
    target: email,
    type: OtpType.EMAIL_VERIFICATION,
    isUsed: false,
    expiresAt: MoreThan(new Date()),
  },
});
```

## Benefits of Single Table Approach

1. **No Code Duplication**: OTP logic is identical for both entity types
2. **Simpler Queries**: Single table for all OTP operations
3. **Consistent Cleanup**: One cleanup job for all expired OTPs
4. **Type Safety**: Database constraint ensures data integrity
5. **Easier Migration**: Only need to add one nullable column

## Alternative Considered

We considered creating a separate `ProviderOtp` entity but decided against it because:
- OTP behavior is identical for users and providers
- Would require duplicate service methods
- More complex to maintain two tables
- OTPs are temporary by nature (10-minute expiry)

## Migration Notes

When migrating the database:

```sql
-- Add new nullable column
ALTER TABLE otps ADD COLUMN "providerId" uuid NULL;

-- Add foreign key constraint
ALTER TABLE otps 
  ADD CONSTRAINT "FK_otps_providerId" 
  FOREIGN KEY ("providerId") 
  REFERENCES provider(id) 
  ON DELETE CASCADE;

-- Make userId nullable
ALTER TABLE otps ALTER COLUMN "userId" DROP NOT NULL;

-- Add check constraint
ALTER TABLE otps 
  ADD CONSTRAINT "CHK_otps_user_or_provider" 
  CHECK (
    ("userId" IS NOT NULL AND "providerId" IS NULL) OR 
    ("providerId" IS NOT NULL AND "userId" IS NULL)
  );
```

## Testing

Build verified successfully:
```bash
pnpm run build
# ✓ No TypeScript errors
```

Both auth services now correctly:
- Generate OTPs with appropriate foreign key
- Validate OTPs against correct entity
- Update verification status on correct entity
- Issue reset tokens with correct entity ID

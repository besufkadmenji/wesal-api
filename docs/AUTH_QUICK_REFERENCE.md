# Authentication Quick Reference

## GraphQL Mutations

### 1. Register User

```graphql
mutation {
  register(
    input: {
      name: "John Doe"
      email: "john@example.com"
      password: "SecurePass123"
      phone: "+1234567890"
    }
  ) {
    id
    email
    emailVerified
    phoneVerified
  }
}
```

**Returns**: User object with `emailVerified: false`, `phoneVerified: false`
**Side Effect**: Sends OTP to email and phone (check console logs)

### 2. Verify Email

```graphql
mutation {
  verifyOtp(
    input: {
      target: "john@example.com"
      code: "123456"
      type: EMAIL_VERIFICATION
    }
  )
}
```

**Returns**: `true` if successful
**Side Effect**: Updates user's `emailVerified` to `true`

### 3. Verify Phone

```graphql
mutation {
  verifyOtp(
    input: { target: "+1234567890", code: "654321", type: PHONE_VERIFICATION }
  )
}
```

**Returns**: `true` if successful
**Side Effect**: Updates user's `phoneVerified` to `true`, sends welcome email if both verified

### 4. Login

```graphql
mutation {
  login(input: { email: "john@example.com", password: "SecurePass123" }) {
    accessToken
    user {
      id
      name
      email
      role
    }
  }
}
```

**Returns**: JWT token + user object
**Requirements**: Both email and phone must be verified

### 5. Resend OTP

```graphql
mutation {
  resendOtp(input: { target: "john@example.com", type: EMAIL_VERIFICATION })
}
```

**Returns**: `true` if successful
**Rate Limit**: 1 OTP per minute per target

### 6. Forgot Password

```graphql
mutation {
  forgotPassword(input: { emailOrPhone: "john@example.com" })
}
```

**Returns**: `true` if successful
**Side Effect**: Sends password reset OTP (check console)

### 7. Reset Password

```graphql
mutation {
  resetPassword(
    input: {
      target: "john@example.com"
      code: "789012"
      newPassword: "NewSecurePass456"
    }
  )
}
```

**Returns**: `true` if successful
**Side Effect**: Updates user password

## Testing Flow

```bash
# 1. Start server
pnpm run start:dev

# 2. Open GraphQL Playground
# http://localhost:4000/graphql

# 3. Register user
# Copy OTP codes from console logs

# 4. Verify email with OTP from console

# 5. Verify phone with OTP from console

# 6. Login to get JWT token

# 7. Use token in Authorization header for protected routes
```

## Console Log Format

```
[EmailService] Verification email sent to: john@example.com
[EmailService] OTP Code: 123456

[SmsService] Verification SMS sent to: +1234567890
[SmsService] OTP Code: 654321
```

## OTP Types

- `EMAIL_VERIFICATION` - Verify email address
- `PHONE_VERIFICATION` - Verify phone number
- `PASSWORD_RESET` - Reset forgotten password

## Common Errors

| Error Code              | Message                   | Solution                     |
| ----------------------- | ------------------------- | ---------------------------- |
| `EMAIL_ALREADY_EXISTS`  | Email already registered  | Use different email          |
| `PHONE_ALREADY_EXISTS`  | Phone already registered  | Use different phone          |
| `ACCOUNT_NOT_VERIFIED`  | Account not verified      | Verify email and phone first |
| `INVALID_CREDENTIALS`   | Invalid email or password | Check credentials            |
| `INVALID_OTP`           | Invalid or expired OTP    | Request new OTP              |
| `TOO_MANY_OTP_REQUESTS` | Too many requests         | Wait 1 minute                |

## Environment Setup

```env
# Required in .env file
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=wesal_db
```

## Security Notes

✅ Passwords hashed with bcrypt (10 rounds)
✅ OTPs expire after 10 minutes
✅ OTPs can only be used once
✅ Rate limiting: 1 OTP per minute
✅ Both email AND phone must be verified to login
✅ JWT tokens configurable expiration (default 7 days)

## Next Steps

1. Replace mock services with real email/SMS providers
2. Add JWT guard for protected routes
3. Implement token refresh mechanism
4. Add device management
5. Set up session tracking

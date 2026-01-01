# Authentication System - Quick Start Guide

## Overview
The authentication system implements user registration with dual verification (email + phone), OTP-based password reset, and JWT token authentication.

## Features

### 1. User Registration
- Users register with name, email, password, and phone
- System sends OTP to both email and phone
- Both must be verified before user can login
- Passwords are hashed using bcrypt

### 2. OTP Verification
- 6-digit OTP codes
- 10-minute expiration
- Rate limiting: 1 OTP per minute per target
- Types: EMAIL_VERIFICATION, PHONE_VERIFICATION, PASSWORD_RESET

### 3. Login
- Email + password authentication
- Requires both email and phone to be verified
- Returns JWT token (default 7-day expiration)
- Token includes user ID, email, and role

### 4. Password Reset
- User provides email or phone
- System sends OTP to the provided contact
- User verifies OTP and sets new password

## GraphQL Mutations

### Register
```graphql
mutation Register {
  register(input: {
    name: "John Doe"
    email: "john@example.com"
    password: "SecurePass123"
    phone: "+1234567890"
    role: CLIENT
  }) {
    id
    name
    email
    phone
    emailVerified
    phoneVerified
  }
}
```

### Verify OTP
```graphql
mutation VerifyOtp {
  verifyOtp(input: {
    target: "john@example.com"
    code: "123456"
    type: EMAIL_VERIFICATION
  })
}

mutation VerifyPhone {
  verifyOtp(input: {
    target: "+1234567890"
    code: "654321"
    type: PHONE_VERIFICATION
  })
}
```

### Resend OTP
```graphql
mutation ResendOtp {
  resendOtp(input: {
    target: "john@example.com"
    type: EMAIL_VERIFICATION
  })
}
```

### Login
```graphql
mutation Login {
  login(input: {
    email: "john@example.com"
    password: "SecurePass123"
  }) {
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

### Forgot Password
```graphql
mutation ForgotPassword {
  forgotPassword(input: {
    emailOrPhone: "john@example.com"
  })
}
```

### Reset Password
```graphql
mutation ResetPassword {
  resetPassword(input: {
    target: "john@example.com"
    code: "789012"
    newPassword: "NewSecurePass456"
  })
}
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=wesal_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3000
```

## Testing Flow

### 1. Register a User
```bash
# Register
mutation { register(...) }
# Check console for OTP codes (mock service logs them)
```

### 2. Verify Email and Phone
```bash
# Verify email with OTP from console
mutation { verifyOtp(target: "email", code: "123456", type: EMAIL_VERIFICATION) }

# Verify phone with OTP from console
mutation { verifyOtp(target: "+1234567890", code: "654321", type: PHONE_VERIFICATION) }
```

### 3. Login
```bash
# Login (only works if both email and phone are verified)
mutation { login(email: "...", password: "...") }
# Returns JWT token
```

### 4. Password Reset Flow
```bash
# Request reset
mutation { forgotPassword(emailOrPhone: "john@example.com") }
# Check console for OTP

# Reset with OTP
mutation { resetPassword(target: "john@example.com", code: "789012", newPassword: "New123") }
```

## Mock Services

### Email Service
Located in `lib/email/email.service.ts`
- `sendVerificationEmail(email, code)` - Logs to console
- `sendPasswordResetEmail(email, code)` - Logs to console
- `sendWelcomeEmail(email, name)` - Logs to console

### SMS Service
Located in `lib/sms/sms.service.ts`
- `sendVerificationSms(phone, code)` - Logs to console
- `sendPasswordResetSms(phone, code)` - Logs to console

**Note**: Replace these with real email/SMS services in production (SendGrid, Twilio, etc.)

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **OTP Expiration**: 10 minutes
3. **Rate Limiting**: 1 OTP per minute per target
4. **Single Use OTPs**: Each OTP can only be used once
5. **JWT Tokens**: Secure token-based authentication
6. **Dual Verification**: Both email and phone must be verified

## Error Messages

The system provides bilingual error messages (English/Arabic):
- `INVALID_CREDENTIALS`: Invalid email or password
- `EMAIL_ALREADY_EXISTS`: Email already registered
- `PHONE_ALREADY_EXISTS`: Phone already registered
- `ACCOUNT_NOT_VERIFIED`: Account not verified
- `INVALID_OTP`: Invalid or expired OTP
- `OTP_EXPIRED`: OTP has expired
- `TOO_MANY_OTP_REQUESTS`: Too many requests, try again later
- `USER_NOT_FOUND`: User not found

## Next Steps

1. **Add JWT Guard**: Protect mutations/queries with authentication
2. **Real Email/SMS**: Replace mock services with real providers
3. **Refresh Tokens**: Implement token refresh mechanism
4. **2FA**: Add optional two-factor authentication
5. **Session Management**: Track active sessions
6. **Account Recovery**: Alternative recovery methods

# I18n Error Handling System

## Overview

This system provides comprehensive internationalization (i18n) support for error messages in English and Arabic. It includes:

- **GetLanguage Decorator**: Extracts language preference from `Accept-Language` header
- **I18n Exceptions**: Custom exception classes with language support
- **Error Codes & Messages**: Organized per-entity error definitions
- **I18n Service**: Utility service for translation and error responses

## Folder Structure

```
lib/
├── i18n/                          # Core i18n utilities
│   ├── language.types.ts         # Language enums and types
│   ├── get-language.decorator.ts # Language extraction decorator
│   ├── i18n.service.ts          # Translation service
│   └── index.ts                  # Exports
├── errors/                        # Error handling utilities
│   ├── i18n.exceptions.ts       # Custom exception classes
│   └── index.ts                  # Exports

src/{feature}/errors/            # Feature-specific errors
├── {feature}.error-codes.ts     # Error code constants
└── {feature}.error-messages.ts  # Error messages (EN/AR)
```

## Usage

### 1. Extract Language in Resolvers/Controllers

Use the `@GetLanguage()` decorator to automatically extract the user's language preference:

```typescript
import { GetLanguage } from '../../../lib/i18n';
import type { LanguageCode } from '../../../lib/i18n';

@Mutation(() => User)
createUser(
  @Args('createUserInput') createUserInput: CreateUserInput,
  @GetLanguage() language: LanguageCode,  // Automatically extracted from Accept-Language header
) {
  return this.userService.create(createUserInput, language);
}
```

### 2. Define Error Codes & Messages

Create error files in the feature directory:

**Feature-specific error codes** (`src/user/errors/user.error-codes.ts`):
```typescript
export const USER_ERROR_CODES = {
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_IN_USE: 'EMAIL_ALREADY_IN_USE',
} as const;
```

**Feature-specific error messages** (`src/user/errors/user.error-messages.ts`):
```typescript
import { TranslatedError } from '../../../lib/i18n/i18n.service';
import { USER_ERROR_CODES } from './user.error-codes';

export const USER_ERROR_MESSAGES: Record<string, TranslatedError> = {
  [USER_ERROR_CODES.USER_ALREADY_EXISTS]: {
    en: 'A user with this email or phone already exists',
    ar: 'يوجد بالفعل مستخدم بنفس البريد الإلكتروني أو رقم الهاتف',
  },
  [USER_ERROR_CODES.USER_NOT_FOUND]: {
    en: 'User not found',
    ar: 'لم يتم العثور على المستخدم',
  },
  [USER_ERROR_CODES.EMAIL_ALREADY_IN_USE]: {
    en: 'This email is already in use',
    ar: 'هذا البريد الإلكتروني قيد الاستخدام بالفعل',
  },
};
```

### 3. Use i18n Exceptions in Services

Pass the language parameter to service methods and throw i18n exceptions:

```typescript
import { I18nBadRequestException, I18nNotFoundException } from '../../../lib/errors';
import { USER_ERROR_CODES } from './errors/user.error-codes';
import { USER_ERROR_MESSAGES } from './errors/user.error-messages';

@Injectable()
export class UserService {
  async create(
    createUserInput: CreateUserInput,
    language: LanguageCode = 'en',
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [{ email: createUserInput.email }, { phone: createUserInput.phone }],
    });

    if (existingUser) {
      throw new I18nBadRequestException(
        USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_ALREADY_EXISTS],
        language,
      );
    }
    // ...
  }
}
```

## Language Detection

The `@GetLanguage()` decorator automatically detects language from the `Accept-Language` header:

- **Arabic**: Detects `ar`, `ar-SA`, `ar-AE`, etc.
- **English**: Default if no Arabic is detected
- **Fallback**: English (en) if header is missing

### Examples

| Accept-Language Header | Detected Language |
|--------|-----------|
| `ar-SA,ar;q=0.9,en;q=0.8` | Arabic |
| `en-US,en;q=0.9` | English |
| `fr-FR,fr;q=0.9` | English (fallback) |
| *(missing)* | English (default) |

## Available Exception Classes

### I18nBadRequestException
For validation and business logic errors (HTTP 400):

```typescript
throw new I18nBadRequestException(
  USER_ERROR_MESSAGES[USER_ERROR_CODES.INVALID_EMAIL],
  language,
);
```

### I18nNotFoundException
For resource not found errors (HTTP 404):

```typescript
throw new I18nNotFoundException(
  USER_ERROR_MESSAGES[USER_ERROR_CODES.USER_NOT_FOUND],
  language,
);
```

### I18nConflictException
For conflict/duplicate errors (HTTP 409):

```typescript
throw new I18nConflictException(
  USER_ERROR_MESSAGES[USER_ERROR_CODES.EMAIL_ALREADY_IN_USE],
  language,
);
```

## Adding New Entity Errors

To add error handling for a new entity:

1. Create error files:
   ```bash
   mkdir -p src/{entity}/errors
   ```

2. Define error codes (`src/{entity}/errors/{entity}.error-codes.ts`)

3. Define error messages (`src/{entity}/errors/{entity}.error-messages.ts`)

4. Use in service with language parameter

5. Use `@GetLanguage()` decorator in resolver/controller

## Testing

The system is fully integrated. When an error is thrown:

**Request Header:**
```
Accept-Language: ar-SA,ar;q=0.9
```

**Response:**
```json
{
  "message": "يوجد بالفعل مستخدم بنفس البريد الإلكتروني أو رقم الهاتف",
  "code": "BAD_REQUEST",
  "statusCode": 400
}
```

**Without Arabic (English fallback):**
```
Accept-Language: en-US
```

**Response:**
```json
{
  "message": "A user with this email or phone already exists",
  "code": "BAD_REQUEST",
  "statusCode": 400
}
```

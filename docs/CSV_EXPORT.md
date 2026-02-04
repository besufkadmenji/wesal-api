# CSV Export Feature

## Overview
The Wesal API includes comprehensive CSV export functionality for all entities with localization support. Export data to user-friendly CSV files with Arabic (default) or English headers, optional field selection, and automatic security filtering.

## Key Features
- ✅ **User-Friendly Headers**: Field names translated to Arabic or English instead of technical database column names
- ✅ **Localization**: Accept-Language header support (ar = Arabic, en = English)
- ✅ **Field Selection**: Export specific columns to reduce file size
- ✅ **Security**: Automatically filters sensitive fields (passwords, tokens, secrets)
- ✅ **Recursive Filtering**: Removes sensitive data even from nested objects and relations
- ✅ **Excel Compatible**: UTF-8 with BOM for proper encoding in Excel
- ✅ **Data Formatting**: Dates formatted consistently, booleans as Yes/No (نعم/لا)

## Implementation

### Core Service
- **Location**: `lib/csv-export/csv-export.service.ts`
- **Module**: `lib/csv-export/csv-export.module.ts` (registered globally)
- Handles CSV generation with proper escaping, formatting, and translation
- Supports field selection and language switching
- Implements comprehensive security filtering

### Export Endpoints

All entities have export endpoints following the pattern: `GET /{entity-plural}/export`

#### Available Endpoints:
- `GET /users/export` - Export all users
- `GET /providers/export` - Export all providers
- `GET /listings/export` - Export all listings
- `GET /categories/export` - Export all categories
- `GET /cities/export` - Export all cities
- `GET /countries/export` - Export all countries
- `GET /banks/export` - Export all banks
- `GET /delivery-companies/export` - Export all delivery companies
- `GET /contracts/export` - Export all contracts
- `GET /payments/export` - Export all payments
- `GET /ratings/export` - Export all ratings
- `GET /complaints/export` - Export all complaints
- `GET /notifications/export` - Export all notifications
- `GET /faqs/export` - Export all FAQs
- `GET /contact-messages/export` - Export all contact messages
- `GET /signed-contracts/export` - Export all signed contracts
- `GET /favorites/export` - Export all favorites
- `GET /conversations/export` - Export all conversations
- `GET /tracking/export` - Export all tracking data
- `GET /admins/export` - Export all admins
- `GET /permissions/export` - Export all permissions
- `GET /admin-permissions/export` - Export all admin permissions
- `GET /settings/export` - Export all settings

## Usage

### Basic Export (All Fields, Arabic Headers)
```bash
curl http://localhost:3000/users/export > users.csv
```

This will download a CSV file with all fields and Arabic headers (default).

### Export with English Headers
```bash
curl -H "Accept-Language: en" http://localhost:3000/users/export > users.csv
```

Use the `Accept-Language` header to get English headers instead of Arabic.

### Export with Field Selection
```bash
curl "http://localhost:3000/users/export?fields=id,name,email,phone" > users.csv
```

This will download a CSV file with only the specified fields.

### Export with Field Selection AND English Headers
```bash
curl -H "Accept-Language: en" "http://localhost:3000/users/export?fields=id,name,email,phone" > users.csv
```

Combine field selection with language preference.

#### Query Parameters:
- `fields` (optional): Comma-separated list of field names to include in the export
  - Example: `fields=id,name,email`
  - If omitted, all fields are exported

#### Headers:
- `Accept-Language` (optional): Language code for CSV headers
  - `ar` - Arabic headers (default)
  - `en` - English headers
  - Any other value defaults to Arabic

### Example Requests

#### Export all user data with Arabic headers:
```bash
GET /users/export
Accept-Language: ar
```

#### Export specific user fields with English headers:
```bash
GET /users/export?fields=id,name,email,phone,createdAt
Accept-Language: en
```

#### Export listing data with Arabic headers (default):
```bash
GET /listings/export?fields=id,name,price,categoryId,providerId,status
```

## Response Format

- **Content-Type**: `text/csv; charset=utf-8`
- **Content-Disposition**: `attachment; filename="{entity}-export-{date}.csv"`
- **Date Format**: ISO date (YYYY-MM-DD)
- **Encoding**: UTF-8 with BOM (Byte Order Mark) for Excel compatibility

Example filename: `users-export-2026-02-04.csv`

## CSV Format

- **Separator**: Comma (`,`)
- **Encoding**: UTF-8 with BOM (`\uFEFF` prefix)
- **Headers**: Translated to user-friendly text in selected language
- **Escaping**: Values containing commas, quotes, or newlines are wrapped in double quotes
- **Date Format**: YYYY-MM-DD HH:mm (e.g., `2026-02-04 12:34`)
- **Booleans**: Formatted as `نعم`/`لا` (Arabic) or `Yes`/`No` (English)
- **JSON Objects**: Complex objects are serialized to JSON strings

### Example CSV Output (Arabic Headers):
```csv
المعرف,الاسم,البريد الإلكتروني,رقم الهاتف,تاريخ الإنشاء
"123e4567-e89b-12d3-a456-426614174000","John Doe","john@example.com","+1234567890","2026-02-04 10:00"
"223e4567-e89b-12d3-a456-426614174001","Jane Smith","jane@example.com","+0987654321","2026-02-03 15:30"
```

### Example CSV Output (English Headers):
```csv
ID,Name,Email,Phone,Created At
"123e4567-e89b-12d3-a456-426614174000","John Doe","john@example.com","+1234567890","2026-02-04 10:00"
"223e4567-e89b-12d3-a456-426614174001","Jane Smith","jane@example.com","+0987654321","2026-02-03 15:30"
```

## Field Translations

The service includes comprehensive field translations for 200+ common database fields:

### Sample Translations:
| Field Name | Arabic (ar) | English (en) |
|------------|-------------|--------------|
| `id` | المعرف | ID |
| `publicNumber` | الرقم العام | Public Number |
| `name` | الاسم | Name |
| `email` | البريد الإلكتروني | Email |
| `phone` | الهاتف | Phone |
| `dialCode` | رمز الاتصال | Dial Code |
| `status` | الحالة | Status |
| `emailVerified` | البريد مؤكد | Email Verified |
| `phoneVerified` | الهاتف مؤكد | Phone Verified |
| `isActive` | نشط | Active |
| `deactivationReason` | سبب الإيقاف | Deactivation Reason |
| `avatarFilename` | اسم ملف الصورة | Avatar Filename |
| `ibanNumber` | رقم الآيبان | IBAN Number |
| `languageCode` | رمز اللغة | Language Code |
| `withAbsher` | مع أبشر | With Absher |
| `deletedAt` | تاريخ الحذف | Deleted At |
| `deleteReason` | سبب الحذف | Delete Reason |
| `createdAt` | تاريخ الإنشاء | Created At |
| `updatedAt` | تاريخ التحديث | Updated At |
| `nameEn` | الاسم بالإنجليزية | Name (English) |
| `nameAr` | الاسم بالعربية | Name (Arabic) |

**200+ fields are pre-translated** covering:
- Common fields (id, name, email, phone, status, dates)
- Verification fields (emailVerified, phoneVerified, isVerified)
- User/Provider fields (avatar, address, nationalId, deactivation, deletion)
- Location fields (city, country, latitude, longitude)
- Category/Classification fields (bilingual names and descriptions)
- Listing fields (price, duration, serviceType)
- Contract/Payment fields (amount, transactionId, IBAN)
- Rating/Review fields (rating, comment, review)
- Bank fields (bankName, accountNumber, ibanNumber)
- Notification fields (type, isRead, readAt)
- FAQ fields (question, answer, bilingual content)
- Tracking/Delivery fields (trackingNumber, deliveryStatus)
- Settings fields (key, value)
- Publishing fields (publishedAt, isPublished, featured)
- Metadata fields (tags, notes, slug, url)

For untranslated fields:
- **Arabic**: Original field name is kept (e.g., `customField`)
- **English**: Converted to Title Case (e.g., `customField` → `Custom Field`)

## Architecture

### Controllers
Each entity has a dedicated controller:
- Location: `src/{entity}/{entity}.controller.ts`
- Endpoint: `/{entity-plural}/export`
- Accepts `Accept-Language` header for localization
- Registered in their respective modules

### Services
Each entity service must implement a `findAll()` method that returns paginated results with an `items` array.

### CSV Export Service
The `CsvExportService` provides:
- `exportToCsv<T>()` - Main export method
  - Parameters:
    - `data: T[]` - Array of objects to export
    - `filename: string` - Base filename (without extension)
    - `res: Response` - Express response object
    - `fields?: string[]` - Optional array of field names to include
    - `language?: 'ar' | 'en'` - Language for headers (defaults to 'ar')
- `removeSensitiveData()` - Recursively removes sensitive fields
- `translateFieldName()` - Translates field names to user-friendly headers
- `formatValue()` - Formats dates, booleans, and complex objects
- `formatDate()` - Formats dates consistently
- `formatBoolean()` - Formats booleans based on language

## Extension

To add export functionality to new entities:

1. **Ensure Service has findAll() method**:
```typescript
async findAll(options: PaginationOptions): Promise<IPaginatedType<Entity>> {
  // Return paginated results with items array
  return {
    items: await this.entityRepository.find(),
    total: await this.entityRepository.count(),
    page: options.page,
    limit: options.limit,
  };
}
```

2. **Create Controller**:
```typescript
import { Controller, Get, Query, Res, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiProduces,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EntityService } from './entity.service';
import { CsvExportService } from '../../lib/csv-export';

@ApiTags('Entities', 'Export')
@Controller('entities')
export class EntityController {
  constructor(
    private readonly entityService: EntityService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  @ApiOperation({ 
    summary: 'Export entities to CSV',
    description: 'Export all entity records to a CSV file with optional field selection and localization'
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to export',
    example: 'id,name,createdAt',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Language for CSV headers (ar = Arabic, en = English). Defaults to Arabic.',
    example: 'ar',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ 
    status: 200, 
    description: 'CSV file download with localized headers',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } }
  })
  async export(
    @Query('fields') fields: string,
    @Headers('accept-language') acceptLanguage: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.entityService.findAll({ page: 1, limit: 999999 });
    const entities = result.items;
    
    const selectedFields = fields 
      ? fields.split(',').map((f) => f.trim()) 
      : undefined;
    
    const language = acceptLanguage?.toLowerCase().startsWith('en') ? 'en' : 'ar';
    
    this.csvExportService.exportToCsv(
      entities,
      `entities-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
      language,
    );
  }
}
```

3. **Register Controller in Module**:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [EntityController],
  providers: [EntityResolver, EntityService],
  exports: [EntityService],
})
export class EntityModule {}
```

4. **Add Field Translations (Optional)**:
If your entity has custom fields, add translations to `FIELD_TRANSLATIONS` in `csv-export.service.ts`:
```typescript
private readonly FIELD_TRANSLATIONS: Record<string, { ar: string; en: string }> = {
  // ... existing translations ...
  customField: { ar: 'حقل مخصص', en: 'Custom Field' },
};
```

## Security Considerations

### Sensitive Field Filtering 🔒

**The CSV export service automatically filters out sensitive fields** to prevent accidental exposure of critical data:

**Protected Fields:**
- `password`, `passwordHash`, `hashedPassword`
- `hash`, `salt`
- `refreshToken`, `accessToken`, `token`
- `secret`, `privateKey`, `apiKey`
- `resetToken`, `verificationToken`

**Recursive Protection:**
These fields are **never included in exports**, even if:
- Explicitly requested via the `fields` parameter
- Present in nested objects (related entities)
- Included through database joins or relations

The filtering works recursively through the entire object tree, ensuring that passwords and sensitive tokens in related entities (e.g., provider passwords in signed contracts) are also removed.

**Example:**
```typescript
// SignedContract with Provider relation
{
  id: "123",
  providerId: "456",
  provider: {
    id: "456",
    name: "John Doe",
    password: "hash123" // ⚠️ AUTOMATICALLY REMOVED
  }
}

// Exported CSV will NOT contain the password field
// even though it's nested in the provider relation
```

### Additional Security Requirements

⚠️ **Important**: The current implementation requires additional security measures in production:

1. **Authentication**: Add authentication guards to all export endpoints
2. **Authorization**: Implement role-based access control (RBAC)
3. **Rate Limiting**: Prevent abuse with rate limiting
4. **Audit Logging**: Log all export operations for compliance
5. **Pagination**: Consider pagination for large datasets
6. **Data Sanitization**: Review and sanitize other potentially sensitive fields

### Recommended Guards:
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('export')
async export(...) { ... }
```

## Performance

- For large datasets, consider implementing:
  - Streaming responses
  - Background job processing
  - Pagination with chunked exports
  - Compression (gzip)
  - Caching frequently requested exports

## Testing

Test the export functionality:

```bash
# Start the API
pnpm run start:dev

# Test export endpoint
curl http://localhost:3000/users/export

# Test with field selection
curl "http://localhost:3000/users/export?fields=id,email"
```

## Troubleshooting

### Empty CSV
- Ensure the entity service's `findAll()` method returns data
- Check database connection and data exists

### Missing Fields
- Verify field names match entity properties exactly (case-sensitive)
- Check that the entity has the requested fields

### TypeScript Errors
- The `any` type warnings in csv-export.service.ts are acceptable as per project configuration
- The service is designed to work with generic objects

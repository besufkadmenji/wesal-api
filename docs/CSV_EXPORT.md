# CSV Export Feature

## Overview
The Wesal API now includes CSV export functionality for all entities. This allows you to export data to CSV files with optional field selection.

## Implementation

### Core Service
- **Location**: `lib/csv-export/csv-export.service.ts`
- **Module**: `lib/csv-export/csv-export.module.ts` (registered globally)
- Handles CSV generation with proper escaping and formatting
- Supports field selection to export specific columns

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

### Basic Export (All Fields)
```bash
curl http://localhost:3000/users/export > users.csv
```

This will download a CSV file with all fields from the users table.

### Export with Field Selection
```bash
curl "http://localhost:3000/users/export?fields=id,name,email,phone" > users.csv
```

This will download a CSV file with only the specified fields.

#### Query Parameters:
- `fields` (optional): Comma-separated list of field names to include in the export
  - Example: `fields=id,name,email`
  - If omitted, all fields are exported

### Example Requests

#### Export all user data:
```bash
GET /users/export
```

#### Export specific user fields:
```bash
GET /users/export?fields=id,name,email,phone,createdAt
```

#### Export listing data with selected fields:
```bash
GET /listings/export?fields=id,name,price,categoryId,providerId,status
```

## Response Format

- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="{entity}-export-{date}.csv"`
- **Date Format**: ISO date (YYYY-MM-DD)

Example filename: `users-export-2026-02-04.csv`

## CSV Format

- **Separator**: Comma (`,`)
- **Encoding**: UTF-8
- **Escaping**: Values containing commas, quotes, or newlines are wrapped in double quotes
- **Date Format**: ISO 8601 (e.g., `2026-02-04T12:34:56.789Z`)
- **JSON Objects**: Complex objects are serialized to JSON strings

### Example CSV Output:
```csv
id,name,email,phone,createdAt
"123e4567-e89b-12d3-a456-426614174000","John Doe","john@example.com","+1234567890","2026-02-04T10:00:00.000Z"
"223e4567-e89b-12d3-a456-426614174001","Jane Smith","jane@example.com","+0987654321","2026-02-03T15:30:00.000Z"
```

## Architecture

### Controllers
Each entity has a dedicated controller:
- Location: `src/{entity}/{entity}.controller.ts`
- Endpoint: `/{entity-plural}/export`
- Registered in their respective modules

### Services
Each entity service must implement a `findAll()` method that returns all records.

### CSV Export Service
The `CsvExportService` provides:
- `exportToCsv<T>()` - Main export method
  - Parameters:
    - `data: T[]` - Array of objects to export
    - `filename: string` - Base filename (without extension)
    - `res: Response` - Express response object
    - `fields?: string[]` - Optional array of field names to include

## Extension

To add export functionality to new entities:

1. **Ensure Service has findAll() method**:
```typescript
async findAll(): Promise<Entity[]> {
  return this.entityRepository.find();
}
```

2. **Create Controller**:
```typescript
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EntityService } from './entity.service';
import { CsvExportService } from '../../lib/csv-export';

@Controller('entities')
export class EntityController {
  constructor(
    private readonly entityService: EntityService,
    private readonly csvExportService: CsvExportService,
  ) {}

  @Get('export')
  async export(
    @Query('fields') fields: string,
    @Res() res: Response,
  ): Promise<void> {
    const entities = await this.entityService.findAll();
    const selectedFields = fields ? fields.split(',').map((f) => f.trim()) : undefined;
    
    this.csvExportService.exportToCsv(
      entities,
      `entities-export-${new Date().toISOString().split('T')[0]}`,
      res,
      selectedFields,
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

## Security Considerations

### Sensitive Field Filtering 🔒

**The CSV export service automatically filters out sensitive fields** to prevent accidental exposure of critical data:

**Protected Fields:**
- `password`, `passwordHash`, `hashedPassword`
- `hash`, `salt`
- `refreshToken`, `accessToken`, `token`
- `secret`, `privateKey`, `apiKey`
- `resetToken`, `verificationToken`

These fields are **never included in exports**, even if explicitly requested via the `fields` parameter.

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

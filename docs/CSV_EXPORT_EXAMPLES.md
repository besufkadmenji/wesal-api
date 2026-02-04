# CSV Export - Usage Examples

## Overview
This document provides practical examples of using the CSV export feature with localization support.

## Basic Examples

### 1. Export with Arabic Headers (Default)
```bash
curl http://localhost:3000/users/export > users-ar.csv
```

**Result CSV (Arabic headers):**
```csv
المعرف,الاسم,البريد الإلكتروني,رقم الهاتف,الحالة,نشط,تاريخ الإنشاء
"123","أحمد محمد","ahmad@example.com","+966501234567","ACTIVE","نعم","2026-02-04 10:30"
"456","سارة علي","sara@example.com","+966509876543","INACTIVE","لا","2026-02-03 15:45"
```

### 2. Export with English Headers
```bash
curl -H "Accept-Language: en" http://localhost:3000/users/export > users-en.csv
```

**Result CSV (English headers):**
```csv
ID,Name,Email,Phone,Status,Is Active,Created At
"123","Ahmad Mohammed","ahmad@example.com","+966501234567","ACTIVE","Yes","2026-02-04 10:30"
"456","Sara Ali","sara@example.com","+966509876543","INACTIVE","No","2026-02-03 15:45"
```

### 3. Export Selected Fields with Arabic Headers
```bash
curl "http://localhost:3000/users/export?fields=id,name,email" > users-selected-ar.csv
```

**Result CSV:**
```csv
المعرف,الاسم,البريد الإلكتروني
"123","أحمد محمد","ahmad@example.com"
"456","سارة علي","sara@example.com"
```

### 4. Export Selected Fields with English Headers
```bash
curl -H "Accept-Language: en" "http://localhost:3000/users/export?fields=id,name,email" > users-selected-en.csv
```

**Result CSV:**
```csv
ID,Name,Email
"123","Ahmad Mohammed","ahmad@example.com"
"456","Sara Ali","sara@example.com"
```

## Entity-Specific Examples

### Providers
```bash
# Arabic headers
curl "http://localhost:3000/providers/export?fields=id,name,phone,status,rating" > providers-ar.csv

# English headers
curl -H "Accept-Language: en" "http://localhost:3000/providers/export?fields=id,name,phone,status,rating" > providers-en.csv
```

### Listings
```bash
# Arabic headers
curl "http://localhost:3000/listings/export?fields=id,name,price,status,categoryId" > listings-ar.csv

# English headers
curl -H "Accept-Language: en" "http://localhost:3000/listings/export?fields=id,name,price,status,categoryId" > listings-en.csv
```

### Categories
```bash
# Arabic headers
curl "http://localhost:3000/categories/export?fields=id,nameEn,nameAr,image" > categories-ar.csv

# English headers
curl -H "Accept-Language: en" "http://localhost:3000/categories/export?fields=id,nameEn,nameAr,image" > categories-en.csv
```

### Orders/Signed Contracts
```bash
# Arabic headers (sensitive fields automatically removed)
curl "http://localhost:3000/signed-contracts/export" > signed-contracts-ar.csv

# English headers
curl -H "Accept-Language: en" "http://localhost:3000/signed-contracts/export" > signed-contracts-en.csv
```

## Advanced Examples

### 1. Export to Browser Download
In JavaScript/TypeScript (frontend):

```typescript
// Arabic export
const downloadArabicCSV = async () => {
  const response = await fetch('http://localhost:3000/users/export');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-ar-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// English export
const downloadEnglishCSV = async () => {
  const response = await fetch('http://localhost:3000/users/export', {
    headers: { 'Accept-Language': 'en' }
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-en-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

### 2. Export with Axios
```typescript
import axios from 'axios';

// Arabic export
const exportArabic = async () => {
  const response = await axios.get('http://localhost:3000/users/export', {
    responseType: 'blob',
  });
  return response.data;
};

// English export
const exportEnglish = async () => {
  const response = await axios.get('http://localhost:3000/users/export', {
    responseType: 'blob',
    headers: { 'Accept-Language': 'en' },
  });
  return response.data;
};

// Export with field selection
const exportSelected = async (fields: string[], language: 'ar' | 'en' = 'ar') => {
  const response = await axios.get('http://localhost:3000/users/export', {
    responseType: 'blob',
    params: { fields: fields.join(',') },
    headers: { 'Accept-Language': language },
  });
  return response.data;
};

// Usage
await exportSelected(['id', 'name', 'email', 'phone'], 'en');
```

### 3. Using Swagger UI
1. Navigate to `http://localhost:3000/api`
2. Find the export endpoint (e.g., `/users/export`)
3. Click "Try it out"
4. (Optional) Enter fields: `id,name,email,phone`
5. (Optional) Add header: `Accept-Language: en`
6. Click "Execute"
7. Download the CSV file

## Security Examples

### Sensitive Fields Are Always Filtered

**Request with password field (BLOCKED):**
```bash
curl "http://localhost:3000/users/export?fields=id,name,email,password" > users.csv
```

**Result CSV (password field automatically removed):**
```csv
المعرف,الاسم,البريد الإلكتروني
"123","أحمد محمد","ahmad@example.com"
```

**Request with nested password (BLOCKED):**
```bash
curl "http://localhost:3000/signed-contracts/export" > contracts.csv
```

**Result:** Provider passwords in joined relations are automatically removed, even though they're nested objects.

## Common Field Names

Here are commonly used field names and their translations:

### User/Provider Fields
| Field | Arabic | English |
|-------|--------|---------|
| `id` | المعرف | ID |
| `name` | الاسم | Name |
| `email` | البريد الإلكتروني | Email |
| `phone` | رقم الهاتف | Phone |
| `status` | الحالة | Status |
| `isActive` | نشط | Is Active |
| `rating` | التقييم | Rating |

### Listing Fields
| Field | Arabic | English |
|-------|--------|---------|
| `title` | العنوان | Title |
| `description` | الوصف | Description |
| `price` | السعر | Price |
| `location` | الموقع | Location |
| `categoryId` | معرف الفئة | Category ID |

### Date/Time Fields
| Field | Arabic | English |
|-------|--------|---------|
| `createdAt` | تاريخ الإنشاء | Created At |
| `updatedAt` | تاريخ التحديث | Updated At |
| `deletedAt` | تاريخ الحذف | Deleted At |
| `publishedAt` | تاريخ النشر | Published At |

## Excel Compatibility

All exports include UTF-8 BOM (Byte Order Mark) for proper encoding in Microsoft Excel.

**To open in Excel:**
1. Double-click the CSV file
2. Excel automatically detects UTF-8 encoding
3. Arabic text displays correctly
4. No need for manual import settings

**If you see garbled Arabic text:**
1. Open Excel
2. Go to Data → From Text/CSV
3. Select the file
4. Choose "UTF-8" encoding
5. Click "Load"

## Performance Considerations

### Large Exports
For entities with many records:

```bash
# Export only necessary fields to reduce file size
curl "http://localhost:3000/users/export?fields=id,name,email" > users-small.csv

# Instead of exporting everything
curl "http://localhost:3000/users/export" > users-large.csv
```

### Recommended Limits
- **Small exports** (< 1,000 records): Export all fields
- **Medium exports** (1,000 - 10,000 records): Select essential fields only
- **Large exports** (> 10,000 records): Consider pagination or backend processing

## Troubleshooting

### Arabic Text Not Displaying
- **Problem**: Arabic text shows as ??? or boxes
- **Solution**: Ensure UTF-8 encoding is used. All exports include UTF-8 BOM automatically.

### Missing Fields
- **Problem**: Requested fields not in export
- **Solution**: Check if the field is in the SENSITIVE_FIELDS list (passwords, tokens, etc.). These are always filtered.

### Wrong Language
- **Problem**: Headers in wrong language
- **Solution**: Check `Accept-Language` header. Use `ar` for Arabic (default) or `en` for English.

## Testing Endpoints

All endpoints are documented in Swagger UI at `http://localhost:3000/api`.

Available export endpoints:
- `/users/export`
- `/providers/export`
- `/listings/export`
- `/categories/export`
- `/cities/export`
- `/countries/export`
- `/banks/export`
- `/delivery-companies/export`
- `/contracts/export`
- `/payments/export`
- `/ratings/export`
- `/complaints/export`
- `/notifications/export`
- `/faqs/export`
- `/contact-messages/export`
- `/signed-contracts/export`
- `/favorites/export`
- `/conversations/export`
- `/tracking/export`
- `/admins/export`
- `/permissions/export`
- `/admin-permissions/export`
- `/settings/export`

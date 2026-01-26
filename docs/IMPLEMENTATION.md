# Listing CRUD Implementation Summary

## Overview
Full CRUD implementation for the Listing feature with comprehensive validation, role-based access control, and i18n support following the Wesal API project patterns.

## Key Features

### 1. **Input DTOs with Validation** ([create-listing.input.ts](create-listing.input.ts), [update-listing.input.ts](update-listing.input.ts), [create-listing-media.input.ts](create-listing-media.input.ts))
- **CreateListingInput**: Complete form validation using `class-validator`
  - `categoryId` & `cityId`: UUID validation with required check
  - `name`: 3-200 characters required
  - `description`: 10-5000 characters required  
  - `price`: Decimal range 0-999999.99
  - `type`: ListingType (FREE/FEATURED)
  - `story` & `photos`: Optional ListingMedia arrays
  - `tags`: Optional string up to 500 chars
  - `status`: Optional, defaults to DRAFT

- **UpdateListingInput**: Extends CreateListingInput as partial with required `id` field
- **CreateListingMediaInput**: Media object validation with id, filename, type, and sortOrder

### 2. **Service Layer** ([listing.service.ts](listing.service.ts))
Core business logic with full error handling:

#### Methods:
- **`create(input, userId, language)`**: 
  - ✅ Provider-only validation (role check)
  - ✅ Category & city existence validation
  - ✅ Auto-defaults: status=DRAFT, story={}, photos=[], tags=''
  
- **`findAll(skip, take, language)`**: 
  - Returns paginated published listings with relations
  
- **`findOne(id, language)`**: 
  - Returns single listing with user, category, city relations
  
- **`findByUser(userId, skip, take, language)`**: 
  - Returns user's listings (all statuses) paginated
  
- **`update(id, input, userId, language)`**: 
  - Authorization check (user owns listing)
  - Optional category/city re-validation
  
- **`remove(id, userId, language)`**: 
  - Authorization check
  - Soft returns success response with i18n message

#### Error Handling:
- i18n-aware error messages (English/Arabic)
- **ListingNotFound**: When listing doesn't exist
- **CategoryNotFound**: Invalid category reference
- **CityNotFound**: Invalid city reference
- **Unauthorized**: User doesn't own the listing
- **ProviderOnly**: Only PROVIDER role can create listings

### 3. **Resolver Layer** ([listing.resolver.ts](listing.resolver.ts))
GraphQL API with JWT authentication and authorization:

#### Queries:
- **`listings(skip?, take?, language?)`**: Public paginated listings
- **`listing(id, language?)`**: Public single listing
- **`myListings(skip?, take?, language?)`** (Protected): User's own listings

#### Mutations:
- **`createListing(input, language?)`** (Protected): Create new listing (provider-only enforced at service)
- **`updateListing(input, language?)`** (Protected): Update own listing
- **`removeListing(id, language?)`** (Protected): Delete own listing

#### Features:
- ✅ JWT authentication via `@UseGuards(JwtAuthGuard)`
- ✅ Current user extraction via `@CurrentUser()` decorator
- ✅ i18n language parameter support (en/ar defaults to 'en')
- ✅ Response types: `RemoveListingResponse` & `PaginatedListings`

### 4. **Module Setup** ([listing.module.ts](listing.module.ts))
- TypeOrmModule integration with Listing, User, Category, City entities
- Providers: ListingResolver, ListingService
- Exports: ListingService for cross-module use

## Authorization Flow

```
User Request → JwtAuthGuard → CurrentUser Decorator
                                      ↓
                              userId extracted from JWT
                                      ↓
                        Passed to service methods
                                      ↓
                    Service validates:
                    1. User is PROVIDER (for create)
                    2. User owns resource (for update/delete)
```

## Database Relations

```
Listing
├── user (ManyToOne) User (onDelete: CASCADE)
├── category (ManyToOne) Category (onDelete: CASCADE)
└── city (ManyToOne) City (onDelete: CASCADE)
```

## Error Message Examples

| Code | EN | AR |
|------|----|----|
| PROVIDER_ONLY | "Only providers can create listings" | "فقط مقدمو الخدمات يمكنهم إنشاء إعلانات" |
| UNAUTHORIZED | "You are not authorized to perform this action" | "أنت غير مصرح بإجراء هذا الإجراء" |
| LISTING_NOT_FOUND | "Listing not found" | "الإعلان غير موجود" |
| CATEGORY_NOT_FOUND | "Category not found" | "الفئة غير موجودة" |
| CITY_NOT_FOUND | "City not found" | "المدينة غير موجودة" |

## Usage Examples

### Create Listing (GraphQL)
```graphql
mutation {
  createListing(
    createListingInput: {
      name: "Professional Home Cleaning"
      description: "Expert house cleaning services with eco-friendly products"
      price: 50.00
      categoryId: "uuid-here"
      cityId: "uuid-here"
      type: FEATURED
      tags: "cleaning, eco-friendly, affordable"
    }
    language: "en"
  ) {
    id
    name
    status
    price
    createdAt
  }
}
```

### Get My Listings
```graphql
query {
  myListings(skip: 0, take: 10, language: "en") {
    data {
      id
      name
      status
      price
      category { name }
      city { name }
    }
    total
  }
}
```

### Update Listing
```graphql
mutation {
  updateListing(
    updateListingInput: {
      id: "listing-uuid"
      price: 60.00
      status: PUBLISHED
    }
    language: "en"
  ) {
    id
    price
    status
    updatedAt
  }
}
```

## Testing Notes
- All inputs are validated with `class-validator` before reaching service
- Role-based access enforced at service level (provider validation)
- Ownership validation prevents users from editing/deleting others' listings
- i18n support through language parameter (defaults to English)
- Pagination support with skip/take parameters

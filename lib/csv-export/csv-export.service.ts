/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class CsvExportService {
  // Fields that should never be exported for security reasons
  private readonly SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'hashedPassword',
    'hash',
    'salt',
    'refreshToken',
    'accessToken',
    'token',
    'secret',
    'privateKey',
    'apiKey',
    'resetToken',
    'verificationToken',
  ];

  // Field name translations for user-friendly headers
  private readonly FIELD_TRANSLATIONS: Record<
    string,
    { ar: string; en: string }
  > = {
    // Common fields
    id: { ar: 'المعرف', en: 'ID' },
    publicId: { ar: 'الرقم العام', en: 'Public ID' },
    publicNumber: { ar: 'الرقم العام', en: 'Public Number' },
    name: { ar: 'الاسم', en: 'Name' },
    email: { ar: 'البريد الإلكتروني', en: 'Email' },
    phone: { ar: 'الهاتف', en: 'Phone' },
    dialCode: { ar: 'رمز الاتصال', en: 'Dial Code' },
    status: { ar: 'الحالة', en: 'Status' },
    createdAt: { ar: 'تاريخ الإنشاء', en: 'Created At' },
    updatedAt: { ar: 'تاريخ التحديث', en: 'Updated At' },
    deletedAt: { ar: 'تاريخ الحذف', en: 'Deleted At' },
    description: { ar: 'الوصف', en: 'Description' },

    // Verification fields
    emailVerified: { ar: 'البريد مؤكد', en: 'Email Verified' },
    phoneVerified: { ar: 'الهاتف مؤكد', en: 'Phone Verified' },
    isVerified: { ar: 'مؤكد', en: 'Verified' },
    verified: { ar: 'مؤكد', en: 'Verified' },
    verifiedAt: { ar: 'تاريخ التأكيد', en: 'Verified At' },

    // User/Provider fields
    firstName: { ar: 'الاسم الأول', en: 'First Name' },
    lastName: { ar: 'الاسم الأخير', en: 'Last Name' },
    fullName: { ar: 'الاسم الكامل', en: 'Full Name' },
    dateOfBirth: { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
    gender: { ar: 'الجنس', en: 'Gender' },
    avatar: { ar: 'الصورة الشخصية', en: 'Avatar' },
    avatarFilename: { ar: 'اسم ملف الصورة', en: 'Avatar Filename' },
    image: { ar: 'الصورة', en: 'Image' },
    imageUrl: { ar: 'رابط الصورة', en: 'Image URL' },
    photo: { ar: 'الصورة', en: 'Photo' },
    address: { ar: 'العنوان', en: 'Address' },
    nationalId: { ar: 'رقم الهوية', en: 'National ID' },
    deactivationReason: { ar: 'سبب الإيقاف', en: 'Deactivation Reason' },
    deleteReason: { ar: 'سبب الحذف', en: 'Delete Reason' },
    languageCode: { ar: 'رمز اللغة', en: 'Language Code' },
    language: { ar: 'اللغة', en: 'Language' },
    withAbsher: { ar: 'مع أبشر', en: 'With Absher' },

    // Location fields
    cityId: { ar: 'معرف المدينة', en: 'City ID' },
    countryId: { ar: 'معرف الدولة', en: 'Country ID' },
    city: { ar: 'المدينة', en: 'City' },
    country: { ar: 'الدولة', en: 'Country' },
    latitude: { ar: 'خط العرض', en: 'Latitude' },
    longitude: { ar: 'خط الطول', en: 'Longitude' },
    location: { ar: 'الموقع', en: 'Location' },

    // Category/Classification
    categoryId: { ar: 'معرف الفئة', en: 'Category ID' },
    category: { ar: 'الفئة', en: 'Category' },
    title: { ar: 'العنوان', en: 'Title' },
    nameEn: { ar: 'الاسم بالإنجليزية', en: 'Name (English)' },
    nameAr: { ar: 'الاسم بالعربية', en: 'Name (Arabic)' },
    titleEn: { ar: 'العنوان بالإنجليزية', en: 'Title (English)' },
    titleAr: { ar: 'العنوان بالعربية', en: 'Title (Arabic)' },
    descriptionEn: { ar: 'الوصف بالإنجليزية', en: 'Description (English)' },
    descriptionAr: { ar: 'الوصف بالعربية', en: 'Description (Arabic)' },

    // Listing fields
    price: { ar: 'السعر', en: 'Price' },
    duration: { ar: 'المدة', en: 'Duration' },
    serviceType: { ar: 'نوع الخدمة', en: 'Service Type' },
    providerId: { ar: 'معرف المزود', en: 'Provider ID' },
    provider: { ar: 'المزود', en: 'Provider' },

    // Contract/Payment fields
    amount: { ar: 'المبلغ', en: 'Amount' },
    paymentMethod: { ar: 'طريقة الدفع', en: 'Payment Method' },
    transactionId: { ar: 'رقم المعاملة', en: 'Transaction ID' },
    contractId: { ar: 'معرف العقد', en: 'Contract ID' },
    contractSignedAt: { ar: 'تاريخ التوقيع', en: 'Signed At' },
    contractExpiresAt: { ar: 'تاريخ الانتهاء', en: 'Expires At' },
    signedAt: { ar: 'تاريخ التوقيع', en: 'Signed At' },
    expiresAt: { ar: 'تاريخ الانتهاء', en: 'Expires At' },

    // Rating/Review fields
    rating: { ar: 'التقييم', en: 'Rating' },
    ratingValue: { ar: 'قيمة التقييم', en: 'Rating Value' },
    review: { ar: 'المراجعة', en: 'Review' },
    comment: { ar: 'التعليق', en: 'Comment' },
    userId: { ar: 'معرف المستخدم', en: 'User ID' },
    user: { ar: 'المستخدم', en: 'User' },

    // Complaint fields
    reason: { ar: 'السبب', en: 'Reason' },
    subject: { ar: 'الموضوع', en: 'Subject' },
    message: { ar: 'الرسالة', en: 'Message' },
    complaintType: { ar: 'نوع الشكوى', en: 'Complaint Type' },

    // Admin/Permission fields
    role: { ar: 'الدور', en: 'Role' },
    permissions: { ar: 'الصلاحيات', en: 'Permissions' },
    permissionId: { ar: 'معرف الصلاحية', en: 'Permission ID' },
    adminId: { ar: 'معرف المسؤول', en: 'Admin ID' },
    isActive: { ar: 'نشط', en: 'Active' },
    isEnabled: { ar: 'مفعل', en: 'Enabled' },
    enabled: { ar: 'مفعل', en: 'Enabled' },
    disabled: { ar: 'معطل', en: 'Disabled' },

    // Bank fields
    bankName: { ar: 'اسم البنك', en: 'Bank Name' },
    accountNumber: { ar: 'رقم الحساب', en: 'Account Number' },
    iban: { ar: 'رقم الآيبان', en: 'IBAN' },
    ibanNumber: { ar: 'رقم الآيبان', en: 'IBAN Number' },
    bankId: { ar: 'معرف البنك', en: 'Bank ID' },

    // Notification fields
    type: { ar: 'النوع', en: 'Type' },
    isRead: { ar: 'مقروء', en: 'Read' },
    readAt: { ar: 'تاريخ القراءة', en: 'Read At' },
    notificationType: { ar: 'نوع الإشعار', en: 'Notification Type' },

    // FAQ fields
    question: { ar: 'السؤال', en: 'Question' },
    questionEn: { ar: 'السؤال بالإنجليزية', en: 'Question (English)' },
    questionAr: { ar: 'السؤال بالعربية', en: 'Question (Arabic)' },
    answer: { ar: 'الجواب', en: 'Answer' },
    answerEn: { ar: 'الجواب بالإنجليزية', en: 'Answer (English)' },
    answerAr: { ar: 'الجواب بالعربية', en: 'Answer (Arabic)' },
    order: { ar: 'الترتيب', en: 'Order' },

    // Contact/Message fields
    contactId: { ar: 'معرف الاتصال', en: 'Contact ID' },
    sender: { ar: 'المرسل', en: 'Sender' },
    recipient: { ar: 'المستقبل', en: 'Recipient' },
    sentAt: { ar: 'تاريخ الإرسال', en: 'Sent At' },
    receivedAt: { ar: 'تاريخ الاستلام', en: 'Received At' },

    // Tracking/Delivery fields
    trackingNumber: { ar: 'رقم التتبع', en: 'Tracking Number' },
    deliveryStatus: { ar: 'حالة التسليم', en: 'Delivery Status' },
    deliveryCompanyId: { ar: 'معرف شركة التوصيل', en: 'Delivery Company ID' },
    deliveryCompany: { ar: 'شركة التوصيل', en: 'Delivery Company' },
    deliveredAt: { ar: 'تاريخ التسليم', en: 'Delivered At' },
    estimatedDelivery: { ar: 'التسليم المتوقع', en: 'Estimated Delivery' },

    // Settings fields
    key: { ar: 'المفتاح', en: 'Key' },
    value: { ar: 'القيمة', en: 'Value' },
    settingKey: { ar: 'مفتاح الإعداد', en: 'Setting Key' },
    settingValue: { ar: 'قيمة الإعداد', en: 'Setting Value' },

    // Favorite/Bookmark fields
    favoriteId: { ar: 'معرف المفضلة', en: 'Favorite ID' },
    listingId: { ar: 'معرف القائمة', en: 'Listing ID' },
    listing: { ar: 'القائمة', en: 'Listing' },
    isFavorite: { ar: 'مفضل', en: 'Is Favorite' },

    // Conversation fields
    conversationId: { ar: 'معرف المحادثة', en: 'Conversation ID' },
    participants: { ar: 'المشاركون', en: 'Participants' },
    lastMessage: { ar: 'آخر رسالة', en: 'Last Message' },
    lastMessageAt: { ar: 'تاريخ آخر رسالة', en: 'Last Message At' },

    // Publishing/Content fields
    publishedAt: { ar: 'تاريخ النشر', en: 'Published At' },
    isPublished: { ar: 'منشور', en: 'Published' },
    published: { ar: 'منشور', en: 'Published' },
    visibility: { ar: 'الظهور', en: 'Visibility' },
    featured: { ar: 'مميز', en: 'Featured' },
    isFeatured: { ar: 'مميز', en: 'Featured' },

    // Metadata
    metadata: { ar: 'البيانات الوصفية', en: 'Metadata' },
    tags: { ar: 'الوسوم', en: 'Tags' },
    notes: { ar: 'الملاحظات', en: 'Notes' },
    slug: { ar: 'الرابط المختصر', en: 'Slug' },
    url: { ar: 'الرابط', en: 'URL' },
  };

  /**
   * Convert data to CSV format and send as download
   * @param data - Array of objects to export
   * @param filename - Name of the CSV file (without extension)
   * @param res - Express response object
   * @param fields - Optional array of field names to include. If not provided, all fields are exported
   * @param language - Language for headers (ar or en), defaults to ar
   */
  exportToCsv<T extends Record<string, any>>(
    data: T[],
    filename: string,
    res: Response,
    fields?: string[],
    language: 'ar' | 'en' = 'ar',
  ): void {
    if (!data || data.length === 0) {
      res.status(200).send('No data to export');
      return;
    }

    // Deep clean all sensitive data from the entire data structure
    const cleanedData = data.map((row) => this.removeSensitiveData(row));

    // Get headers from first object or use provided fields
    let headers = fields || Object.keys(cleanedData[0]);

    // Always filter out sensitive fields from headers
    headers = this.filterSensitiveFields(headers);

    // Filter data to only include specified fields
    const filteredData = cleanedData.map((row) => {
      const filteredRow: Record<string, any> = {};
      headers.forEach((field) => {
        if (field in row) {
          filteredRow[field] = row[field] as unknown;
        }
      });
      return filteredRow;
    });

    // Create CSV content with translated headers
    const csvContent = this.convertToCSV(filteredData, headers, language);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.csv"`,
    );

    // Add BOM for proper UTF-8 encoding in Excel
    res.send('\uFEFF' + csvContent);
  }

  /**
   * Recursively remove sensitive data from objects and nested objects
   */
  private removeSensitiveData(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeSensitiveData(item));
    }

    // Handle objects
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const cleaned: Record<string, any> = {};

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Skip sensitive fields
          const lowerKey = key.toLowerCase();
          const isSensitive = this.SENSITIVE_FIELDS.some((sensitive) =>
            lowerKey.includes(sensitive.toLowerCase()),
          );

          if (!isSensitive) {
            // Recursively clean nested objects
            cleaned[key] = this.removeSensitiveData(obj[key]);
          }
        }
      }

      return cleaned;
    }

    // Return primitives as-is
    return obj;
  }

  /**
   * Filter out sensitive fields from the list of headers
   */
  private filterSensitiveFields(fields: string[]): string[] {
    return fields.filter((field) => {
      const lowerField = field.toLowerCase();
      return !this.SENSITIVE_FIELDS.some((sensitive) =>
        lowerField.includes(sensitive.toLowerCase()),
      );
    });
  }

  /**
   * Convert array of objects to CSV string
   */
  private convertToCSV<T extends Record<string, any>>(
    data: T[],
    headers: string[],
    language: 'ar' | 'en' = 'ar',
  ): string {
    // Create header row with translated headers
    const translatedHeaders = headers.map((h) =>
      this.translateFieldName(h, language),
    );
    const headerRow = translatedHeaders
      .map((h) => this.escapeCsvValue(h))
      .join(',');

    // Create data rows
    const dataRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header] as unknown;
          return this.escapeCsvValue(this.formatValue(value, language));
        })
        .join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Translate field name to user-friendly header
   */
  private translateFieldName(field: string, language: 'ar' | 'en'): string {
    const translation = this.FIELD_TRANSLATIONS[field];
    if (translation) {
      return translation[language];
    }

    // Fallback: convert camelCase to readable format
    if (language === 'ar') {
      return field; // Keep original for untranslated fields in Arabic
    }

    // Convert camelCase to Title Case for English
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format a value for CSV output
   */
  private formatValue(value: any, language: 'ar' | 'en' = 'ar'): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'boolean') {
      return this.formatBoolean(value, language);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Format date for user-friendly display
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Format: YYYY-MM-DD HH:mm
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * Format boolean for user-friendly display
   */
  private formatBoolean(value: boolean, language: 'ar' | 'en'): string {
    if (language === 'ar') {
      return value ? 'نعم' : 'لا';
    }
    return value ? 'Yes' : 'No';
  }

  /**
   * Escape CSV value to handle special characters
   */
  private escapeCsvValue(value: string): string {
    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}

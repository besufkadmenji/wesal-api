import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class CsvExportService {
  /**
   * Convert data to CSV format and send as download
   * @param data - Array of objects to export
   * @param filename - Name of the CSV file (without extension)
   * @param res - Express response object
   * @param fields - Optional array of field names to include. If not provided, all fields are exported
   */
  exportToCsv<T extends Record<string, any>>(
    data: T[],
    filename: string,
    res: Response,
    fields?: string[],
  ): void {
    if (!data || data.length === 0) {
      res.status(200).send('No data to export');
      return;
    }

    // Get headers from first object or use provided fields
    const headers = fields || Object.keys(data[0]);

    // Filter data to only include specified fields
    const filteredData = data.map((row) => {
      const filteredRow: Record<string, any> = {};
      headers.forEach((field) => {
        if (field in row) {
          filteredRow[field] = row[field] as unknown;
        }
      });
      return filteredRow;
    });

    // Create CSV content
    const csvContent = this.convertToCSV(filteredData, headers);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.csv"`,
    );

    res.send(csvContent);
  }

  /**
   * Convert array of objects to CSV string
   */
  private convertToCSV<T extends Record<string, any>>(
    data: T[],
    headers: string[],
  ): string {
    // Create header row
    const headerRow = headers.map((h) => this.escapeCsvValue(h)).join(',');

    // Create data rows
    const dataRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header] as unknown;
          return this.escapeCsvValue(this.formatValue(value));
        })
        .join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Format a value for CSV output
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
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

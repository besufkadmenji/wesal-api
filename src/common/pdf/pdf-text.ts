import * as path from 'path';

/**
 * Shared pdfkit text helpers for Arabic/English documents (reports,
 * invoices). Cairo covers Arabic and Latin, so mixed names render in both
 * languages (the Noto Arabic subset has no Latin letters or space).
 */
export const PDF_FONT = 'Cairo';

export const registerPdfFont = (document: PDFKit.PDFDocument): void => {
  document.registerFont(PDF_FONT, path.join(__dirname, 'fonts/Cairo.ttf'));
  document.font(PDF_FONT);
};

/**
 * pdfkit breaks text at spaces and shapes each Arabic word on its own,
 * which drops the gaps; non-breaking spaces keep a phrase in one run. That
 * run is laid out right-to-left with no bidi handling, so digit runs (with a
 * trailing %) are pre-reversed and brackets mirrored to read correctly.
 * Direction marks are always removed: Cairo has no glyph for them.
 * Non-Arabic text is otherwise returned unchanged.
 */
export const shapePdfText = (text: string): string => {
  const clean = text.replace(/[\u200E\u200F\u061C]/g, '');
  if (!/[\u0600-\u06FF]/.test(clean)) return clean;
  return clean
    .replace(/ /g, '\u00A0')
    .replace(/\d(?:[\d.,:/-]*\d)?%?/g, (digits) =>
      [...digits].reverse().join(''),
    )
    .replace(/[()]/g, (bracket) => (bracket === '(' ? ')' : '('));
};

/** Latin digits: pdfkit lays Arabic-Indic digits out right-to-left. */
export const formatPdfNumber = (value: number, fractionDigits?: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  }).format(value);

export const formatPdfDate = (
  value: Date,
  language: 'ar' | 'en',
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
) =>
  new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', {
    timeZone: 'Asia/Riyadh',
    ...options,
  }).format(value);

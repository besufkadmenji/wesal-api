import * as path from 'path';

/**
 * Shared pdfkit text helpers for Arabic/English documents (reports,
 * invoices). Cairo covers Arabic and Latin, so mixed names render in both
 * languages (the Noto Arabic subset has no Latin letters or space).
 */
export const PDF_FONT = 'Cairo';

const ARABIC = /[\u0600-\u06FF]/;

/**
 * pdfkit breaks text at spaces and shapes each Arabic word on its own,
 * which drops the gaps; non-breaking spaces keep an Arabic phrase in one
 * run. Direction marks are always removed: Cairo has no glyph for them.
 * Non-Arabic text is otherwise returned unchanged. The right-to-left
 * reordering happens per laid-out line in `registerPdfFont`.
 */
export const shapePdfText = (text: string): string => {
  const clean = text.replace(/[\u200E\u200F\u061C]/g, '');
  return ARABIC.test(clean) ? clean.replace(/ /g, '\u00A0') : clean;
};

/**
 * An Arabic run is laid out right-to-left with no bidi handling, so its
 * left-to-right segments (Latin words and digits, with the spaces and
 * punctuation between them) are pre-reversed and brackets mirrored.
 */
export const reorderArabicRun = (text: string): string =>
  text
    .replace(
      /[A-Za-z0-9](?:[A-Za-z0-9\u00A0 .,:/\-%#@_+'&]*[A-Za-z0-9%])?/g,
      (segment) => [...segment].reverse().join(''),
    )
    .replace(/[()]/g, (bracket) => (bracket === '(' ? ')' : '('));

type FontkitLayout = (
  text: string,
  features?: unknown,
  script?: string,
) => unknown;

export const registerPdfFont = (document: PDFKit.PDFDocument): void => {
  document.registerFont(PDF_FONT, path.join(__dirname, 'fonts/Cairo.ttf'));
  document.font(PDF_FONT);
  // H-34: pdfkit lays out each wrapped line as one run. fontkit picks the
  // run's script from its first letter, so an Arabic line starting with a
  // Latin word ("JFNA7483، حي …") came out unshaped and left-to-right, and
  // Latin read backwards when the reordering ran before wrapping. Each run
  // with Arabic is now reordered here and laid out as Arabic.
  const font = (
    document as unknown as { _font: { font: { layout: FontkitLayout } } }
  )._font.font;
  const layout = font.layout.bind(font) as FontkitLayout;
  font.layout = (text, features, script) =>
    script == null && ARABIC.test(text)
      ? layout(reorderArabicRun(text), features, 'arab')
      : layout(text, features, script);
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

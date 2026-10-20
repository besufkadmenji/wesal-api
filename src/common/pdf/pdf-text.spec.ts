import PDFDocument from 'pdfkit';
import {
  formatPdfNumber,
  registerPdfFont,
  reorderArabicRun,
  shapePdfText,
} from './pdf-text';

describe('shapePdfText', () => {
  it('leaves Latin text alone but drops direction marks', () => {
    expect(shapePdfText('Local Plumbing Co')).toBe('Local Plumbing Co');
    expect(shapePdfText('15‏/10‏/2026')).toBe('15/10/2026');
  });

  it('keeps an Arabic phrase in one run', () => {
    expect(shapePdfText('حي النزهة، Saudi Arabia')).toBe(
      'حي النزهة، Saudi Arabia',
    );
  });
});

describe('reorderArabicRun', () => {
  it('pre-reverses digits and mirrors brackets', () => {
    expect(reorderArabicRun('الضريبة (15%) 120')).toBe('الضريبة )%51( 021');
  });

  it('pre-reverses Latin words, not only digits (H-34)', () => {
    expect(reorderArabicRun('حي النزهة، Saudi Arabia')).toBe(
      'حي النزهة، aibarA iduaS',
    );
    expect(reorderArabicRun('JFNA7483، 7483 جدة')).toBe('3847ANFJ، 3847 جدة');
  });
});

describe('registerPdfFont', () => {
  const codePoints = (document: PDFKit.PDFDocument, text: string) => {
    const font = (
      document as unknown as {
        _font: {
          font: {
            layout: (text: string) => {
              glyphs: { codePoints: number[] }[];
            };
          };
        };
      }
    )._font.font;
    return font
      .layout(text)
      .glyphs.flatMap((glyph) => glyph.codePoints)
      .map((code) => String.fromCodePoint(code))
      .join('');
  };

  it('lays out an Arabic line as Arabic even when it starts in Latin (H-34)', () => {
    const document = new PDFDocument();
    registerPdfFont(document);
    // Right-to-left glyph order: the Latin word reads correctly at the end.
    expect(codePoints(document, 'ABC جدة')).toMatch(/ABC$/);
    // A wrapped line with no Arabic stays left-to-right and unchanged.
    expect(codePoints(document, '23536, Saudi Arabia')).toBe(
      '23536, Saudi Arabia',
    );
  });
});

describe('formatPdfNumber', () => {
  it('uses Latin digits with fixed decimals when asked', () => {
    expect(formatPdfNumber(1234.5, 2)).toBe('1,234.50');
  });
});

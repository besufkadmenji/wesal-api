import { formatPdfNumber, shapePdfText } from './pdf-text';

describe('shapePdfText', () => {
  it('leaves Latin text alone but drops direction marks', () => {
    expect(shapePdfText('Local Plumbing Co')).toBe('Local Plumbing Co');
    expect(shapePdfText('15‏/10‏/2026')).toBe('15/10/2026');
  });

  it('keeps Arabic phrases in one run with digits and brackets readable', () => {
    expect(shapePdfText('الضريبة (15%) 120')).toBe('الضريبة )%51( 021');
  });
});

describe('formatPdfNumber', () => {
  it('uses Latin digits with fixed decimals when asked', () => {
    expect(formatPdfNumber(1234.5, 2)).toBe('1,234.50');
  });
});

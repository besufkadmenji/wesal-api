import { existsSync } from 'fs';
import PDFDocument from 'pdfkit';
import { applyWatermark, drawLogo, PDF_LOGO_PATH } from './pdf-brand';

/** UI-15: logo and a faint centred watermark on generated PDFs. */
describe('pdf-brand', () => {
  it('ships the logo asset', () => {
    expect(existsSync(PDF_LOGO_PATH)).toBe(true);
  });

  it('draws the watermark on every page, faint and centred', () => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const image = jest.spyOn(doc, 'image');
    const opacity = jest.spyOn(doc, 'opacity');
    applyWatermark(doc, { opacity: 0.05, widthRatio: 0.5 });
    doc.text('page one');
    doc.addPage();
    doc.text('page two');
    doc.end();

    expect(image).toHaveBeenCalledTimes(2);
    expect(opacity).toHaveBeenCalledWith(0.05);
    const [, x, , options] = image.mock.calls[0] as [
      string,
      number,
      number,
      { width: number },
    ];
    expect(options.width).toBeCloseTo(doc.page.width * 0.5);
    expect(x).toBeCloseTo((doc.page.width - options.width) / 2);
  });

  it('keeps the text cursor where it was', () => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const before = { x: doc.x, y: doc.y };
    applyWatermark(doc);
    expect({ x: doc.x, y: doc.y }).toEqual(before);
    const width = drawLogo(doc, { x: 40, y: 20, height: 40 });
    expect(width).toBeGreaterThan(40);
    doc.end();
  });
});

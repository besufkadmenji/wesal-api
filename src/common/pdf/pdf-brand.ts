import { existsSync } from 'fs';
import * as path from 'path';

/**
 * UI-15: Wesal branding for generated PDFs. The logo is the navy brand mark
 * (assets/logo.png, copied to dist by nest-cli like the fonts).
 */
const BUILT_LOGO = path.join(__dirname, 'assets/logo.png');
// A watch-mode server started before the asset existed hasn't copied it to
// dist yet; fall back to the source copy.
export const PDF_LOGO_PATH = existsSync(BUILT_LOGO)
  ? BUILT_LOGO
  : path.join(process.cwd(), 'src/common/pdf/assets/logo.png');

/** Logo aspect ratio (width / height) of assets/logo.png. */
const LOGO_RATIO = 636 / 492;

/** Same palette as the admin (navy accent, soft tint, neutral ink). */
export const PDF_BRAND = {
  accent: '#22283A',
  accentDark: '#22283A',
  soft: '#EFF1F6',
  ink: '#111827',
  muted: '#667085',
  border: '#E5E7EB',
  stripe: '#F9FAFB',
  white: '#FFFFFF',
} as const;

/** Draws the logo with its top-left corner at (x, y). Returns its width. */
export const drawLogo = (
  doc: PDFKit.PDFDocument,
  { x, y, height }: { x: number; y: number; height: number },
): number => {
  const width = height * LOGO_RATIO;
  doc.image(PDF_LOGO_PATH, x, y, { width, height });
  return width;
};

/**
 * A barely visible logo centred on every page, drawn before the page's
 * content so it stays behind it. Call right after creating the document.
 */
export const applyWatermark = (
  doc: PDFKit.PDFDocument,
  { opacity = 0.035, widthRatio = 0.5 } = {},
): void => {
  const draw = () => {
    const width = doc.page.width * widthRatio;
    const height = width / LOGO_RATIO;
    const x = (doc.page.width - width) / 2;
    const y = (doc.page.height - height) / 2;
    // Drawing moves the text cursor; keep it where the page expects it.
    const cursor = { x: doc.x, y: doc.y };
    doc.save();
    doc.opacity(opacity);
    doc.image(PDF_LOGO_PATH, x, y, { width, height });
    doc.restore();
    doc.x = cursor.x;
    doc.y = cursor.y;
  };
  draw();
  doc.on('pageAdded', draw);
};

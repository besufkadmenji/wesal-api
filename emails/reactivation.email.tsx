import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReactivationEmailLocale = 'en' | 'ar';

export interface ReactivationEmailProps {
  /** Recipient's display name */
  name?: string;
  /** UI language – determines direction and copy */
  locale?: ReactivationEmailLocale;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const copy: Record<
  ReactivationEmailLocale,
  {
    dir: 'ltr' | 'rtl';
    preview: string;
    greeting: (n?: string) => string;
    body: string;
    closing: string;
    note: string;
    footerBrand: string;
    footerTagline: string;
    footerNote: string;
  }
> = {
  en: {
    dir: 'ltr',
    preview: 'Your Wesal service provider account has been reactivated',
    greeting: (name?: string) => (name ? `Hello, ${name}` : 'Hello'),
    body: 'Great news! Your service provider account on Wesal has been reactivated by the platform administrator. You can now sign in and begin the contract signing process to resume offering your services.',
    closing:
      'Welcome back to Wesal. We look forward to working with you again.',
    note: 'Please note that a new contract signing is required before you can fully resume your activities.',
    footerBrand: 'Wesal',
    footerTagline: 'Connecting People, Simplifying Lives.',
    footerNote: '© 2026 Wesal. All rights reserved.',
  },
  ar: {
    dir: 'rtl',
    preview: 'تم إعادة تفعيل حسابك كمقدم خدمة في وصال',
    greeting: (name?: string) => (name ? `مرحباً، ${name}` : 'مرحباً'),
    body: 'خبر سار! لقد تمت إعادة تفعيل حسابك كمقدم خدمة في وصال من قِبل مدير المنصة. يمكنك الآن تسجيل الدخول والبدء في عملية توقيع العقد لاستئناف تقديم خدماتك.',
    closing: 'أهلاً بعودتك إلى وصال. نتطلع إلى العمل معك مرة أخرى.',
    note: 'يُرجى العلم بأن توقيع عقد جديد مطلوب قبل أن تتمكن من استئناف نشاطك بشكل كامل.',
    footerBrand: 'وصال',
    footerTagline: 'نربط الناس ونبسّط حياتهم.',
    footerNote: '© 2026 وصال. جميع الحقوق محفوظة.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReactivationEmail({
  name,
  locale = 'en',
}: ReactivationEmailProps) {
  const loc = copy[locale];
  const isRTL = loc.dir === 'rtl';

  return (
    <Html dir={loc.dir} lang={locale}>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>

      <Preview>{loc.preview}</Preview>

      <Body style={styles.body}>
        <Container style={styles.card}>
          {/* Logo bar */}
          <Section style={styles.logoBar}>
            <Img
              src="https://wesal-api.testing3000.cloud/files/wesal.logo.png"
              alt="Wesal"
              style={styles.logoImg}
            />
          </Section>

          {/* Main content */}
          <Section style={styles.content}>
            <Heading
              as="h1"
              style={{ ...styles.heading, textAlign: isRTL ? 'right' : 'left' }}
            >
              {loc.greeting(name)} 🎉
            </Heading>

            <Text
              style={{
                ...styles.paragraph,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.body}
            </Text>

            <Text
              style={{
                ...styles.closing,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.closing}
            </Text>

            <Text
              style={{
                ...styles.note,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.note}
            </Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerBrand}>{loc.footerBrand}</Text>
            <Text style={styles.footerTagline}>{loc.footerTagline}</Text>
            <Text style={styles.footerNote}>{loc.footerNote}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: '#f4f5f7',
    fontFamily: "'Inter', Arial, sans-serif",
    margin: '0',
    padding: '40px 0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    maxWidth: '520px',
    margin: '0 auto',
    overflow: 'hidden' as const,
  },
  logoBar: {
    backgroundColor: '#22283A',
    padding: '20px 32px',
    textAlign: 'center' as const,
  },
  logoImg: {
    display: 'block',
    margin: '0 auto',
    height: '64px',
    width: 'auto',
  },
  content: {
    padding: '32px 40px 24px',
  },
  heading: {
    color: '#111827',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 16px',
  },
  paragraph: {
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 20px',
  },
  closing: {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.7',
    margin: '0 0 12px',
  },
  note: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    color: '#14532d',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0',
    padding: '12px 16px',
  },
  divider: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  footer: {
    padding: '24px 40px',
    textAlign: 'center' as const,
  },
  footerBrand: {
    color: '#374151',
    fontSize: '15px',
    fontWeight: '700',
    margin: '0 0 4px',
  },
  footerTagline: {
    color: '#9ca3af',
    fontSize: '13px',
    margin: '0 0 8px',
  },
  footerNote: {
    color: '#d1d5db',
    fontSize: '11px',
    margin: '0',
  },
} as const;

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

export type TerminationEmailLocale = 'en' | 'ar';

export interface TerminationEmailProps {
  /** Recipient's display name */
  name?: string;
  /** Reason for the termination provided by the admin */
  reason: string;
  /** UI language – determines direction and copy */
  locale?: TerminationEmailLocale;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const copy: Record<
  TerminationEmailLocale,
  {
    dir: 'ltr' | 'rtl';
    preview: string;
    greeting: (n?: string) => string;
    body: string;
    reasonLabel: string;
    closing: string;
    note: string;
    footerBrand: string;
    footerTagline: string;
    footerNote: string;
  }
> = {
  en: {
    dir: 'ltr',
    preview: 'Your Wesal service provider contract has been terminated',
    greeting: (name?: string) => (name ? `Hello, ${name}` : 'Hello'),
    body: 'We are writing to inform you that your service provider contract with Wesal has been terminated by the platform administrator. As a result, your account has been temporarily deactivated.',
    reasonLabel: 'Reason for Termination',
    closing:
      'If you believe this action was taken in error, or if you have any questions, please contact our support team.',
    note: 'Your account may be reactivated by an administrator if the matter is resolved.',
    footerBrand: 'Wesal',
    footerTagline: 'Connecting People, Simplifying Lives.',
    footerNote: '© 2026 Wesal. All rights reserved.',
  },
  ar: {
    dir: 'rtl',
    preview: 'تم إنهاء عقدك كمقدم خدمة في وصال',
    greeting: (name?: string) => (name ? `مرحباً، ${name}` : 'مرحباً'),
    body: 'نكتب إليك لإعلامك بأن عقدك كمقدم خدمة في وصال قد تم إنهاؤه من قِبل مدير المنصة. نتيجةً لذلك، تم تعليق حسابك مؤقتاً.',
    reasonLabel: 'سبب الإنهاء',
    closing:
      'إذا كنت تعتقد أن هذا الإجراء تم بالخطأ، أو إذا كان لديك أي استفسار، يرجى التواصل مع فريق الدعم.',
    note: 'يمكن إعادة تفعيل حسابك من قِبل المدير في حال حُلّت المشكلة.',
    footerBrand: 'وصال',
    footerTagline: 'نربط الناس ونبسّط حياتهم.',
    footerNote: '© 2026 وصال. جميع الحقوق محفوظة.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerminationEmail({
  name,
  reason = 'N/A',
  locale = 'en',
}: TerminationEmailProps) {
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
              {loc.greeting(name)} 👋
            </Heading>

            <Text
              style={{
                ...styles.paragraph,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.body}
            </Text>

            {/* Reason box */}
            <Text
              style={{
                ...styles.reasonLabel,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.reasonLabel}
            </Text>
            <Section style={styles.reasonBox}>
              <Text
                style={{
                  ...styles.reasonText,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {reason}
              </Text>
            </Section>

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
  reasonLabel: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  reasonBox: {
    backgroundColor: '#fff5f5',
    border: '1.5px solid #fca5a5',
    borderRadius: '10px',
    margin: '0 0 24px',
    padding: '16px 20px',
  },
  reasonText: {
    color: '#7f1d1d',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
  },
  closing: {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.7',
    margin: '0 0 12px',
  },
  note: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    color: '#78350f',
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

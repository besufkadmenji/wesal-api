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

export type ReplyEmailLocale = 'en' | 'ar';

export interface ReplyEmailProps {
  /** Recipient's display name */
  name?: string;
  /** The user's original message */
  originalMessage: string;
  /** Admin's reply message */
  reply: string;
  /** UI language – determines direction and copy */
  locale?: ReplyEmailLocale;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const copy: Record<
  ReplyEmailLocale,
  {
    dir: 'ltr' | 'rtl';
    preview: string;
    greeting: (n?: string) => string;
    body: string;
    originalLabel: string;
    replyLabel: string;
    closing: string;
    footerBrand: string;
    footerTagline: string;
    footerNote: string;
  }
> = {
  en: {
    dir: 'ltr',
    preview: 'You have a reply from Wesal support',
    greeting: (name?: string) => (name ? `Hello, ${name}` : 'Hello'),
    body: 'Thank you for reaching out to us. Our team has reviewed your message and here is our response:',
    originalLabel: 'Your Message',
    replyLabel: 'Our Reply',
    closing:
      'If you have any further questions, feel free to contact us again.',
    footerBrand: 'Wesal',
    footerTagline: 'Connecting People, Simplifying Lives.',
    footerNote: '© 2026 Wesal. All rights reserved.',
  },
  ar: {
    dir: 'rtl',
    preview: 'لديك رد من فريق دعم وصال',
    greeting: (name?: string) => (name ? `مرحباً، ${name}` : 'مرحباً'),
    body: 'شكراً لتواصلك معنا. قام فريقنا بمراجعة رسالتك وإليك ردنا:',
    originalLabel: 'رسالتك',
    replyLabel: 'ردنا',
    closing: 'إذا كان لديك أي أسئلة إضافية، لا تتردد في التواصل معنا مجدداً.',
    footerBrand: 'وصال',
    footerTagline: 'نربط الناس ونبسّط حياتهم.',
    footerNote: '© 2026 وصال. جميع الحقوق محفوظة.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReplyEmail({
  name,
  originalMessage = 'N/A',
  reply = 'N/A',
  locale = 'en',
}: ReplyEmailProps) {
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

            {/* Original message */}
            <Text
              style={{
                ...styles.boxLabel,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.originalLabel}
            </Text>
            <Section style={styles.originalBox}>
              <Text
                style={{
                  ...styles.originalText,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {originalMessage}
              </Text>
            </Section>

            {/* Reply */}
            <Text
              style={{
                ...styles.boxLabel,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.replyLabel}
            </Text>
            <Section style={styles.replyBox}>
              <Text
                style={{
                  ...styles.replyText,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {reply}
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
  boxLabel: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  originalBox: {
    backgroundColor: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    margin: '0 0 24px',
    padding: '16px 20px',
  },
  originalText: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0',
  },
  replyBox: {
    backgroundColor: '#f0f5ff',
    border: '1.5px solid #93c5fd',
    borderRadius: '10px',
    margin: '0 0 24px',
    padding: '16px 20px',
  },
  replyText: {
    color: '#1e3a5f',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
  },
  closing: {
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

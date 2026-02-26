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

export type VerifyEmailLocale = 'en' | 'ar';

export type VerifyEmailType = 'email_verification' | 'password_reset';

export interface VerifyEmailProps {
  /** Recipient's display name */
  name?: string;
  /** 4-digit OTP / verification code */
  code: string;
  /** UI language – determines direction and copy */
  locale?: VerifyEmailLocale;
  /** Email purpose – controls copy */
  type?: VerifyEmailType;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const copy: Record<
  VerifyEmailLocale,
  Record<
    VerifyEmailType,
    {
      preview: string;
      greeting: (n?: string) => string;
      body: string;
      codeLabel: string;
    }
  > & {
    dir: 'ltr' | 'rtl';
    warning: string;
    footerBrand: string;
    footerTagline: string;
    footerNote: string;
  }
> = {
  en: {
    dir: 'ltr',
    email_verification: {
      preview: 'Your Wesal verification code',
      greeting: (name?: string) => (name ? `Hello, ${name}` : 'Hello'),
      body: 'Use the code below to verify your email address. This code will expire in 10 minutes.',
      codeLabel: 'Verification Code',
    },
    password_reset: {
      preview: 'Reset your Wesal password',
      greeting: (name?: string) => (name ? `Hello, ${name}` : 'Hello'),
      body: 'Use the code below to reset your password. This code will expire in 10 minutes.',
      codeLabel: 'Reset Code',
    },
    warning: 'If you did not request this, you can safely ignore this email.',
    footerBrand: 'Wesal',
    footerTagline: 'Connecting People, Simplifying Lives.',
    footerNote: '© 2026 Wesal. All rights reserved.',
  },
  ar: {
    dir: 'rtl',
    email_verification: {
      preview: 'رمز التحقق الخاص بك في وصال',
      greeting: (name?: string) => (name ? `مرحباً، ${name}` : 'مرحباً'),
      body: 'استخدم الرمز أدناه للتحقق من عنوان بريدك الإلكتروني. سينتهي صلاحية هذا الرمز خلال 10 دقائق.',
      codeLabel: 'رمز التحقق',
    },
    password_reset: {
      preview: 'إعادة تعيين كلمة مرور وصال',
      greeting: (name?: string) => (name ? `مرحباً، ${name}` : 'مرحباً'),
      body: 'استخدم الرمز أدناه لإعادة تعيين كلمة مرورك. سينتهي صلاحية هذا الرمز خلال 10 دقائق.',
      codeLabel: 'رمز الاسترداد',
    },
    warning: 'إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
    footerBrand: 'وصال',
    footerTagline: 'نربط الناس ونبسّط حياتهم.',
    footerNote: '© 2026 وصال. جميع الحقوق محفوظة.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyEmail({
  name,
  code = '1234',
  locale = 'ar',
  type = 'email_verification',
}: VerifyEmailProps) {
  const loc = copy[locale];
  const t = loc[type];
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

      <Preview>{t.preview}</Preview>

      <Body style={styles.body}>
        {/* ── Card ── */}
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
              {t.greeting(name)} 👋
            </Heading>

            <Text
              style={{
                ...styles.paragraph,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t.body}
            </Text>

            {/* Code label */}
            <Text
              style={{
                ...styles.codeLabel,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t.codeLabel}
            </Text>

            {/* OTP box */}
            <Section style={styles.otpWrapper}>
              <Text style={styles.otpCode}>{code}</Text>
            </Section>

            {/* Warning */}
            <Text
              style={{
                ...styles.warning,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {loc.warning}
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

  // ── Logo bar ──
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

  // ── Content ──
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
    margin: '0 0 24px',
  },
  codeLabel: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },

  // ── OTP ──
  otpWrapper: {
    backgroundColor: '#f0f5ff',
    border: '1.5px dashed #22283A',
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '20px 0',
    textAlign: 'center' as const,
  },
  otpCode: {
    color: '#22283A',
    fontSize: '40px',
    fontWeight: '800',
    letterSpacing: '12px',
    margin: '0',
    fontVariantNumeric: 'tabular-nums',
  },

  // ── Warning ──
  warning: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0',
    padding: '12px 16px',
  },

  // ── Divider ──
  divider: {
    borderColor: '#e5e7eb',
    margin: '0',
  },

  // ── Footer ──
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

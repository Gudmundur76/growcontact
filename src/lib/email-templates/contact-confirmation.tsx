import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Grow'

interface ContactConfirmationProps {
  name?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, message }: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for reaching out to {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Thanks, ${name}.` : 'Thanks for reaching out.'}
        </Heading>
        <Text style={text}>
          We received your message and a {SITE_NAME} specialist will get back
          to you within one business day.
        </Text>
        {message ? (
          <>
            <Text style={label}>Your message</Text>
            <Text style={quote}>{message}</Text>
          </>
        ) : null}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: `Thanks for contacting ${SITE_NAME}`,
  displayName: 'Contact form confirmation',
  previewData: {
    name: 'Alex',
    message: 'We are looking to hire 20 engineers next quarter.',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: '"Geist Sans", Inter, system-ui, sans-serif',
  margin: 0,
  padding: '40px 0',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
  borderRadius: '16px',
  border: '1px solid #ececec',
  backgroundColor: '#ffffff',
}
const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#0a0a0f',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#3f3f46',
  margin: '0 0 20px',
}
const label: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#8a8a93',
  margin: '24px 0 8px',
}
const quote: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.6,
  color: '#27272a',
  margin: '0 0 24px',
  padding: '14px 16px',
  borderLeft: '3px solid #7c3aed',
  backgroundColor: '#faf9ff',
  borderRadius: '6px',
  whiteSpace: 'pre-wrap',
}
const footer: React.CSSProperties = {
  fontSize: '13px',
  color: '#8a8a93',
  margin: '32px 0 0',
}
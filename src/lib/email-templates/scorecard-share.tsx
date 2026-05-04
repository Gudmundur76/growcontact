import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brand } from './_brand'

const SITE_NAME = 'Grow'

interface ScorecardShareProps {
  candidateName?: string
  roleTitle?: string
  shareUrl?: string
  senderName?: string
  expiresAt?: string
}

const ScorecardShareEmail = ({
  candidateName, roleTitle, shareUrl, senderName, expiresAt,
}: ScorecardShareProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Interview scorecard for {candidateName ?? 'a candidate'}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.brandMark}>{SITE_NAME}</Text>
        <Heading style={brand.h1}>
          Scorecard for {candidateName ?? 'a candidate'}
        </Heading>
        <Text style={brand.text}>
          {senderName ? `${senderName} shared` : 'Someone shared'} an interview
          scorecard with you{roleTitle ? ` for the ${roleTitle} role` : ''}.
          Click below to review the full evaluation.
        </Text>
        <Button style={brand.button} href={shareUrl ?? '#'}>Open scorecard</Button>
        <Text style={brand.footer}>
          {expiresAt
            ? `This link expires on ${new Date(expiresAt).toLocaleDateString()}.`
            : 'This link may expire — open it soon.'}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ScorecardShareEmail,
  subject: (d: Record<string, unknown>) =>
    `Interview scorecard: ${String(d.candidateName ?? 'candidate')}`,
  displayName: 'Scorecard share link',
  previewData: {
    candidateName: 'Jamie Chen',
    roleTitle: 'Senior Engineer',
    shareUrl: 'https://grow.contact/share/scorecard/example',
    senderName: 'Alex',
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
} satisfies TemplateEntry
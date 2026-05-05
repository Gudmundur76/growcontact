import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brand } from './_brand'

const SITE_NAME = 'Grow'

interface ScorecardRecapProps {
  candidateName?: string
  roleTitle?: string
  overallRating?: number | null
  recommendation?: string | null
  summary?: string
  strengths?: string[]
  concerns?: string[]
  competencies?: { name: string; rating: number; notes: string }[]
  followUps?: string[]
  sessionUrl?: string
}

const recRow = { fontSize: '14px', color: '#3f3f46', margin: '0 0 8px' }
const sectionHeading = {
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#7c3aed',
  margin: '24px 0 8px',
}
const li = { fontSize: '14px', color: '#3f3f46', margin: '0 0 6px', lineHeight: 1.5 }

const ScorecardRecapEmail = ({
  candidateName, roleTitle, overallRating, recommendation,
  summary, strengths = [], concerns = [], competencies = [], followUps = [], sessionUrl,
}: ScorecardRecapProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Scorecard recap — {candidateName ?? 'candidate'}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.brandMark}>{SITE_NAME}</Text>
        <Heading style={brand.h1}>
          Scorecard — {candidateName ?? 'Candidate'}
        </Heading>
        {roleTitle && <Text style={recRow}><strong>Role:</strong> {roleTitle}</Text>}
        <Text style={recRow}>
          <strong>Overall:</strong> {overallRating ?? '—'}/5
          {recommendation ? ` · ${recommendation.replace(/_/g, ' ')}` : ''}
        </Text>
        {summary && (
          <Section>
            <Text style={sectionHeading}>Summary</Text>
            <Text style={brand.text}>{summary}</Text>
          </Section>
        )}
        {strengths.length > 0 && (
          <Section>
            <Text style={sectionHeading}>Strengths</Text>
            {strengths.map((s, i) => <Text key={i} style={li}>• {s}</Text>)}
          </Section>
        )}
        {concerns.length > 0 && (
          <Section>
            <Text style={sectionHeading}>Concerns</Text>
            {concerns.map((s, i) => <Text key={i} style={li}>• {s}</Text>)}
          </Section>
        )}
        {competencies.length > 0 && (
          <Section>
            <Text style={sectionHeading}>Competencies</Text>
            {competencies.map((c, i) => (
              <Text key={i} style={li}>
                <strong>{c.name}</strong> — {c.rating}/5 · {c.notes}
              </Text>
            ))}
          </Section>
        )}
        {followUps.length > 0 && (
          <Section>
            <Text style={sectionHeading}>Follow-up questions</Text>
            {followUps.map((s, i) => <Text key={i} style={li}>• {s}</Text>)}
          </Section>
        )}
        {sessionUrl && (
          <>
            <Hr style={{ borderColor: '#ececec', margin: '28px 0 16px' }} />
            <Text style={brand.footer}>
              Open the full session: <a href={sessionUrl} style={brand.link}>{sessionUrl}</a>
            </Text>
          </>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ScorecardRecapEmail,
  subject: (d: Record<string, unknown>) =>
    `Scorecard recap: ${String(d.candidateName ?? 'candidate')}`,
  displayName: 'Scorecard recap (post-call)',
  previewData: {
    candidateName: 'Jamie Chen',
    roleTitle: 'Senior Engineer',
    overallRating: 4,
    recommendation: 'hire',
    summary: 'Strong technical fundamentals, clear communicator, solid systems thinking.',
    strengths: ['Clear architectural reasoning', 'Excellent debugging walkthrough'],
    concerns: ['Limited exposure to large-scale data pipelines'],
    competencies: [
      { name: 'System design', rating: 4, notes: 'Articulated tradeoffs well.' },
      { name: 'Communication', rating: 5, notes: 'Concise, structured answers.' },
    ],
    followUps: ['How would they approach on-call ownership?'],
    sessionUrl: 'https://grow.contact/interview/example',
  },
} satisfies TemplateEntry
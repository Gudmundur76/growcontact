import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { brand } from "./_brand";

interface OutreachProps {
  subject?: string;
  body?: string;
  senderName?: string;
  candidateName?: string;
}

const OutreachEmail = ({ subject, body, senderName }: OutreachProps) => {
  const paragraphs = (body ?? "").split(/\n{2,}/).filter(Boolean);
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject ?? "A note from Grow"}</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>{subject ?? "Hello"}</Heading>
          {paragraphs.map((p, i) => (
            <Text key={i} style={brand.text}>
              {p}
            </Text>
          ))}
          {senderName ? <Text style={brand.text}>— {senderName}</Text> : null}
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: OutreachEmail,
  subject: (d: Record<string, unknown>) => String(d.subject ?? "A quick note"),
  displayName: "Recruiter outreach",
  previewData: {
    subject: "Loved your work on react-router",
    body: "Hi Jamie,\n\nYour OSS work on react-router caught our eye — we are hiring a senior engineer focused on developer experience and would love to chat.\n\nOpen to a 15-min intro this week?",
    senderName: "Alex from Grow",
    candidateName: "Jamie",
  },
} satisfies TemplateEntry;

import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { brand } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.brandMark}>{siteName}</Text>
        <Heading style={brand.h1}>Confirm your email</Heading>
        <Text style={brand.text}>
          Welcome to{' '}
          <Link href={siteUrl} style={brand.link}>{siteName}</Link>. Confirm your address ({recipient}) to finish setting up your account.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>Verify email</Button>
        <Text style={brand.footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

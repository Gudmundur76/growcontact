import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { brand } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.brandMark}>{siteName}</Text>
        <Heading style={brand.h1}>Reset your password</Heading>
        <Text style={brand.text}>
          We received a request to reset your password. Click the button below to choose a new one. The link expires shortly.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>Reset password</Button>
        <Text style={brand.footer}>
          If you didn't request a password reset, you can safely ignore this email — your password won't change.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

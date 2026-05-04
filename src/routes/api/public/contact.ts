import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/components'
import * as React from 'react'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Grow'
const SENDER_DOMAIN = 'notify.grow.contact'
const FROM_DOMAIN = 'grow.contact'

// Best-effort in-memory rate limit (per Worker instance).
// Caps abuse from any single IP and any single recipient address.
const ipBuckets = new Map<string, { count: number; reset: number }>()
const emailBuckets = new Map<string, { count: number; reset: number }>()
function hit(
  bucket: Map<string, { count: number; reset: number }>,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const b = bucket.get(key)
  if (!b || b.reset < now) {
    bucket.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  team_size: z.string().trim().max(50).optional().or(z.literal('')),
  message: z.string().trim().min(1).max(5000),
  user_agent: z.string().max(500).optional().nullable(),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const ip =
          request.headers.get('cf-connecting-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          'unknown'
        // Cap: 5 submissions / IP / hour
        if (!hit(ipBuckets, ip, 5, 60 * 60 * 1000)) {
          return Response.json({ error: 'Too many requests' }, { status: 429 })
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const parsed = schema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
            { status: 400 },
          )
        }
        const data = parsed.data
        // Cap: 3 confirmation emails / recipient / day (anti-harassment)
        if (!hit(emailBuckets, data.email.toLowerCase(), 3, 24 * 60 * 60 * 1000)) {
          return Response.json({ error: 'Too many requests' }, { status: 429 })
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Persist submission
        const { data: inserted, error: insertError } = await supabase
          .from('contact_submissions')
          .insert({
            name: data.name,
            email: data.email,
            company: data.company || null,
            team_size: data.team_size || null,
            message: data.message,
            user_agent: data.user_agent ?? null,
          })
          .select('id')
          .maybeSingle()
        if (insertError || !inserted) {
          console.error('contact_submissions insert failed', insertError)
          return Response.json({ error: 'Could not save submission' }, { status: 500 })
        }

        // 2. Best-effort confirmation email — don't fail the request if email fails.
        try {
          const template = TEMPLATES['contact-confirmation']
          if (!template) throw new Error('Template missing')

          const recipient = data.email.toLowerCase()

          // Suppression check
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', recipient)
            .maybeSingle()
          if (suppressed) {
            return Response.json({ success: true, id: inserted.id, emailSent: false })
          }

          // Get or create unsubscribe token
          let unsubscribeToken: string
          const { data: existingToken } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token, used_at')
            .eq('email', recipient)
            .maybeSingle()
          if (existingToken && !existingToken.used_at) {
            unsubscribeToken = existingToken.token
          } else {
            unsubscribeToken = generateToken()
            await supabase
              .from('email_unsubscribe_tokens')
              .upsert(
                { token: unsubscribeToken, email: recipient },
                { onConflict: 'email', ignoreDuplicates: true },
              )
            const { data: stored } = await supabase
              .from('email_unsubscribe_tokens')
              .select('token')
              .eq('email', recipient)
              .maybeSingle()
            if (stored?.token) unsubscribeToken = stored.token
          }

          const element = React.createElement(template.component, {
            name: data.name,
            message: data.message,
          })
          const html = await render(element)
          const text = await render(element, { plainText: true })
          const subject =
            typeof template.subject === 'function'
              ? template.subject({ name: data.name })
              : template.subject

          const messageId = crypto.randomUUID()
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'contact-confirmation',
            recipient_email: data.email,
            status: 'pending',
          })

          await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              message_id: messageId,
              to: data.email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: 'transactional',
              label: 'contact-confirmation',
              idempotency_key: `contact-confirm-${inserted.id}`,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })
        } catch (e) {
          console.error('Failed to enqueue contact confirmation email', e)
        }

        return Response.json({ success: true, id: inserted.id })
      },
    },
  },
})
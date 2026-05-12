// Thin wrapper around Resend. Falls back to console logging when RESEND_API_KEY
// is missing (e.g. local dev) so flows are still testable.
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || 'BarberBook <onboarding@resend.dev>'
const appUrl = process.env.APP_URL || 'http://localhost:5173'

const resend = apiKey ? new Resend(apiKey) : null

async function send(to: string, subject: string, html: string, text: string) {
  if (!resend) {
    console.log('\n──────── EMAIL (RESEND_API_KEY not set; logging instead) ────────')
    console.log(`To:      ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body:    ${text}`)
    console.log('─────────────────────────────────────────────────────────────────\n')
    return
  }
  try {
    await resend.emails.send({ from: fromEmail, to, subject, html, text })
  } catch (err) {
    console.error('[email] Resend send failed:', err)
    // Don't throw — caller should not fail the whole request if email blips
  }
}

export function getAppUrl() {
  return appUrl
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const subject = 'Verify your BarberBook account'
  const text = `Hi ${name},

Welcome to BarberBook! Your email verification code is:

  ${code}

Enter this code in the app to verify your email. The code expires in 1 hour.

If you didn't sign up for BarberBook, you can safely ignore this email.

— The BarberBook team`
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f7; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; padding:32px; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h1 style="color:#1a1a2e; margin-top:0;">Welcome to BarberBook ✂</h1>
    <p>Hi ${name},</p>
    <p>Your verification code is:</p>
    <div style="font-size:32px; font-weight:bold; letter-spacing:6px; color:#1a1a2e; background:#e8b86d22; padding:16px; text-align:center; border-radius:10px; margin:20px 0;">${code}</div>
    <p style="color:#666; font-size:14px;">Enter this code in the app to verify your email. The code expires in 1 hour.</p>
    <p style="color:#999; font-size:12px; margin-top:24px;">If you didn't sign up for BarberBook, you can safely ignore this email.</p>
  </div>
</body></html>`
  await send(to, subject, html, text)
}

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  const subject = 'Reset your BarberBook password'
  const text = `Hi ${name},

We received a request to reset your BarberBook password.

Click the link below to choose a new password (link expires in 1 hour):

${resetLink}

If you didn't request this, you can safely ignore this email — your password won't change.

— The BarberBook team`
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f7; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; padding:32px; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h1 style="color:#1a1a2e; margin-top:0;">Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your BarberBook password.</p>
    <p style="margin:24px 0;">
      <a href="${resetLink}" style="background:#1a1a2e; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">Choose a new password</a>
    </p>
    <p style="color:#666; font-size:14px;">This link expires in 1 hour.</p>
    <p style="color:#999; font-size:12px; margin-top:24px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    <p style="color:#999; font-size:12px;">Or copy and paste this link:<br>${resetLink}</p>
  </div>
</body></html>`
  await send(to, subject, html, text)
}

// Generate a 6-digit numeric code
export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

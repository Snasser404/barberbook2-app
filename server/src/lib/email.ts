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

export async function sendPasswordResetEmail(to: string, name: string, code: string) {
  const subject = 'Your BarberBook password reset code'
  const text = `Hi ${name},

We received a request to reset your BarberBook password.

Your reset code is:

  ${code}

Enter this code on the reset page along with your new password. The code expires in 1 hour.

If you didn't request this, you can safely ignore this email — your password won't change.

— The BarberBook team`
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f7; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; padding:32px; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h1 style="color:#1a1a2e; margin-top:0;">Reset your password</h1>
    <p>Hi ${name},</p>
    <p>Your password reset code is:</p>
    <div style="font-size:32px; font-weight:bold; letter-spacing:6px; color:#1a1a2e; background:#e8b86d22; padding:16px; text-align:center; border-radius:10px; margin:20px 0;">${code}</div>
    <p style="color:#666; font-size:14px;">Enter this code on the reset page along with your new password. The code expires in 1 hour.</p>
    <p style="color:#999; font-size:12px; margin-top:24px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
  </div>
</body></html>`
  await send(to, subject, html, text)
}

export async function sendSupportTicketToAdmin(opts: { adminEmail: string; from: { name: string; email: string }; subject?: string; message: string; ticketId: string }) {
  const subj = `[BarberBook support] ${opts.subject || 'New support request'}`
  const text = `New support ticket from ${opts.from.name} <${opts.from.email}>:

Subject: ${opts.subject || '(none)'}

Message:
${opts.message}

Ticket ID: ${opts.ticketId}
Reply to the user via the admin dashboard.`
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f7; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; padding:32px; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h1 style="color:#1a1a2e; margin-top:0;">New support request</h1>
    <p><strong>From:</strong> ${opts.from.name} &lt;${opts.from.email}&gt;</p>
    ${opts.subject ? `<p><strong>Subject:</strong> ${opts.subject}</p>` : ''}
    <p style="white-space:pre-line; background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e5e7eb;">${opts.message.replace(/</g, '&lt;')}</p>
    <p style="color:#999; font-size:12px; margin-top:24px;">Ticket ID: ${opts.ticketId}<br>Reply via the admin dashboard.</p>
  </div>
</body></html>`
  await send(opts.adminEmail, subj, html, text)
}

export async function sendSupportTicketReply(opts: { to: string; name: string; reply: string; originalSubject?: string }) {
  const subj = `Re: ${opts.originalSubject || 'Your BarberBook support request'}`
  const text = `Hi ${opts.name},

${opts.reply}

— The BarberBook team`
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f7; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; padding:32px; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <h1 style="color:#1a1a2e; margin-top:0;">Re: ${opts.originalSubject || 'your support request'}</h1>
    <p>Hi ${opts.name},</p>
    <p style="white-space:pre-line;">${opts.reply.replace(/</g, '&lt;')}</p>
    <p style="color:#666; font-size:13px; margin-top:24px;">— The BarberBook team</p>
  </div>
</body></html>`
  await send(opts.to, subj, html, text)
}

// Generate a 6-digit numeric code
export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

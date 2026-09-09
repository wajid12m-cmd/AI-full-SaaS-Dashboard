// The original utils/email.js used Nodemailer over Gmail SMTP — Nodemailer
// is a Node-specific library built around Node's `net`/`tls` sockets and
// doesn't run reliably inside Deno Edge Functions. Resend's HTTP API is a
// straightforward `fetch()` call instead, which works natively here.
//
// Same "dev mode" fallback behavior as before: if no API key is set, the
// link is printed to the function logs instead of failing.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "AI SaaS Dashboard <onboarding@resend.dev>";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log("=================================");
    console.log(`📧 EMAIL (RESEND_API_KEY not set — dev mode)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html);
    console.log("=================================");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend API error:", res.status, body);
    // Deliberately not thrown — mirrors the old behavior where a failed
    // send didn't block register/forgot-password from succeeding. The
    // link is already logged above the fetch call would need to fail
    // silently the same way, so log it again here for visibility.
  }
}

export async function sendResetEmail(toEmail: string, code: string): Promise<void> {
  await sendEmail(
    toEmail,
    "Your password reset code",
    `
      <p>You requested to reset your password.</p>
      <p>Use the code below (it will expire in 15 minutes):</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 20px 0;">${code}</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `
  );
}

export async function sendVerificationEmail(toEmail: string, code: string): Promise<void> {
  await sendEmail(
    toEmail,
    "Your verification code",
    `
      <p>Welcome! Use the code below to verify your email address and activate your account.</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 20px 0;">${code}</p>
      <p>This code will expire in 15 minutes.</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    `
  );
}

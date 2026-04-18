import nodemailer from "nodemailer";

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass
    }
  });
}

export async function sendMail(payload: MailPayload) {
  const transport = getTransport();
  if (!transport) {
    console.warn("SMTP belum dikonfigurasi. Email dilewati.");
    return { skipped: true };
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
  const fromName = process.env.SMTP_FROM_NAME || "Kograph Premium";

  await transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text || payload.subject
  });

  return { sent: true };
}

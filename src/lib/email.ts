interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload) {
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PROVIDER) {
    console.warn("[email] Provider not configured. Email payload:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  console.warn("[email] Provider configured but no implementation hooked up yet.");
}

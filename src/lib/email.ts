interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload) {
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;

  if (!from || !provider) {
    console.warn("[email] Provider not configured. Email payload:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  if (provider !== "resend") {
    console.warn("[email] Provider configured but not supported:", provider);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is missing.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn("[email] Resend API error:", response.status, errorBody);
  }
}

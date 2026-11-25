const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TO_EMAIL = "kaneadeyemi@gmail.com";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }
  body = body || {};

  // Silently accept honeypot submissions without sending email.
  if (body._honey) {
    return res.status(200).json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const scope = typeof body.scope === "string" ? body.scope.trim() : "";
  const pkg =
    typeof body.package === "string" && body.package.trim()
      ? body.package.trim().slice(0, 120)
      : "General project";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }
  if (!scope || scope.length > 5000) {
    return res
      .status(400)
      .json({ error: "Please enter a short project scope (up to 5,000 characters)." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("scope: RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Email service not configured." });
  }

  const from = process.env.EMAIL_FROM || "Portfolio <onboarding@resend.dev>";

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New scope request: ${pkg}`,
        text: [
          `Package: ${pkg}`,
          `From: ${email}`,
          "",
          "Scope:",
          scope,
        ].join("\n"),
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => "");
      console.error(`scope: Resend ${resendRes.status}: ${detail}`);
      return res.status(502).json({ error: "Failed to send email." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("scope: Resend request failed", err);
    return res.status(502).json({ error: "Failed to send email." });
  }
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function sendText(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(message);
}

function readForm(req) {
  if (typeof req.body === "string") {
    return new URLSearchParams(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return new URLSearchParams(
      Object.entries(req.body).map(([key, value]) => [key, String(value)])
    );
  }
  return new URLSearchParams();
}

module.exports = async function contact(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendText(res, 405, "error");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_TO;
  const sender = process.env.CONTACT_FROM;
  if (!apiKey || !recipient || !sender) {
    console.error("Contact email is not configured: set RESEND_API_KEY, CONTACT_TO, and CONTACT_FROM.");
    return sendText(res, 500, "error");
  }

  const form = readForm(req);
  const name = (form.get("name") || "").trim();
  const email = (form.get("email") || "").trim();
  const comment = (form.get("comment") || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !name || name.length > 200 ||
    !emailPattern.test(email) || email.length > 320 ||
    !comment || comment.length > 10000
  ) {
    return sendText(res, 400, "error");
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: email,
        subject: `Portfolio contact from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${comment}`,
      }),
    });

    if (!response.ok) {
      console.error("Email provider rejected contact message with status", response.status);
      return sendText(res, 502, "error");
    }

    return sendText(res, 200, "success");
  } catch (error) {
    console.error("Unable to send contact email:", error);
    return sendText(res, 502, "error");
  }
};

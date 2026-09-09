/**
 * AiSensy WhatsApp API Client Helper
 */

export async function sendAiSensyMessage(to: string, message: string) {
  const apiKey = process.env.AISENSY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Missing AISENSY_API_KEY" };
  }

  const digits = to.replace(/\D/g, "");
  const destination = digits.length === 10 ? `91${digits}` : digits;

  try {
    const res = await fetch("https://backend.aisensy.com/bot/t1/api/v1/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apiKey": apiKey,
      },
      body: JSON.stringify({
        apiKey: apiKey,
        destination: destination,
        to: destination,
        message: message,
        text: message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    console.error("AiSensy send error:", err);
    return { ok: false, error: err.message };
  }
}

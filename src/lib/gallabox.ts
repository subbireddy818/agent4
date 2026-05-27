// -----------------------------------------------------------------------------
// Thin wrapper around GallaBox's outbound WhatsApp text endpoint.
//
// Used by:
//   - /api/whatsapp/webhook  → bot replies
//   - /auth/actions          → OTP delivery
// -----------------------------------------------------------------------------

export interface GallaBoxSendResult {
  ok: boolean;
  status: number | null;
  responseBody: unknown;
  error?: string;
}

/**
 * Send a plain-text WhatsApp message to a phone via GallaBox.
 *
 * `rawPhone` may be in any format — digits, "+91 …", "+91-…". Whatever is
 * passed in is normalised to digits-only and prefixed with country code 91
 * if it looks like a 10-digit Indian number.
 *
 * Returns `{ ok: false, error: "GallaBox not configured" }` when the env
 * vars aren't set, instead of throwing — callers can decide whether to
 * treat that as a hard failure (production) or a soft one (dev).
 */
export async function sendWhatsAppText(
  rawPhone: string,
  body: string,
  recipientName: string = "Broker"
): Promise<GallaBoxSendResult> {
  const apiKey = process.env.GALLABOX_API_KEY;
  const apiSecret = process.env.GALLABOX_API_SECRET;
  const channelId = process.env.GALLABOX_CHANNEL_ID;

  if (!apiKey || !apiSecret || !channelId) {
    return {
      ok: false,
      status: null,
      responseBody: null,
      error: "GallaBox not configured (GALLABOX_API_KEY/SECRET/CHANNEL_ID missing)",
    };
  }

  const cleanPhone = rawPhone.replace(/\D/g, "");
  const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  try {
    const res = await fetch("https://server.gallabox.com/devapi/messages/whatsapp", {
      method: "POST",
      headers: {
        apiKey: apiKey,
        apiSecret: apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelId,
        channelType: "whatsapp",
        recipient: { name: recipientName, phone: finalPhone },
        whatsapp: { type: "text", text: { body } },
      }),
    });

    let responseBody: unknown = null;
    try {
      responseBody = await res.json();
    } catch {
      // GallaBox occasionally returns empty bodies on 4xx — that's fine.
    }

    return {
      ok: res.ok,
      status: res.status,
      responseBody,
      error: res.ok ? undefined : `GallaBox HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      responseBody: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

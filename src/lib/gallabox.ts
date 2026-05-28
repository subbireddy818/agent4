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



// -----------------------------------------------------------------------------
// Template-based message for OTP delivery.
//
// WhatsApp Business API requires approved templates to initiate conversations
// with users who haven't previously messaged your number. This function sends
// the OTP via a pre-approved template so ALL users (not just existing contacts)
// receive it.
//
// Template setup in GallaBox:
//   - Go to GallaBox → Templates → Create
//   - Category: Authentication (or Utility)
//   - Name: set via GALLABOX_OTP_TEMPLATE env var (default: "otp_login")
//   - Body: "Your AgentsApp login code is {{1}}. Valid for 10 minutes."
//   - Submit for approval
//
// If the template isn't set up, this falls back to sendWhatsAppText.
// -----------------------------------------------------------------------------

export async function sendWhatsAppOTP(
  rawPhone: string,
  otp: string,
  recipientName: string = "User"
): Promise<GallaBoxSendResult> {
  const apiKey = process.env.GALLABOX_API_KEY;
  const apiSecret = process.env.GALLABOX_API_SECRET;
  const channelId = process.env.GALLABOX_CHANNEL_ID;
  const templateName = process.env.GALLABOX_OTP_TEMPLATE;

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

  // If no template configured, fall back to plain text
  // (this will only work for users who already have a conversation)
  if (!templateName) {
    const fallbackBody = `*AgentsApp* login code: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`;
    return sendWhatsAppText(rawPhone, fallbackBody, recipientName);
  }

  // GallaBox authentication templates with "Copy Code" button require the OTP
  // to be passed in the button component (sub_type: "url" with index 0).
  // Meta's Cloud API format requires:
  //   - body component with the OTP as parameter 1
  //   - button component (sub_type: "url", index: 0) with the OTP
  //
  // We try multiple formats because GallaBox's API has varied over time.

  const payloadFormats = [
    // Format 1: GallaBox bodyValues (their documented simple format)
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          bodyValues: { "1": otp },
        },
      },
    },
    // Format 2: Meta Cloud API style with components — body + COPY_CODE button
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          language: "en",
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: otp }
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [
                { type: "text", text: otp }
              ]
            }
          ]
        },
      },
    },
    // Format 3: GallaBox authentication-specific format with bodyValues + buttonValues
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          bodyValues: { "1": otp },
          buttonValues: { "0": otp },
        },
      },
    },
    // Format 4: GallaBox with language specified + bodyValues
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          language: "en",
          bodyValues: { "1": otp },
          buttonValues: { "0": otp },
        },
      },
    },
  ];

  for (let i = 0; i < payloadFormats.length; i++) {
    const payload = payloadFormats[i];
    try {
      console.log(`[gallabox] Trying OTP template format ${i + 1} for ${finalPhone}...`);
      const res = await fetch("https://server.gallabox.com/devapi/messages/whatsapp", {
        method: "POST",
        headers: {
          apiKey: apiKey,
          apiSecret: apiSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await res.json();
      } catch {
        // empty body
      }

      console.log(`[gallabox] OTP format ${i + 1} response (${res.status}):`, JSON.stringify(responseBody));

      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          responseBody,
        };
      }

      // If 4xx, try next format
      if (res.status >= 400 && res.status < 500) {
        console.warn(`[gallabox] Format ${i + 1} failed (${res.status}), trying next...`);
        continue;
      }

      // 5xx — server error, no point trying other formats
      return {
        ok: false,
        status: res.status,
        responseBody,
        error: `GallaBox template HTTP ${res.status}: ${JSON.stringify(responseBody)}`,
      };
    } catch (err) {
      console.error(`[gallabox] Format ${i + 1} fetch error:`, err);
      continue;
    }
  }

  // All template formats failed — fall back to plain text as last resort
  console.warn("[gallabox] All template formats failed, falling back to plain text");
  const fallbackBody = `Your AgentsApp login code is *${otp}*\n\nValid for 10 minutes. Do not share this code.`;
  return sendWhatsAppText(rawPhone, fallbackBody, recipientName);
}

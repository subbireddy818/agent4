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

  // Error 132000 "number of localizable_params (0)" means GallaBox accepted
  // our API call but forwarded 0 parameters to Meta. The authentication
  // template has {{1}} in the body + a "Copy Code" button that also needs
  // the OTP value.
  //
  // GallaBox requires `localizableParams` array for template parameters,
  // plus a `parameterFormat: "VALUE"` hint. We also include the button
  // parameter via the `components` array with sub_type "COPY_CODE".

  const payloadFormats = [
    // Format 1: localizableParams array (GallaBox's actual working format)
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          language: "en",
          localizableParams: [
            { default: otp }
          ],
          components: [
            {
              type: "button",
              sub_type: "COPY_CODE",
              index: 0,
              parameters: [
                { type: "coupon_code", coupon_code: otp }
              ]
            }
          ]
        },
      },
    },
    // Format 2: bodyValues with localizableParams + button
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
          localizableParams: [
            { default: otp }
          ],
          components: [
            {
              type: "button",
              sub_type: "COPY_CODE",
              index: 0,
              parameters: [
                { type: "coupon_code", coupon_code: otp }
              ]
            }
          ]
        },
      },
    },
    // Format 3: Meta Cloud API style components only (body params + COPY_CODE button)
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
              sub_type: "COPY_CODE",
              index: 0,
              parameters: [
                { type: "coupon_code", coupon_code: otp }
              ]
            }
          ]
        },
      },
    },
    // Format 4: parameterFormat VALUE with bodyValues map
    {
      channelId,
      channelType: "whatsapp",
      recipient: { name: recipientName, phone: finalPhone },
      whatsapp: {
        type: "template",
        template: {
          templateName: templateName,
          language: "en",
          parameterFormat: "VALUE",
          bodyValues: { "1": otp },
          buttonValues: { "0": otp },
        },
      },
    },
    // Format 5: simple bodyValues (may work for some GallaBox versions)
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
  ];

  for (let i = 0; i < payloadFormats.length; i++) {
    const payload = payloadFormats[i];
    try {
      console.log(`[gallabox] Trying OTP format ${i + 1} for ${finalPhone}:`, JSON.stringify(payload.whatsapp.template));
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

      console.log(`[gallabox] Format ${i + 1} response (${res.status}):`, JSON.stringify(responseBody));

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

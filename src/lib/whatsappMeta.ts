/**
 * Meta WhatsApp Cloud API Helper
 * Direct official integration replacing third-party BSPs
 */

export interface MetaButton {
  id: string;
  title: string; // Max 20 chars
}

export interface MetaListRow {
  id: string;
  title: string; // Max 24 chars
  description?: string; // Max 72 chars
}

export interface MetaListSection {
  title: string;
  rows: MetaListRow[];
}

function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If 10 digits (standard Indian mobile), prepend 91
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendMetaApiRequest(payload: any) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("Meta WhatsApp API not configured: missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID");
    return { ok: false, error: "Meta WhatsApp credentials missing" };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Meta WhatsApp API error response:", data);
      return { ok: false, status: res.status, error: data?.error?.message || "Failed to send message", raw: data };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    console.error("Meta WhatsApp API fetch error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Send standard plain text WhatsApp message
 */
export async function sendMetaTextMessage(to: string, text: string) {
  const cleanTo = cleanPhoneNumber(to);
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  return sendMetaApiRequest(payload);
}

/**
 * Send Clickable Buttons (Up to 3 buttons)
 */
export async function sendMetaInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: MetaButton[],
  headerText?: string,
  footerText?: string
) {
  const cleanTo = cleanPhoneNumber(to);

  // Meta allows max 3 buttons for interactive reply buttons
  const metaButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id.slice(0, 256),
      title: btn.title.slice(0, 20),
    },
  }));

  const interactive: any = {
    type: "button",
    body: { text: bodyText },
    action: { buttons: metaButtons },
  };

  if (headerText) {
    interactive.header = { type: "text", text: headerText };
  }
  if (footerText) {
    interactive.footer = { text: footerText };
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "interactive",
    interactive,
  };

  return sendMetaApiRequest(payload);
}

/**
 * Send Interactive List / Menu Dropdown (Up to 10 options)
 */
export async function sendMetaInteractiveList(
  to: string,
  bodyText: string,
  buttonLabel: string, // e.g. "Select Project"
  sections: MetaListSection[],
  headerText?: string,
  footerText?: string
) {
  const cleanTo = cleanPhoneNumber(to);

  const interactive: any = {
    type: "list",
    body: { text: bodyText },
    action: {
      button: buttonLabel.slice(0, 20),
      sections: sections.map((sec) => ({
        title: sec.title.slice(0, 24),
        rows: sec.rows.slice(0, 10).map((row) => ({
          id: row.id.slice(0, 200),
          title: row.title.slice(0, 24),
          ...(row.description ? { description: row.description.slice(0, 72) } : {}),
        })),
      })),
    },
  };

  if (headerText) {
    interactive.header = { type: "text", text: headerText };
  }
  if (footerText) {
    interactive.footer = { text: footerText };
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "interactive",
    interactive,
  };

  return sendMetaApiRequest(payload);
}

/**
 * Send PDF / Document over WhatsApp
 */
export async function sendMetaDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
) {
  const cleanTo = cleanPhoneNumber(to);
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "document",
    document: {
      link: documentUrl,
      filename: filename,
      ...(caption ? { caption } : {}),
    },
  };

  return sendMetaApiRequest(payload);
}

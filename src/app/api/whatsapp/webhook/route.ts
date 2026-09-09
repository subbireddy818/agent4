import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { sendMetaTextMessage, sendMetaInteractiveButtons, sendMetaInteractiveList } from "@/lib/whatsappMeta";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Verify a Meta WhatsApp webhook payload using the X-Hub-Signature-256 header.
 *
 * Meta signs the *raw request body* with HMAC-SHA256 using the App Secret
 * configured in the Meta App dashboard. The header is of the form
 * "sha256=<hex>". We compare with timing-safe equality.
 *
 * If WHATSAPP_APP_SECRET is not set we treat verification as disabled and
 * return true â€” this keeps local dev and the GallaBox/simulator paths
 * working without extra config. In production, set the secret.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // verification disabled â€” see note above
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  // Lengths must match before timingSafeEqual, otherwise it throws.
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

/**
 * Insert a row into whatsapp_messages. All failures are swallowed so that
 * audit-logging never breaks the bot itself.
 */
async function logWhatsappMessage(row: {
  direction: "inbound" | "outbound";
  phone?: string | null;
  agent_id?: string | null;
  wamid?: string | null;
  message_type?: string;
  content?: string | null;
  parsed_intent?: string | null;
  parsed_entities?: Record<string, unknown> | null;
  source?: string | null;
  outbound_status?: number | null;
  error_message?: string | null;
  raw_payload?: unknown;
}) {
  try {
    await supabase.from("whatsapp_messages").insert([{
      direction: row.direction,
      phone: row.phone ?? null,
      agent_id: row.agent_id ?? null,
      wamid: row.wamid ?? null,
      message_type: row.message_type ?? "text",
      content: row.content ?? null,
      parsed_intent: row.parsed_intent ?? null,
      parsed_entities: row.parsed_entities ?? null,
      source: row.source ?? null,
      outbound_status: row.outbound_status ?? null,
      error_message: row.error_message ?? null,
      // Cap the raw payload so we don't bloat the table.
      raw_payload: row.raw_payload
        ? JSON.parse(JSON.stringify(row.raw_payload).slice(0, 4000))
        : null,
    }]);
  } catch (err) {
    console.error("whatsapp_messages insert failed:", err);
  }
}

// GET handler: Meta Webhook Subscription Handshake Verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "agentsapp_bot_verify_token";

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp Webhook Handshake verified successfully.");
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  return new NextResponse("Bad Request", { status: 400 });
}

// POST handler: Receives incoming chat prompts from agents (Meta, GallaBox, or Simulator)
export async function POST(req: NextRequest) { console.log("WEBHOOK POST CALLED");
  let fromPhoneRaw = "";
  // Read the raw body once, so we can both verify the signature and parse it.
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");

  // Reject Meta-style payloads with bad signatures. GallaBox and the local
  // simulator do not send this header â€” when WHATSAPP_APP_SECRET is unset
  // we accept everything (see verifyMetaSignature).
  if (signatureHeader && !verifyMetaSignature(rawBody, signatureHeader)) {
    console.warn("Rejected WhatsApp webhook: invalid x-hub-signature-256");
    await logWhatsappMessage({
      direction: "inbound",
      message_type: "system",
      content: rawBody.slice(0, 1000),
      error_message: "invalid x-hub-signature-256",
      source: "meta",
    });
    return NextResponse.json({ status: "forbidden", message: "Invalid signature" }, { status: 403 });
  }

  try {
    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseErr) {
      console.error("WhatsApp webhook: invalid JSON body", parseErr);
      return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
    }
    console.log("WhatsApp Webhook Payload Received:", JSON.stringify(payload));


    // Support Meta, GallaBox, and Simulator payload formats
    const metaMessage = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const metaInteractive = metaMessage?.interactive;
    const metaInteractiveText = 
      metaInteractive?.button_reply?.title || 
      metaInteractive?.button_reply?.id || 
      metaInteractive?.list_reply?.title || 
      metaInteractive?.list_reply?.id;

    let textBody = (
      metaInteractiveText || // Meta interactive button/list click
      payload.whatsapp?.text?.body || // GallaBox whatsapp body
      payload.whatsapp?.text || // GallaBox whatsapp text
      payload.data?.message?.text?.body || // GallaBox standard
      payload.data?.message?.text || // GallaBox alternative
      metaMessage?.text?.body || // Meta standard text
      payload.message?.text || // GallaBox legacy
      payload.message?.text?.body || // GallaBox legacy alternative
      payload.payload?.message?.text || // GallaBox nested
      payload.text || // Sandbox/direct
      ""
    ).toString().trim();

    // Detect message type and media URLs
    const msgType = (
      payload.whatsapp?.type ||
      payload.data?.message?.type ||
      payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type ||
      payload.message?.type ||
      payload.type ||
      "text"
    );

    let mediaUrl = "";
    let mediaFileName = "";
    if (msgType === "image" || msgType === "document") {
      const mediaObj = 
        payload.whatsapp?.image || payload.whatsapp?.document ||
        payload.data?.message?.image || payload.data?.message?.document ||
        payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.image ||
        payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.document ||
        payload.message?.image || payload.message?.document;
        
      mediaUrl = mediaObj?.link || mediaObj?.url || mediaObj?.id || "media_uploaded";
      mediaFileName = mediaObj?.filename || mediaObj?.name || `${msgType}_file`;
    }

    // Clean surrounding single/double quotes
    if ((textBody.startsWith('"') && textBody.endsWith('"')) || (textBody.startsWith("'") && textBody.endsWith("'"))) {
      textBody = textBody.slice(1, -1).trim();
    }

    fromPhoneRaw = (
      payload.whatsapp?.from || // GallaBox whatsapp from
      payload.whatsapp?.sender || // GallaBox whatsapp sender
      payload.sender || // GallaBox sender
      payload.data?.contact?.phoneNumber || // GallaBox standard
      payload.data?.contact?.phone || // GallaBox alternative
      payload.data?.message?.from || // GallaBox nested message from
      payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || // Meta
      payload.message?.from || // GallaBox legacy
      payload.payload?.message?.from || // GallaBox legacy nested
      payload.from || // Sandbox/direct
      ""
    ).toString().trim();

    if (!fromPhoneRaw) {
      console.log("Ignored payload: Missing sender phone number.");
      return NextResponse.json({ status: "ignored", message: "Missing phone" });
    }

    if (!textBody && msgType === "text") {
      console.log("Ignored payload: Missing message body.");
      await logWhatsappMessage({
        direction: "inbound",
        phone: fromPhoneRaw || null,
        message_type: "system",
        content: textBody || null,
        error_message: "missing body",
        raw_payload: payload,
      });
      return NextResponse.json({ status: "ignored", message: "Missing body" });
    }

    // Detect which BSP/source this payload is from. Used for audit logging.
    const isFromMeta = !!payload?.entry?.[0]?.changes?.[0];
    const isFromSimulatorEarly =
      payload?.entry?.[0]?.id === "sandbox-entry" ||
      payload?.from === "simulator" ||
      payload?.fromPhone === "simulator";
    const source: "meta" | "gallabox" | "simulator" =
      isFromSimulatorEarly ? "simulator" : isFromMeta ? "meta" : "gallabox";

    // Best-effort wamid extraction (Meta only).
    const wamid =
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
      null;

    // Format phone number to match the database profile representation: "+91 98765 43210"
    const last10Digits = fromPhoneRaw.slice(-10);
    const formattedPhone = `+91 ${last10Digits.slice(0, 5)} ${last10Digits.slice(5)}`;

    // Audit-log the inbound message immediately. We don't know the
    // agent_id yet; the lookup happens further down.
    await logWhatsappMessage({
      direction: "inbound",
      phone: formattedPhone, // Fix: use formattedPhone
      wamid,
      message_type: "text",
      content: textBody,
      source,
      raw_payload: payload,
    });

    const lowerText = textBody.toLowerCase();

    // Determine if the message has our specific "aa" prefix or is from the sandbox simulator
    const isFromSimulator = payload.entry?.[0]?.id === "sandbox-entry" || payload.from === "simulator" || payload.fromPhone === "simulator";
    const hasAaPrefix = lowerText.startsWith("aa ") || lowerText === "aa";

    // Strip "aa" prefix to normalize command text for processing
    let commandText = textBody;
    if (lowerText.startsWith("aa ")) {
      commandText = textBody.slice(3).trim();
    } else if (lowerText === "aa") {
      commandText = "help";
    }

    let commandLower = commandText.toLowerCase();

    // Check if the message is a pure "yes" or "no" reply
    const isYesOrNo = commandLower === "yes" || commandLower === "no";

    // If it doesn't match our routing signature, isn't a yes/no reply, and is not from simulator, ignore it
    if (!hasAaPrefix && !isFromSimulator && !isYesOrNo && msgType === "text") {
      console.log("Ignored payload: Does not start with 'aa', isn't yes/no, and not from simulator.");
      return NextResponse.json({ status: "ignored", message: "Not intended for agentsapp bot" });
    }

    // formattedPhone is already defined above

    // Outbound helper to send messages back via Meta Cloud API or GallaBox WhatsApp API
    const sendOutboundReply = async (replyText: string) => {
      const metaToken = process.env.META_WHATSAPP_TOKEN;
      const metaPhoneId = process.env.META_PHONE_NUMBER_ID;
      const apiKey = process.env.GALLABOX_API_KEY;
      const apiSecret = process.env.GALLABOX_API_SECRET;
      const channelId = process.env.GALLABOX_CHANNEL_ID;

      // Send via Meta Cloud API if configured and not from simulator
      if (metaToken && metaPhoneId && !isFromSimulator) {
        console.log(`Sending live Meta Cloud API reply to ${fromPhoneRaw}: ${replyText}`);
        const res = await sendMetaTextMessage(fromPhoneRaw, replyText);
        await logWhatsappMessage({
          direction: "outbound",
          phone: formattedPhone,
          message_type: "text",
          content: replyText,
          source: "meta",
          outbound_status: res.ok ? 200 : (res as any).status || 400,
          error_message: res.ok ? null : (res as any).error,
          raw_payload: (res as any).data || (res as any).raw,
        });
        return;
      }

      // For the simulator (and any time neither provider is configured)
      if (!apiKey || !apiSecret || !channelId || isFromSimulator) {
        await logWhatsappMessage({
          direction: "outbound",
          phone: formattedPhone, // Fix: use formattedPhone so it matches history polls
          message_type: "text",
          content: replyText,
          source,
          // 0 indicates "not actually sent over the wire".
          outbound_status: 0,
          error_message: isFromSimulator ? "simulator (not sent)" : "Meta/GallaBox not configured",
        });
        return;
      }

      const cleanPhone = fromPhoneRaw.replace(/\D/g, "");
      const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      console.log(`Sending live GallaBox reply to ${finalPhone}: ${replyText}`);
      try {
        const res = await fetch("https://server.gallabox.com/devapi/messages/whatsapp", {
          method: "POST",
          headers: {
            "apiKey": apiKey,
            "apiSecret": apiSecret,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelId: channelId,
            channelType: "whatsapp",
            recipient: { name: "Agent", phone: finalPhone },
            whatsapp: { type: "text", text: { body: replyText } },
          }),
        });

        const resData = await res.json().catch(() => ({}));
        console.log(`GallaBox reply status: ${res.status}`, JSON.stringify(resData));

        await logWhatsappMessage({
          direction: "outbound",
          phone: fromPhoneRaw,
          message_type: "text",
          content: replyText,
          source,
          outbound_status: res.status,
          error_message: res.ok ? null : JSON.stringify(resData).slice(0, 500),
          raw_payload: resData,
        });
      } catch (e: any) {
        console.error("GallaBox outbound fetch failed:", e);
        await logWhatsappMessage({
          direction: "outbound",
          phone: fromPhoneRaw,
          message_type: "text",
          content: replyText,
          source,
          outbound_status: null,
          error_message: e?.message || String(e),
        });
      }
    };

    // Outbound helper to send Interactive Buttons via Meta
    const sendOutboundButtons = async (
      bodyText: string, 
      buttons: { id: string; title: string }[], 
      headerText?: string, 
      footerText?: string
    ) => {
      const metaToken = process.env.META_WHATSAPP_TOKEN;
      const metaPhoneId = process.env.META_PHONE_NUMBER_ID;

      if (metaToken && metaPhoneId && !isFromSimulator) {
        const res = await sendMetaInteractiveButtons(fromPhoneRaw, bodyText, buttons, headerText, footerText);
        await logWhatsappMessage({
          direction: "outbound",
          phone: formattedPhone,
          message_type: "interactive",
          content: `${bodyText} [Buttons: ${buttons.map(b => b.title).join(", ")}]`,
          source: "meta",
          outbound_status: res.ok ? 200 : (res as any).status || 400,
          error_message: res.ok ? null : (res as any).error,
          raw_payload: (res as any).data || (res as any).raw,
        });
        return;
      }

      // Fallback to text for simulator or legacy
      const buttonText = buttons.map((b, i) => `${i + 1}. ${b.title}`).join("\n");
      await sendOutboundReply(`${bodyText}\n\n${buttonText}`);
    };

    // Outbound helper to send Interactive List Menu via Meta
    const sendOutboundList = async (
      bodyText: string, 
      buttonLabel: string, 
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
      headerText?: string,
      footerText?: string
    ) => {
      const metaToken = process.env.META_WHATSAPP_TOKEN;
      const metaPhoneId = process.env.META_PHONE_NUMBER_ID;

      if (metaToken && metaPhoneId && !isFromSimulator) {
        const res = await sendMetaInteractiveList(fromPhoneRaw, bodyText, buttonLabel, sections, headerText, footerText);
        await logWhatsappMessage({
          direction: "outbound",
          phone: formattedPhone,
          message_type: "interactive",
          content: `${bodyText} [List: ${buttonLabel}]`,
          source: "meta",
          outbound_status: res.ok ? 200 : (res as any).status || 400,
          error_message: res.ok ? null : (res as any).error,
          raw_payload: (res as any).data || (res as any).raw,
        });
        return;
      }

      // Fallback to text
      const listText = sections.map(s => `*${s.title}*\n` + s.rows.map(r => `• ${r.title}${r.description ? ` (${r.description})` : ''}`).join("\n")).join("\n\n");
      await sendOutboundReply(`${bodyText}\n\n${listText}`);
    };

    // Query profiles in database to identify the agent
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", formattedPhone)
      .maybeSingle();

    // Handle Meeting Passcode Verification (e.g., SUN078, PRG902, LOD551, ATTEND SUN078)
    const upperMsg = commandText.trim().toUpperCase();
    const extractedPasscode = (upperMsg.match(/\b([A-Z]{3}\d{3}|\d{6}|SUN078|PRG902|LOD551)\b/i) || [])[1];

    if (extractedPasscode) {
      const codeToVerify = extractedPasscode.toUpperCase();
      let eventTitle = "";
      let eventId = "";

      // 1. Query events for passcode match
      const { data: matchedEvents } = await supabase.from("events").select("*");
      if (matchedEvents) {
        const found = matchedEvents.find((e: any) => 
          e.attendance_code === codeToVerify || 
          (e.title && e.title.substring(0, 3).toUpperCase() + "078" === codeToVerify)
        );
        if (found) {
          eventTitle = found.title;
          eventId = found.id;
        }
      }

      // 2. Query campaigns for passcode match
      if (!eventTitle) {
        const { data: matchedCampaigns } = await supabase.from("campaigns").select("*");
        if (matchedCampaigns) {
          const found = matchedCampaigns.find((c: any) => 
            c.attendance_code === codeToVerify || 
            (c.name && c.name.substring(0, 3).toUpperCase() + "078" === codeToVerify)
          );
          if (found) {
            eventTitle = found.name;
            eventId = found.id;
          }
        }
      }

      // 3. Fallback demo passcodes
      if (!eventTitle) {
        if (codeToVerify === "SUN078") {
          eventTitle = "Prestige Sunnyside Launch CP Meet";
          eventId = "evt-sun078";
        } else if (codeToVerify === "PRG902") {
          eventTitle = "Prestige Park Grove Launch Meet";
          eventId = "evt-prg902";
        } else if (codeToVerify === "LOD551") {
          eventTitle = "Lodha Solitaire CP Webinar";
          eventId = "evt-lod551";
        }
      }

      if (eventTitle) {
        // Register attendance in database / rsvps
        if (profile) {
          await supabase.from("rsvps").upsert({
            agent_id: profile.id,
            event_id: eventId,
            attended: true,
            attended_at: new Date().toISOString(),
            attendance_code: codeToVerify
          }, { onConflict: "agent_id,event_id" });

          // Credit +100 XP to agent
          await supabase.from("profiles").update({
            points: (profile.points || 0) + 100
          }).eq("id", profile.id);
        }

        const replyMsg = `Ž‰ *Attendance Confirmed!*\n\nYou have been marked *PRESENT* for:\n📈Œ *${eventTitle}*\n🔍‘ Passcode: *${codeToVerify}*\n\n’° *+100 XP Bonus* has been credited to your Wallet! Check your Agent Dashboard under *Attended Events History* to view your attendance record.`;
        await sendOutboundReply(replyMsg);
        return NextResponse.json({ status: "success", reply: replyMsg });
      }
    }

    // Handle Media Uploads (Documents/Images)
    if (msgType === "image" || msgType === "document") {
      if (!profile) {
        await sendOutboundReply(`\uD83E\uDD16 Bot: We received a file, but your phone number is not registered. Please register first by typing *aa register [Name]*`);
        return NextResponse.json({ status: "success", reply: "Unregistered user uploaded file" });
      }

      // If the agent is in a pending verification state, log to verification_docs
      if (profile.status === "pending" || profile.status === "docs_required" || profile.status === "rejected") {
        await supabase.from("verification_docs").insert([{
          agent_id: profile.id,
          doc_type: msgType,
          file_url: mediaUrl,
          file_name: mediaFileName,
          status: "pending"
        }]);
        await supabase.from("profiles").update({ status: "docs_uploaded" }).eq("id", profile.id);
        const replyMsg = `\uD83E\uDD16 Bot: 📈„ *Verification File Received!*\nThank you for uploading your document. Our admin team will review it shortly. Your status is now *Docs Uploaded*.`;
        await sendOutboundReply(replyMsg.replace(/\n/g, "\n"));
        return NextResponse.json({ status: "success", reply: replyMsg });
      }

      // Otherwise, save it as a regular document for the agent
      const { error: insertError } = await supabase.from("documents").insert([{
        agent_id: profile.id,
        type: "Other", // Use standard type to avoid enum/constraint errors
        url: mediaUrl,
        name: mediaFileName,
        send_count: 0,
        view_count: 0
      }]);

      if (insertError) {
        console.error("Failed to insert document:", insertError);
        await sendOutboundReply(`\uD83E\uDD16 Bot: âŒ Failed to save your document: ${insertError.message}`);
        return NextResponse.json({ status: "error", reply: "Insert failed" });
      }

      const replyMsg = `\uD83E\uDD16 Bot: 📈„ *File Received!*\nWe've securely saved your document to your "My Documents" vault.`;
      await sendOutboundReply(replyMsg.replace(/\n/g, "\n"));
      return NextResponse.json({ status: "success", reply: replyMsg });
    }

    // Handle Yes/No for Channel Partner Invitations
    if (commandLower === "yes" || commandLower === "no") {
      // Find pending invitations for this agent
      const { data: invites, error: invitesErr } = await supabase
        .from("channel_partners")
        .select("builder_id, status")
        .eq("agent_id", profile.id)
        .eq("status", "invited");

      if (!invitesErr && invites && invites.length > 0) {
        // Just process the first pending invitation
        const invite = invites[0];
        
        if (commandLower === "yes" || commandLower === "1" || commandLower.includes("accept")) {
          await supabase
            .from("channel_partners")
            .update({ status: "connected" })
            .eq("agent_id", profile.id)
            .eq("builder_id", invite.builder_id);
            
          // Reward agent
          await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) + 100 })
            .eq("id", profile.id);

          const replyMsg = `Ž‰ *Formal Welcome & Attendance Confirmed!*\n\nThank you for accepting the Channel Partner & Event Launch Invitation. We are honored to partner with you.\n\n’° *+100 XP Bonus* has been credited to your Wallet!\n🔍‘ *Secret Meeting Code:* SUN078 (Enter this code at live meet end to claim attendance).\n\nWe look forward to seeing you at the launch event!`;
          await sendOutboundReply(replyMsg);
          return NextResponse.json({ status: "success", reply: replyMsg });
        } else {
          // They said no
          await supabase
            .from("channel_partners")
            .update({ status: "rejected" })
            .eq("agent_id", profile.id)
            .eq("builder_id", invite.builder_id);
            
          const replyMsg = `\uD83E\uDD16 *Formal Acknowledgment*\n\nThank you for your response. We have recorded your choice. We appreciate you letting us know and hope to collaborate with you at our future project launches and Channel Partner meets!`;
          await sendOutboundReply(replyMsg);
          return NextResponse.json({ status: "success", reply: replyMsg });
        }
      } else {
        // If no pending CP invite, check if they are answering an event RSVP poll YES or NO
        if (commandLower === "yes" || commandLower === "1" || commandLower.includes("accept")) {
          await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) + 100 })
            .eq("id", profile.id);

          const replyMsg = `Ž‰ *Formal Welcome & Attendance Confirmed!*\n\nThank you for confirming *YES* to the Launch Invitation.\n\n’° *+100 XP Bonus* credited to your Wallet!\n🔍‘ *Meeting Passcode:* SUN078\n\nWe look forward to seeing you at the live launch meet!`;
          await sendOutboundReply(replyMsg);
          return NextResponse.json({ status: "success", reply: replyMsg });
        } else if (commandLower === "no" || commandLower === "2" || commandLower.includes("decline")) {
          const replyMsg = `\uD83E\uDD16 *Formal Acknowledgment*\n\nThank you for your response. We have recorded your decision (*NO*). We appreciate your time and hope to see you at our next project launch!`;
          await sendOutboundReply(replyMsg);
          return NextResponse.json({ status: "success", reply: replyMsg });
        }
      }
    }

    // Handle Registration Commands
    if (commandLower.startsWith("register") || commandLower.includes("register")) {
      const matchWithAll = commandText.match(/register\s+(.*?)\s+phone\s+(.*?)\s+agency\s+(.*?)\s+location\s+(.*?)\s+interested in\s+(.*)/i);
      const matchWithPhone = commandText.match(/register\s+(.*?)\s+phone\s+(.*?)\s+agency\s+(.*)/i);
      const matchWithoutPhone = commandText.match(/register\s+(.*?)\s+agency\s+(.*)/i);
      
      const match = matchWithAll || matchWithPhone || matchWithoutPhone;

      if (match) {
        let regName = match[1].trim();
        let regPhone = matchWithAll || matchWithPhone ? match[2].trim() : formattedPhone;
        let regAgency = matchWithAll ? match[3].trim() : matchWithPhone ? match[3].trim() : match[2].trim();
        let regLocation = matchWithAll ? match[4].trim() : "";
        let regInterested = matchWithAll ? match[5].trim() : "";

        // Strip square brackets if the user typed them literally
        if (regName.startsWith("[") && regName.endsWith("]")) regName = regName.slice(1, -1).trim();
        if (regAgency.startsWith("[") && regAgency.endsWith("]")) regAgency = regAgency.slice(1, -1).trim();
        if (regPhone.startsWith("[") && regPhone.endsWith("]")) regPhone = regPhone.slice(1, -1).trim();
        if (regLocation.startsWith("[") && regLocation.endsWith("]")) regLocation = regLocation.slice(1, -1).trim();
        if (regInterested.startsWith("[") && regInterested.endsWith("]")) regInterested = regInterested.slice(1, -1).trim();

        let interestedArr: string[] = [];
        if (regInterested) {
           interestedArr = regInterested.split(",").map((i: string) => i.trim());
        }

        const cleanInputPhone = regPhone.replace(/\D/g, "");
        const finalPhoneForDb = cleanInputPhone.length >= 10 
          ? `+91 ${cleanInputPhone.slice(-10).slice(0, 5)} ${cleanInputPhone.slice(-10).slice(5)}` 
          : formattedPhone;

        let dbError = null;
        let generatedId = profile?.cp_id || null;

        if (profile) {
          // UPDATE existing profile
          const { error } = await supabase
            .from("profiles")
            .update({
              phone: finalPhoneForDb,
              name: regName,
              agency_name: regAgency,
              location: regLocation,
              interested_properties: interestedArr
            })
            .eq("id", profile.id);
          dbError = error;
        } else {
          // INSERT new profile
          const { error } = await supabase
            .from("profiles")
            .insert([{
              phone: finalPhoneForDb,
              name: regName,
              agency_name: regAgency,
              role: "agent",
              status: "pending",
              cp_id: null,
              points: 500,
              referrals_count: 0,
              location: regLocation,
              interested_properties: interestedArr
            }]);
          dbError = error;
        }

        if (dbError) {
          console.error("Failed to register agent via WhatsApp:", dbError);
          const replyErr = `\uD83E\uDD16 Bot: âŒ Failed to register/update: ${dbError.message}`;
          await sendOutboundReply(replyErr);
          return NextResponse.json({ status: "error", reply: replyErr });
        } else {
          const locText = regLocation ? `\n📈 Location: *${regLocation}*` : "";
          const intText = regInterested ? `\n¡ Interested: *${regInterested}*` : "";
          const replyOk = `Ž‰ *Registration ${profile ? "Updated" : "Successful"}!*\n\n👤 Name: *${regName}*\n¢ Agency: *${regAgency}*\n📈ž Phone: *${finalPhoneForDb}*${locText}${intText}\n’° Welcome Reward: *+500 XP*\n\nâš ï¸ *Action Required:*\nPlease reply to this message with your *RERA Document, Aadhar, and PAN* to get verified.\n\nYour account is currently *pending approval* by an admin.`;
          await sendOutboundReply(replyOk);
          return NextResponse.json({ status: "success", reply: replyOk });
        }
      } else {
        const replyFormat = `\uD83E\uDD16 *AgentsApp Onboarding*:\n\nTo register as a Channel Partner directly on WhatsApp, please reply in this format:\n\n_"aa Register Your Name phone 9999999999 agency Agency Name location Your City interested in Property Types"_`;
        await sendOutboundReply(replyFormat);
        return NextResponse.json({ status: "success", reply: replyFormat });
      }
    }

    if (!profile) {
      // If not a registration command, ask them to register
      const replyRegPrompt = `\uD83E\uDD16 *Welcome to AgentsApp!*\n\nIt looks like your phone number is not registered yet as a Channel Partner.\n\nTo create your account instantly on WhatsApp, please reply with:\n\n_"aa Register Your Name phone 9999999999 agency Your Agency Name"_`;
      await sendOutboundReply(replyRegPrompt);
      return NextResponse.json({ status: "success", reply: replyRegPrompt });
    }

    if (commandLower === "help" || commandLower === "commands" || commandLower === "hi" || commandLower === "hello" || commandLower === "menu") {
      // Role-based menu: show different options depending on agent/builder/admin
      let helpMsg = "";

      if (profile.role === "builder") {
        helpMsg = `\uD83E\uDD16 *AgentsApp Builder Menu*\n\n` +
          `‘‹ Welcome *${profile.name}* (${profile.agency_name || "Builder"})!\n\n` +
          `Manage your projects and campaigns:\n\n` +
          `1. š€ *Upcoming Launches*:\n` +
          `   _"aa launches"_ â€” view all scheduled launches\n\n` +
          `2. Ž¥ *Register Webinar*:\n` +
          `   _"aa webinars"_ â€” view/register agent webinars\n\n` +
          `3. ‘¥ *My Agents*:\n` +
          `   _"aa my agents"_ â€” list registered channel partners\n\n` +
          `4. ¢ *Search Inventory*:\n` +
          `   _"aa inventory"_ â€” view your project units\n\n` +
          `5. 📈 *Brochures*:\n` +
          `   _"aa brochure [project]"_ â€” send brochure to agents\n\n` +
          `6. 📈Š *Campaign Stats*:\n` +
          `   _"aa stats"_ â€” view campaign analytics\n\n` +
          `‘‰ Prefix all commands with *aa*`;
      } else if (profile.role === "admin" || profile.role === "verification" || profile.role === "operations") {
        helpMsg = `\uD83E\uDD16 *AgentsApp Admin Menu*\n\n` +
          `‘‹ Welcome *${profile.name}* (Admin)!\n\n` +
          `Full platform access:\n\n` +
          `📈Š *Analytics & Reports*\n` +
          `1. _"aa agents"_ â€” list all registered agents\n` +
          `2. _"aa leads"_ â€” total lead count across platform\n` +
          `3. _"aa stats"_ â€” platform-wide analytics\n\n` +
          `‘¥ *Agent Management*\n` +
          `4. _"aa pending"_ â€” view pending verifications\n` +
          `5. _"aa approve [name]"_ â€” approve an agent\n` +
          `6. _"aa reject [name]"_ â€” reject an agent\n\n` +
          `¢ *Inventory & Projects*\n` +
          `7. _"aa inventory"_ â€” search all inventory\n` +
          `8. _"aa projects"_ â€” list all projects\n\n` +
          `📈… *Events*\n` +
          `9. _"aa launches"_ â€” upcoming events\n` +
          `10. _"aa webinars"_ â€” active webinars\n\n` +
          `‘‰ Prefix all commands with *aa*`;
      } else {
        // Default: Agent/Agent menu
        helpMsg = `\uD83E\uDD16 *AgentsApp Agent Menu*\n\n` +
          `‘‹ Welcome *${profile.name}* (${profile.agency_name || "Agent"})!\n` +
          `†” CP ID: *${profile.cp_id || "Pending"}*\n\n` +
          `📈‹ *Leads*\n` +
          `1. _"aa Add Name looking for BHK"_ â€” add lead\n` +
          `2. _"aa My leads"_ â€” view all your leads\n` +
          `3. _"aa Search Name"_ â€” find a specific lead\n` +
          `4. _"aa Name site visit"_ â€” update lead status\n\n` +
          `â° *Reminders*\n` +
          `5. _"aa Remind me to call [Name] time [date]"_ â€” set reminder\n` +
          `6. _"aa my reminders"_ â€” view pending reminders\n\n` +
          `¢ *Inventory & Projects*\n` +
          `7. _"aa inventory"_ â€” view available units\n` +
          `8. _"aa brochure [project]"_ â€” get brochure PDF\n` +
          `9. _"aa my projects"_ â€” projects you follow\n\n` +
          `📈… *Events*\n` +
          `10. _"aa launches"_ â€” upcoming events & meets\n` +
          `11. _"aa webinars"_ â€” register for webinars\n` +
          `12. _"aa my events"_ â€” your accepted RSVPs\n\n` +
          `† *Rewards*\n` +
          `13. _"aa rewards"_ â€” your XP balance & rank\n` +
          `14. _"aa leaderboard"_ â€” top 10 agents\n` +
          `15. _"aa my referrals"_ â€” agents you referred\n\n` +
          `👤 *Profile*\n` +
          `16. _"aa my profile"_ â€” your full profile details\n` +
          `17. _"aa dashboard"_ â€” quick stats summary\n\n` +
          `‘‰ Prefix all commands with *aa*`;
      }

      await sendOutboundReply(helpMsg);
      return NextResponse.json({ status: "success", reply: helpMsg });
    }
    // --- CONVERSATIONAL STATE MACHINE SETUP ---
    // Fetch the last outbound message sent by the bot to this phone number
    let lastBotMessageStr = "";
    if (formattedPhone) {
      const { data: lastMsg } = await supabase
        .from("whatsapp_messages")
        .select("content")
        .eq("direction", "outbound")
        .eq("phone", formattedPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastMsg) {
        lastBotMessageStr = lastMsg.content;
      }
    }

    // --- CONVERSATIONAL STATE MACHINE: INVENTORY FILTER ---
    if (lastBotMessageStr.includes("Filter this list?") && lastBotMessageStr.includes("Reply with your preferred location")) {
      // If the bot just asked them to filter, treat their next message as an inventory query
      const isNewCommand = commandLower.startsWith("search") || commandLower.startsWith("find") || commandLower.startsWith("add ") || commandLower.startsWith("update ") || commandLower.startsWith("project ") || commandLower.startsWith("units ");
      if (!isNewCommand && !commandLower.includes("inventory")) {
        commandLower = "inventory " + commandLower;
      }
    }

    // --- CONVERSATIONAL STATE MACHINE: LEADS FILTER ---
    if (lastBotMessageStr.includes("Filter these leads?") && lastBotMessageStr.includes("Reply with a location")) {
      // Don't intercept if they are running a completely different command from the menu
      const isNewCommand = commandLower.startsWith("search") || commandLower.startsWith("find") || commandLower.startsWith("add ") || commandLower.startsWith("update ") || commandLower.startsWith("project ") || commandLower.startsWith("units ");
      if (!isNewCommand && !commandLower.includes("my leads") && !commandLower.includes("show leads")) {
        commandLower = "my leads " + commandLower;
      }
    }

    // --- SMART SEARCH: REMINDERS ---
    if (commandLower === "reminder" || commandLower === "reminders" || commandLower === "my reminders") {
      const { data: reminders } = await supabase.from("reminders").select("*").eq("agent_id", profile.id).eq("is_completed", false);
      if (!reminders || reminders.length === 0) {
        await sendOutboundReply(`\uD83E\uDD16 Bot: You have no pending reminders!`);
        return NextResponse.json({ status: "success" });
      }
      const rList = reminders.map((r: any) => `â ° *${r.scheduled_time}*\n${r.title}`).join("\n\n");
      const rep = `\uD83E\uDD16 Bot: Here are your reminders:\n\n${rList}`;
      await sendOutboundReply(rep);
      return NextResponse.json({ status: "success" });
    }

    // --- SMART SEARCH: PROJECTS ---
    if (commandLower.startsWith("find projects by ") || commandLower.startsWith("search project ")) {
       const searchTerm = commandText.replace(/find projects by /i, "").replace(/search project /i, "").trim();
       
       // First try finding a builder
       const { data: builders } = await supabase.from("profiles").select("id, name").eq("role", "builder").ilike("name", `%${searchTerm}%`);
       
       if (builders && builders.length > 0) {
           const builderId = builders[0].id;
           const { data: projs } = await supabase.from("projects").select("*").eq("developer_id", builderId);
           if (!projs || projs.length === 0) {
              await sendOutboundReply(`\uD83E\uDD16 Bot: Builder ${builders[0].name} has no listed projects.`);
              return NextResponse.json({ status: "success" });
           }
           const pList = projs.map((p: any) => `\uD83C\uDFE2 *${p.name}*\n\uD83D\uDCCD ${p.location} | \uD83D\uDCB0 ${p.price_range || "Contact for details"}`).join("\n\n");
           const rep = `\uD83E\uDD16 Bot: Projects by ${builders[0].name}:\n\n${pList}\n\n\uD83D\uDCA1 _Tip: Type "project info [name]" for details, or "units in [name]" for availability!_`;
           await sendOutboundReply(rep);
           return NextResponse.json({ status: "success" });
       }
       
       // Fallback: search projects by name
       const { data: projsByName } = await supabase.from("projects").select("*").ilike("name", `%${searchTerm}%`);
       if (!projsByName || projsByName.length === 0) {
           await sendOutboundReply(`\uD83E\uDD16 Bot: Could not find any builders or projects matching "${searchTerm}".`);
           return NextResponse.json({ status: "success" });
       }
       
       const pList = projsByName.map((p: any) => `\uD83C\uDFE2 *${p.name}*\n\uD83D\uDCCD ${p.location} | \uD83D\uDCB0 ${p.price_range || "Contact for details"}`).join("\n\n");
       const rep = `\uD83E\uDD16 Bot: Found these matching projects:\n\n${pList}\n\n\uD83D\uDCA1 _Tip: Type "project info [name]" for details, or "units in [name]" for availability!_`;
       await sendOutboundReply(rep);
       return NextResponse.json({ status: "success" });
    }

    // --- SMART SEARCH: PROJECT INFO ---
    if (commandLower.startsWith("project info ") || commandLower.startsWith("tell me about ")) {
       const projectName = commandText.replace(/project info /i, "").replace(/tell me about /i, "").trim();
       
       const { data: projs } = await supabase.from("projects").select("*, profiles(name)").ilike("name", `%${projectName}%`);
       if (!projs || projs.length === 0) {
           await sendOutboundReply(`\uD83E\uDD16 Bot: I couldn't find any details for a project named "${projectName}".`);
           return NextResponse.json({ status: "success" });
       }
       
       const p = projs[0]; // Take the first match
       const builderName = p.profiles?.name ? ` by *${p.profiles.name}*` : "";
       
       // Fetch inventory counts
       const { data: units } = await supabase.from("inventory_units").select("status").eq("project_id", p.id);
       let inventoryStr = "";
       if (units && units.length > 0) {
           const available = units.filter(u => u.status === "available").length;
           const booked = units.filter(u => u.status === "booked").length;
           const sold = units.filter(u => u.status === "sold").length;
           inventoryStr = `\n\n\uD83D\uDCCA *Inventory:* \u2705 ${available} Available | \u23F3 ${booked} Booked`;
       }
       
       const rep = `\uD83C\uDFE2 *${p.name}*${builderName}\n\n\uD83D\uDCCD Location: ${p.location}\n\uD83D\uDCB0 Price: ${p.price_range || "Contact for details"}\n\uD83C\uDFD8 Type: ${p.type}\n\n\uD83D\uDCDD Details: ${p.description || "No description available."}${inventoryStr}\n\n\uD83D\uDCA1 _Tip: Type "units in ${p.name}" to see the full list of available units!_`;
       await sendOutboundReply(rep);
       return NextResponse.json({ status: "success" });
    }

    // --- SMART SEARCH: PROJECT UNITS / INVENTORY SUMMARY ---
    if (commandLower.startsWith("units in ") || commandLower.startsWith("inventory for ") || commandLower.startsWith("available in ")) {
        const projectName = commandText.replace(/units in /i, "").replace(/inventory for /i, "").replace(/available in /i, "").trim();
        
        // Find project
        const { data: projs } = await supabase.from("projects").select("id, name").ilike("name", `%${projectName}%`);
        if (!projs || projs.length === 0) {
           await sendOutboundReply(`\uD83E\uDD16 Bot: Could not find any project matching "${projectName}".`);
           return NextResponse.json({ status: "success" });
        }
        const projId = projs[0].id;
        const actualProjName = projs[0].name;

        // Find units
        const { data: units } = await supabase.from("inventory_units").select("*").eq("project_id", projId);
        
        if (!units || units.length === 0) {
           await sendOutboundReply(`\uD83E\uDD16 Bot: No inventory units listed for project *${actualProjName}*.`);
           return NextResponse.json({ status: "success" });
        }
        
        const available = units.filter(u => u.status === "available").length;
        const booked = units.filter(u => u.status === "booked").length;
        const sold = units.filter(u => u.status === "sold").length;
        
        let replyMsg = `\uD83C\uDFE2 *${actualProjName} Inventory*\n\n`;
        replyMsg += `\u2705 Available: *${available}*\n\u23F3 Booked: *${booked}*\n\u274C Sold: *${sold}*\n\n`;
        replyMsg += `*List of Available Units:*\n`;
        
        const availableUnits = units.filter(u => u.status === "available");
        if (availableUnits.length === 0) {
            replyMsg += `None currently available.`;
        } else {
            availableUnits.slice(0, 15).forEach((u, idx) => {
                let config = u.details?.['Number of Bedrooms'] ? `${u.details['Number of Bedrooms']} BHK` : (u.details?.config || "");
                let size = u.details?.Sqft ? `${u.details.Sqft} Sqft` : (u.details?.size || "");
                let facing = u.details?.Facing || u.details?.facing || "";
                let price = u.details?.price || u.details?.Price || "Contact for Price";
                replyMsg += `\u25AA *${u.unit_name}* (${config}, ${size}, ${facing} facing) - ${price}\n`;
            });
            if (availableUnits.length > 15) replyMsg += `\n...and ${availableUnits.length - 15} more.`;
        }
        
        await sendOutboundReply(replyMsg);
        return NextResponse.json({ status: "success" });
    }

    // --- SMART SEARCH: INVENTORY ---
    if (commandLower.startsWith("search for a ") || commandLower.startsWith("search area ") || commandLower.startsWith("search ")) {
       const cleanCmd = commandLower.replace("search for a ", "").replace("search area ", "").replace("search ", "");
       const bhkMatch = cleanCmd.match(/(\d)\s*bhk/i);
       const typeMatch = cleanCmd.match(/(flat|villa|plot|apartment)/i);
       const locMatch = cleanCmd.match(/in (.*)/i);

       const bhk = bhkMatch ? bhkMatch[0] : "";
       let pType = typeMatch ? typeMatch[1].toLowerCase() : "";
       if (pType === "flat") pType = "apartment";
       let loc = locMatch ? locMatch[1].trim() : "";
       
       if (!loc && cleanCmd && !cleanCmd.includes("in ")) {
           // If they didn't use "in", just assume the remaining text is the location
           loc = cleanCmd.replace(bhk, "").replace(typeMatch ? typeMatch[0] : "", "").trim();
       }

       let q = supabase.from("projects").select("id, name, location");
       if (loc) q = q.ilike("location", `%${loc}%`);
       if (pType) q = q.eq("type", pType);

       const { data: projs } = await q;
       if (!projs || projs.length === 0) {
          await sendOutboundReply(`\uD83E\uDD16 Bot: Could not find any ${pType || "properties"} in ${loc || "that area"}.`);
          return NextResponse.json({ status: "success" });
       }

       const pList = projs.map((p: any) => ` ¢ *${p.name}* in ${p.location}`).join("\n");
       const rep = `\uD83E\uDD16 Bot: I found these matches:\n\n${pList}\n\n\uD83D\uDCA1 _Tip: Type "project info [name]" for details, or "units in [name]" for availability!_`;
       await sendOutboundReply(rep);
       return NextResponse.json({ status: "success" });
    }

    // --- CONVERSATIONAL STATE MACHINE: ADD LEAD ---
    // State 1: Awaiting Property Type
    if (lastBotMessageStr.includes("Is ") && lastBotMessageStr.includes(" looking for a flat, villa, or plot?")) {
      const isNewCommand = commandLower.startsWith("search") || commandLower.startsWith("find") || commandLower.startsWith("add ") || commandLower.startsWith("update ") || commandLower.startsWith("project ") || commandLower.startsWith("units ");
      if (!isNewCommand) {
          const nameMatch = lastBotMessageStr.match(/Is (.*?) looking for a flat, villa, or plot\?/);
          if (nameMatch) {
            const leadName = nameMatch[1];
            const propertyType = commandText.trim();
            const replyType = `\uD83E\uDD16 Bot: Got it, a ${propertyType}. What is ${leadName}'s budget?`;
            await sendOutboundReply(replyType);
            return NextResponse.json({ status: "success", reply: replyType });
          }
      }
    }

    // State 2: Awaiting Budget
    if (lastBotMessageStr.includes("Got it, a ") && lastBotMessageStr.includes("What is ") && lastBotMessageStr.includes("'s budget?")) {
      const isNewCommand = commandLower.startsWith("search") || commandLower.startsWith("find") || commandLower.startsWith("add ") || commandLower.startsWith("update ") || commandLower.startsWith("project ") || commandLower.startsWith("units ");
      if (!isNewCommand) {
          const typeMatch = lastBotMessageStr.match(/Got it, a (.*?)\./);
          const nameMatch = lastBotMessageStr.match(/What is (.*?)'s budget\?/);
          if (typeMatch && nameMatch) {
            const propertyType = typeMatch[1];
            const leadName = nameMatch[1];
            const budget = commandText.trim();

        const { error } = await supabase
          .from("leads")
          .insert([{
            agent_id: profile.id,
            name: leadName,
            status: "new",
            requirement: propertyType,
            budget: budget,
            phone: "+91 00000 00000",
            details: { aiScore: 85, lastInteraction: "Added via conversational bot" }
          }]);
        
        if (error) {
           const replyErr = `\uD83E\uDD16 Bot: â Œ Failed to add lead: ${error.message}`;
           await sendOutboundReply(replyErr);
           return NextResponse.json({ status: "error", reply: replyErr });
        }
        
        const replyOk = `\uD83E\uDD16 Bot: \u2705 Lead Added!\n👤 Name: *${leadName}*\n   Req: *${propertyType}*\n’° Budget: *${budget}*\n\n(This was inserted in your live leads table!)`;
        await sendOutboundReply(replyOk);
        return NextResponse.json({ status: "success", reply: replyOk });
      }
      }
    }

    // Entry Point: "add a client sreenivas" or "add lead sreenivas"
    if (commandLower.startsWith("add a client ") || commandLower.startsWith("add lead ")) {
      const leadName = commandText.replace(/add a client/i, "").replace(/add lead/i, "").trim();
      if (!leadName) {
         const rep = `\uD83E\uDD16 Bot: Please provide the client's name. Example: "add a client Sreenivas"`;
         await sendOutboundReply(rep);
         return NextResponse.json({ status: "success", reply: rep });
      }
      const replyStart = `\uD83E\uDD16 Bot: Great! Is ${leadName} looking for a flat, villa, or plot?`;
      await sendOutboundReply(replyStart);
      return NextResponse.json({ status: "success", reply: replyStart });
    }

 

    // 3. SET REMINDER INTENT (Support: "Remind me tomorrow to call Ramesh", etc.)
    if (commandLower.startsWith("remind") || commandLower.includes("remind")) {
      let title = "WhatsApp Follow-up Task";
      let scheduledTime = "Tomorrow, 10:00 AM";

      // Remove "remind me to "
      let content = commandText.replace(/^remind\s*(me\s*)?(to\s*)?/i, "").trim();
      
      // Look for time indicators at the end of the sentence
      const timeRegex = /\b(at|on|by|time|tomorrow|today)\b\s*(.*)$/i;
      const timeMatch = content.match(timeRegex);

      if (timeMatch) {
         scheduledTime = timeMatch[0].trim();
         // If "tomorrow call ramesh", the time indicator is at the beginning.
         // Let's just strip the matched time part from the title.
         title = content.replace(timeRegex, "").trim();
      } else {
         title = content;
      }

      if (!title) title = "WhatsApp Follow-up Task";
      
      // Strip square brackets if any
      if (title.startsWith("[") && title.endsWith("]")) title = title.slice(1, -1).trim();
      if (scheduledTime.startsWith("[") && scheduledTime.endsWith("]")) scheduledTime = scheduledTime.slice(1, -1).trim();

      // Find if there is a matching lead to link
      const { data: matchingLeads } = await supabase
        .from("leads")
        .select("id")
        .eq("agent_id", profile.id)
        .limit(1);

      const leadId = matchingLeads && matchingLeads.length > 0 ? matchingLeads[0].id : null;

      // Insert reminder in Supabase
      const { data: newReminder, error } = await supabase
        .from("reminders")
        .insert([{
          agent_id: profile.id,
          lead_id: leadId,
          title: title,
          scheduled_time: scheduledTime,
          is_completed: false,
          priority: "high"
        }])
        .select()
        .single();

      if (error) {
        console.error("Failed to insert reminder via WhatsApp bot:", error);
        const replyErr = `\uD83E\uDD16 Bot: âŒ Failed to save reminder: ${error.message}`;
        await sendOutboundReply(replyErr);
        return NextResponse.json({ status: "error", reply: replyErr });
      } else {
        console.log("Successfully logged reminder via WhatsApp bot:", newReminder);
        const replyOk = `\uD83E\uDD16 Bot: â° Reminder Scheduled!\nâ° Task: *${title}*\n📈… Time: *${scheduledTime}*\n\n(Successfully logged in your Supabase reminders table!)`;
        await sendOutboundReply(replyOk);
        return NextResponse.json({ status: "success", reply: replyOk });
      }
    }

    // 4. UPDATE LEAD STATUS INTENT
    const statusKeywords = [
      { key: "site visit", status: "site_visit" },
      { key: "site_visit", status: "site_visit" },
      { key: "interested", status: "interested" },
      { key: "negotiation", status: "negotiation" },
      { key: "closed", status: "closed" },
      { key: "won", status: "closed" },
      { key: "lost", status: "lost" },
      { key: "new", status: "new" }
    ];

    let matchedStatus: string | null = null;
    for (const item of statusKeywords) {
      if (commandLower.includes(item.key)) {
        matchedStatus = item.status;
        break;
      }
    }

    if (matchedStatus) {
      const { data: agentLeads } = await supabase
        .from("leads")
        .select("id, name")
        .eq("agent_id", profile.id);

      let matchedLead = null;
      if (agentLeads) {
        for (const lead of agentLeads) {
          const nameLower = lead.name.toLowerCase();
          if (commandLower.includes(nameLower)) {
            matchedLead = lead;
            break;
          }
          const firstName = nameLower.split(" ")[0];
          if (firstName.length >= 3 && commandLower.includes(firstName)) {
            matchedLead = lead;
            break;
          }
        }
      }

      if (matchedLead) {
        const { data: updatedLead, error } = await supabase
          .from("leads")
          .update({ status: matchedStatus })
          .eq("id", matchedLead.id)
          .select()
          .single();

        if (error) {
          console.error("Failed to update lead status via WhatsApp bot:", error);
          const replyErr = `\uD83E\uDD16 Bot: âŒ Failed to update status: ${error.message}`;
          await sendOutboundReply(replyErr);
          return NextResponse.json({ status: "error", reply: replyErr });
        } else {
          const replyOk = `\uD83E\uDD16 Bot: \u2705 Lead Status Updated!\n👤 Name: *${matchedLead.name}*\nâš¡ New Status: *${matchedStatus.toUpperCase()}*\n\n(Kanban board is synced with this update in real time!)`;
          await sendOutboundReply(replyOk);
          return NextResponse.json({ status: "success", reply: replyOk });
        }
      }
    }

    // 5. VIEW LEADS INTENT
    if (
      commandLower.includes("my leads") || 
      commandLower.includes("show leads") || 
      commandLower.includes("list leads") || 
      commandLower.includes("all leads") || 
      commandLower.includes("hot leads")
    ) {
      let query = supabase
        .from("leads")
        .select("*")
        .eq("agent_id", profile.id);

      // Extract location filter (e.g. "in kokapet", "near banjara hills")
      let locationFilter = "";
      const locMatch = commandLower.match(/(?:in|near|at)\s+([a-z0-9\s]+?)(?:\s+(?:under|below|budget|around|above|over|less than|more than)|$)/);
      if (locMatch && locMatch[1]) {
        locationFilter = locMatch[1].trim();
        query = query.ilike("location", `%${locationFilter}%`);
      }

      // Extract budget filter (e.g. "under 2cr", "budget 50l")
      let budgetFilter = "";
      let budgetKeyword = "";
      const budgetMatch = commandLower.match(/(under|below|budget|around|above|over|less than|more than)\s+([0-9\.]+\s*(?:cr|l|c|k|crore|lakhs?))/);
      if (budgetMatch && budgetMatch[2]) {
        budgetKeyword = budgetMatch[1].trim();
        budgetFilter = budgetMatch[2].trim();
      }

      let { data: leads } = await query.order("created_at", { ascending: false });

      if (leads && leads.length > 0) {
        if (budgetFilter) {
          const parseBudgetToLakhs = (budgetStr: string) => {
            if (!budgetStr) return null;
            const numMatch = budgetStr.match(/([0-9\.]+)/);
            if (!numMatch) return null;
            let num = parseFloat(numMatch[1]);
            const lowerStr = budgetStr.toLowerCase();
            if (lowerStr.includes('cr') || (lowerStr.includes('c') && !lowerStr.includes('loc'))) {
              num = num * 100;
            } else if (lowerStr.includes('k')) {
              num = num / 100;
            }
            return num;
          };

          const userBudgetLakhs = parseBudgetToLakhs(budgetFilter);
          if (userBudgetLakhs !== null) {
            const isUnder = ["under", "below", "less than"].includes(budgetKeyword);
            const isOver = ["above", "over", "more than"].includes(budgetKeyword);

            leads = leads.filter(l => {
              if (!l.budget) return false;
              const leadBudgetLakhs = parseBudgetToLakhs(l.budget);
              if (leadBudgetLakhs === null) return false;
              
              if (isUnder) return leadBudgetLakhs <= userBudgetLakhs;
              if (isOver) return leadBudgetLakhs >= userBudgetLakhs;
              return leadBudgetLakhs >= userBudgetLakhs * 0.8 && leadBudgetLakhs <= userBudgetLakhs * 1.2;
            });
          }
        }
      }

      if (!leads || leads.length === 0) {
        let replyEmpty = "\uD83E\uDD16 Bot: You don't have any leads registered yet. Add one by typing:\n\"aa Add lead Name phone 9999999999\"";
        if (locationFilter || budgetFilter) {
          replyEmpty = `\uD83E\uDD16 Bot: No leads found matching your filters: ${locationFilter ? `📈 Loc: ${locationFilter}` : ""} ${budgetFilter ? `’° Budget: ${budgetFilter}` : ""}`;
        }
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let replyMsg = `\uD83E\uDD16 *Your CRM Leads List*\n`;
      if (locationFilter || budgetFilter) {
        replyMsg += `*(Filtered by: ${locationFilter ? locationFilter + " " : ""}${budgetFilter ? budgetFilter : ""})*\n\n`;
      } else {
        replyMsg += `\n`;
      }
      
      leads.forEach((l, idx) => {
        const emojiMap: Record<string, string> = {
          new: "†•",
          interested: "’¡",
          site_visit: "š—",
          negotiation: "¤",
          closed: "Ž‰",
          lost: "âŒ"
        };
        const emoji = emojiMap[l.status] || "👤";
        replyMsg += `${idx + 1}. ${emoji} *${l.name}* (${l.phone || "No phone"})`;
        if (l.location || l.requirement) {
          replyMsg += `\n   📈 Loc: ${l.location || "-"} | Req: ${l.requirement || "-"}`;
        }
        if (l.budget) {
          replyMsg += `\n   ’° Budget: ${l.budget}`;
        }
        replyMsg += `\n   âš¡ Status: *${l.status.toUpperCase()}*\n\n`;
      });
      
      const isLeadsFiltered = locationFilter || budgetFilter;
      if (!isLeadsFiltered && leads.length > 0) {
        replyMsg += `\n\uD83E\uDD16 *Filter these leads?*\nReply with a location (e.g. Kokapet) or budget (e.g. under 1cr) to filter.`;
      }
      
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 6. REQUEST BROCHURE / DOCUMENT INTENT
    if (
      commandLower.includes("brochure") || 
      commandLower.includes("floor plan") || 
      commandLower.includes("price list") || 
      commandLower.includes("layout")
    ) {
      const { data: docs } = await supabase
        .from("documents")
        .select("*, projects(name)");

      if (!docs || docs.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: No brochures or price list documents found in vault.";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let matchedDoc = null;
      for (const doc of docs) {
        const nameLower = doc.name.toLowerCase();
        const projNameLower = doc.projects?.name?.toLowerCase() || "";
        
        if (commandLower.includes(nameLower) || (projNameLower && commandLower.includes(projNameLower))) {
          matchedDoc = doc;
          break;
        }
      }

      if (!matchedDoc) {
        matchedDoc = docs[0]; // Fallback to first document
      }

      const docUrl = matchedDoc.url === "#" ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : matchedDoc.url;
      const replyDoc = `\uD83E\uDD16 Bot: 📈 Document Retrieved!\n📈„ Name: *${matchedDoc.name}*\n📈¥ Type: *${matchedDoc.type}*\n¢ Project: *${matchedDoc.projects?.name || "General"}*\n\n🔍— *Download Link*:\n${docUrl}\n\n(Tap the link to download details instantly.)`;
      
      await sendOutboundReply(replyDoc);
      return NextResponse.json({ status: "success", reply: replyDoc });
    }

    // 7. UPCOMING LAUNCHES / EVENTS INTENT
    if (commandLower.includes("launch") || commandLower.includes("event") || commandLower.includes("meet")) {
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (!events || events.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: No upcoming launches or developer events scheduled at this moment.";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let replyMsg = `š€ *Upcoming Launches & CP Meets*:\n\n`;
      events.forEach((ev, idx) => {
        replyMsg += `${idx + 1}. 📈… *${ev.title}*\n   📈… Date: *${ev.date}*\n   📈 Venue: *${ev.location}*\n   📈 Description: ${ev.description || "N/A"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 8. WEBINAR REGISTRATION INTENT
    if (commandLower.includes("webinar")) {
      const { data: webinars } = await supabase
        .from("webinars")
        .select("*")
        .order("created_at", { ascending: false });

      if (!webinars || webinars.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: No active agent webinars scheduled. Check back later!";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      const targetWebinar = webinars[0]; // Register for the latest upcoming webinar

      if (commandLower.includes("register") || commandLower.includes("join") || commandLower.includes("book")) {
        const replyOk = `Ž‰ *Webinar Registration Confirmed!*\n\nŽ¥ Title: *${targetWebinar.title}*\n📈… Time: *${targetWebinar.scheduled_time}*\nŽ Reward: *${targetWebinar.reward || "Certificate"}*\n\nYour attendance pass has been generated. The live link will be sent to this chat 15 minutes before the start time. Attend & claim your reward!`;
        await sendOutboundReply(replyOk);
        return NextResponse.json({ status: "success", reply: replyOk });
      } else {
        let replyMsg = `Ž¥ *Active Agent Webinars*:\n\n`;
        webinars.forEach((w, idx) => {
          replyMsg += `${idx + 1}. 📈º *${w.title}*\n   📈… Time: *${w.scheduled_time}*\n   Ž Reward: *${w.reward || "N/A"}*\n   📈 Info: ${w.details || "N/A"}\n\n`;
        });
        replyMsg += `‘‰ Write _"aa Register webinar"_ to secure your virtual pass.`;
        await sendOutboundReply(replyMsg.trim());
        return NextResponse.json({ status: "success", reply: replyMsg.trim() });
      }
    }

    // 8.5 UPDATE LEAD STATUS INTENT
    if (commandLower.startsWith("update lead ")) {
        const match = commandLower.match(/update lead (.*) to (.*)/i);
        if (match) {
            const leadName = match[1].trim();
            let newStatus = match[2].trim().toLowerCase().replace(" ", "_");
            
            const validStatuses = ["new", "contacted", "interested", "site_visit", "negotiation", "booked", "lost"];
            if (!validStatuses.includes(newStatus)) {
                 await sendOutboundReply(`\uD83E\uDD16 Bot: \u274C Invalid status. Valid statuses are: ${validStatuses.join(", ")}`);
                 return NextResponse.json({ status: "success" });
            }
            
            const { data: leads } = await supabase
              .from("leads")
              .select("*")
              .eq("agent_id", profile.id)
              .ilike("name", `%${leadName}%`);
              
            if (!leads || leads.length === 0) {
                 await sendOutboundReply(`\uD83E\uDD16 Bot: \u274C Could not find any lead matching "${leadName}".`);
                 return NextResponse.json({ status: "success" });
            }
            
            const targetLead = leads[0];
            await supabase.from("leads").update({ status: newStatus }).eq("id", targetLead.id);
            
            await sendOutboundReply(`\uD83E\uDD16 Bot: \u2705 Successfully updated lead *${targetLead.name}* to status *${newStatus.toUpperCase()}*.`);
            return NextResponse.json({ status: "success" });
        } else {
            await sendOutboundReply(`\uD83E\uDD16 Bot: To update a lead, use the format: *update lead [name] to [status]*\nExample: _update lead Ravi to site visit_`);
            return NextResponse.json({ status: "success" });
        }
    }

    // 9. SEARCH LEAD INTENT
    if (
      commandLower.startsWith("search lead") || 
      commandLower.startsWith("find lead") || 
      commandLower.startsWith("search") || 
      commandLower.startsWith("find")
    ) {
      const query = commandText.replace(/(search lead|find lead|search|find)/i, "").trim();
      
      if (query) {
        const { data: leads } = await supabase
          .from("leads")
          .select("*")
          .eq("agent_id", profile.id);

        const matched = leads?.filter(l => 
          l.name.toLowerCase().includes(query.toLowerCase()) || 
          l.phone.includes(query)
        );

        // If they search a location like Kokapet/Gachibowli, it should fallback to inventory search rather than failing lead search
        const isLoc = query.toLowerCase().includes("kokapet") || query.toLowerCase().includes("gachibowli");

        if ((!matched || matched.length === 0) && !isLoc) {
          const replyEmpty = `\uD83E\uDD16 Bot: âŒ No lead found matching "${query}" in your CRM.`;
          await sendOutboundReply(replyEmpty);
          return NextResponse.json({ status: "success", reply: replyEmpty });
        } else if (matched && matched.length > 0) {
          let replyMsg = `\uD83E\uDD16 *Lead Lookup Results*\n\n`;
          matched.forEach(l => {
            replyMsg += `👤 *${l.name}*\n📈± Phone: ${l.phone}\n📈§ Email: ${l.email || "N/A"} \nâš¡ Status: *${l.status.toUpperCase()}*\n  Req: ${l.requirement || "N/A"} in ${l.location || "N/A"}\n’° Budget: ${l.budget || "N/A"}\n📈 Notes: ${l.details?.notes || "No notes available"}\n\n`;
          });
          await sendOutboundReply(replyMsg.trim());
          return NextResponse.json({ status: "success", reply: replyMsg.trim() });
        }
      }
    }

    // 10. SEARCH INVENTORY / UNITS INTENT (Support: "Show east-facing plots", "Search 3BHK Kokapet", etc.)
    const isInventorySearch = 
      commandLower.includes("inventory") || 
      commandLower.includes("project") ||
      commandLower.includes("bhk") || 
      commandLower.includes("kokapet") || 
      commandLower.includes("gachibowli") || 
      commandLower.includes("plot") || 
      commandLower.includes("villa") || 
      commandLower.includes("apartment") ||
      commandLower.includes("east") ||
      commandLower.includes("facing");

    if (isInventorySearch) {
      // Query inventory units with project metadata
      const { data: units } = await supabase
        .from("inventory_units")
        .select("*, projects(*)");

      let filteredUnits = units || [];

      // Filter by type
      if (commandLower.includes("plot")) {
        filteredUnits = filteredUnits.filter(u => u.projects?.type === "plot");
      } else if (commandLower.includes("villa")) {
        filteredUnits = filteredUnits.filter(u => u.projects?.type === "villa");
      } else if (commandLower.includes("apartment") || commandLower.includes("flat")) {
        filteredUnits = filteredUnits.filter(u => u.projects?.type === "apartment");
      }

      // Filter by facing
      if (commandLower.includes("east")) {
        filteredUnits = filteredUnits.filter(u => 
          u.details?.facing?.toLowerCase() === "east" || 
          (typeof u.details === 'object' && u.details !== null && 'facing' in u.details && String((u.details as any).facing).toLowerCase() === "east")
        );
      } else if (commandLower.includes("north")) {
        filteredUnits = filteredUnits.filter(u => 
          u.details?.facing?.toLowerCase() === "north" ||
          (typeof u.details === 'object' && u.details !== null && 'facing' in u.details && String((u.details as any).facing).toLowerCase() === "north")
        );
      }

      // Filter by location
      if (commandLower.includes("kokapet")) {
        filteredUnits = filteredUnits.filter(u => u.projects?.location?.toLowerCase() === "kokapet");
      } else if (commandLower.includes("gachibowli")) {
        filteredUnits = filteredUnits.filter(u => u.projects?.location?.toLowerCase() === "gachibowli");
      }

      // Filter by BHK
      if (commandLower.includes("3bhk") || commandLower.includes("3 bhk")) {
        filteredUnits = filteredUnits.filter(u => 
          u.details?.bhk === "3 BHK" || 
          (typeof u.details === 'object' && u.details !== null && 'bhk' in u.details && String((u.details as any).bhk) === "3 BHK")
        );
      } else if (commandLower.includes("2bhk") || commandLower.includes("2 bhk")) {
        filteredUnits = filteredUnits.filter(u => 
          u.details?.bhk === "2 BHK" ||
          (typeof u.details === 'object' && u.details !== null && 'bhk' in u.details && String((u.details as any).bhk) === "2 BHK")
        );
      }

      let replyMsg = `\uD83E\uDD16 *Inventory Matches Found*:\n\n`;
      if (filteredUnits.length === 0) {
        replyMsg = `\uD83E\uDD16 Bot: No specific units match your search. Here are general projects:\n\n`;
        const { data: projects } = await supabase.from("projects").select("*");
        projects?.forEach(p => {
          replyMsg += `¢ *${p.name}* (${p.location})\n’° Price: ${p.price_range || "Contact for details"}\n—ï¸ Type: ${p.type.toUpperCase()}\n\n`;
        });
        await sendOutboundReply(replyMsg.trim());
        return NextResponse.json({ status: "success", reply: replyMsg.trim() });
      }

      filteredUnits.forEach((u, idx) => {
        const projName = u.projects?.name || "General Project";
        const location = u.projects?.location || "N/A";
        const type = u.projects?.type || "N/A";
        const statusEmoji = u.status === "available" ? "Ÿ¢" : u.status === "booked" ? "Ÿ¡" : "🔍´";
        
        let detailsStr = "";
        if (u.details && typeof u.details === "object") {
          detailsStr = Object.entries(u.details)
            .map(([k, v]) => `â€¢ ${k.charAt(0).toUpperCase() + k.slice(1)}: *${v}*`)
            .join("\n");
        }

        replyMsg += `${idx + 1}. ${statusEmoji} *${u.unit_name}* in *${projName}*\n📈 Loc: ${location} | Type: ${type.toUpperCase()}\nâš™ï¸ Status: *${u.status.toUpperCase()}*\n${detailsStr}\n\n`;
      });

      const isFiltered = commandLower.includes("plot") || commandLower.includes("villa") || commandLower.includes("apartment") || commandLower.includes("bhk") || commandLower.includes("kokapet") || commandLower.includes("gachibowli") || commandLower.includes("east") || commandLower.includes("north") || commandLower.includes("flat");
      if (!isFiltered && filteredUnits.length > 0) {
        replyMsg += `\n\uD83E\uDD16 *Filter this list?*\nReply with your preferred location (e.g. Kokapet) or type (e.g. 3BHK) to filter.`;
      }

      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 11. ADMIN: LIST ALL AGENTS
    if ((profile.role === "admin" || profile.role === "verification" || profile.role === "operations") &&
        (commandLower === "agents" || commandLower === "all agents")) {
      const { data: agents, count } = await supabase
        .from("profiles")
        .select("name, phone, status, agency_name", { count: "exact" })
        .eq("role", "agent")
        .order("created_at", { ascending: false })
        .limit(15);

      let replyMsg = `\uD83E\uDD16 *All Registered Agents* (${count || 0} total)\n\n`;
      (agents || []).forEach((a: any, idx: number) => {
        const statusEmoji = a.status === "approved" ? "\u2705" : a.status === "pending" ? "â³" : "âŒ";
        replyMsg += `${idx + 1}. ${statusEmoji} *${a.name}*\n   📈± ${a.phone} | ¢ ${a.agency_name || "N/A"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 12. ADMIN: PENDING VERIFICATIONS
    if ((profile.role === "admin" || profile.role === "verification") &&
        commandLower === "pending") {
      const { data: pending } = await supabase
        .from("profiles")
        .select("name, phone, agency_name, rera_number")
        .eq("role", "agent")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!pending || pending.length === 0) {
        const reply = "\uD83E\uDD16 Bot: No pending verifications. All caught up! \u2705";
        await sendOutboundReply(reply);
        return NextResponse.json({ status: "success", reply });
      }

      let replyMsg = `\uD83E\uDD16 *Pending Verifications* (${pending.length})\n\n`;
      pending.forEach((a: any, idx: number) => {
        replyMsg += `${idx + 1}. â³ *${a.name}*\n   📈± ${a.phone}\n   ¢ ${a.agency_name || "N/A"}\n   📈„ RERA: ${a.rera_number || "N/A"}\n\n`;
      });
      replyMsg += `‘‰ Type _"aa approve [name]"_ or _"aa reject [name]"_ to action.`;
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 13. ADMIN: PLATFORM STATS
    if ((profile.role === "admin" || profile.role === "builder") &&
        (commandLower === "stats" || commandLower === "analytics")) {
      const { count: agentCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "agent");

      const { count: leadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { count: eventCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

      const replyMsg = `\uD83E\uDD16 *Platform Stats*\n\n` +
        `‘¥ Total Agents: *${agentCount || 0}*\n` +
        `📈Š Total Leads: *${leadCount || 0}*\n` +
        `📈… Total Events: *${eventCount || 0}*\n`;
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 14. BUILDER: MY AGENTS
    if (profile.role === "builder" &&
        (commandLower === "my agents" || commandLower === "agents")) {
      const { data: agents } = await supabase
        .from("profiles")
        .select("name, phone, agency_name, status")
        .eq("role", "agent")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!agents || agents.length === 0) {
        const reply = "\uD83E\uDD16 Bot: No registered agents found.";
        await sendOutboundReply(reply);
        return NextResponse.json({ status: "success", reply });
      }

      let replyMsg = `\uD83E\uDD16 *Registered Channel Partners* (${agents.length})\n\n`;
      agents.forEach((a: any, idx: number) => {
        replyMsg += `${idx + 1}. \u2705 *${a.name}*\n   📈± ${a.phone} | ¢ ${a.agency_name || "N/A"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 15. MY DOCS / DOCUMENTS INTENT
    if (commandLower === "my docs" || commandLower === "documents" || commandLower === "my documents") {
      // Fetch agent's own documents and builder brochures
      const { data: agentDocs } = await supabase
        .from("documents")
        .select("name, type, url, created_at, projects(name)")
        .eq("agent_id", profile.id)
        .order("created_at", { ascending: false });

      // Fetch builder docs (e.g. brochures, price lists, general docs) that are available to agents.
      // Usually these have no agent_id or they are uploaded by builders. 
      // Based on our schema, let's fetch documents where agent_id is null or type is brochure.
      const { data: builderDocs } = await supabase
        .from("documents")
        .select("name, type, url, created_at, projects(name)")
        .is("agent_id", null)
        .order("created_at", { ascending: false });

      if ((!agentDocs || agentDocs.length === 0) && (!builderDocs || builderDocs.length === 0)) {
        const replyEmpty = "\uD83E\uDD16 Bot: You have no documents saved in your vault, and no builder brochures are available.";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let replyMsg = `📈 *Your Document Vault*\n\n`;

      if (agentDocs && agentDocs.length > 0) {
        replyMsg += `*My Uploaded Documents:*\n`;
        agentDocs.forEach((d, idx) => {
          replyMsg += `${idx + 1}. 📈„ *${d.name}* (${d.type})\n   🔍— Link: ${d.url}\n\n`;
        });
      }

      if (builderDocs && builderDocs.length > 0) {
        replyMsg += `*Builder Brochures & Shared Docs:*\n`;
        builderDocs.forEach((d: any, idx: number) => {
          const projName = d.projects?.name ? ` - ${d.projects.name}` : "";
          replyMsg += `${idx + 1}. ¢ *${d.name}*${projName}\n   🔍— Link: ${d.url}\n\n`;
        });
      }

      replyMsg += `‘‰ You can send any file here, and it will be safely stored in your vault!`;
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 15. MY POINTS / XP BALANCE / REWARDS
    if (commandLower === "my points" || commandLower === "points" || commandLower === "xp" || commandLower === "my xp" || commandLower === "rewards" || commandLower === "my rewards") {
      const { data: allAgents } = await supabase
        .from("profiles")
        .select("name, points")
        .eq("role", "agent")
        .order("points", { ascending: false });

      const myRank = (allAgents || []).findIndex(a => a.name === profile.name) + 1;

      const replyMsg = `† *Your Rewards Summary*\n\n` +
        `👤 Name: *${profile.name}*\n` +
        `†” CP ID: *${profile.cp_id || "Pending"}*\n` +
        `â­ XP Points: *${profile.points || 0} XP*\n` +
        `¥‡ Leaderboard Rank: *#${myRank || "N/A"}* of ${allAgents?.length || 0} agents\n\n` +
        `‘‰ Type _"aa leaderboard"_ to see top agents.`;
      await sendOutboundReply(replyMsg);
      return NextResponse.json({ status: "success", reply: replyMsg });
    }

    // 16. LEADERBOARD
    if (commandLower === "leaderboard" || commandLower === "top agents" || commandLower === "rankings") {
      const { data: topAgents } = await supabase
        .from("profiles")
        .select("name, points, location")
        .eq("role", "agent")
        .order("points", { ascending: false })
        .limit(10);

      const medals = ["¥‡", "¥ˆ", "¥‰"];
      let replyMsg = `† *Agent Leaderboard â€” Top 10*\n\n`;
      (topAgents || []).forEach((a, idx) => {
        const medal = medals[idx] || `${idx + 1}.`;
        replyMsg += `${medal} *${a.name}* â€” ${a.points || 0} XP\n   📈 ${a.location || "Hyderabad"}\n\n`;
      });
      replyMsg += `‘‰ Type _"aa my points"_ to see your rank.`;
      await sendOutboundReply(replyMsg);
      return NextResponse.json({ status: "success", reply: replyMsg });
    }

    // 17. MY REFERRALS
    if (commandLower === "my referrals" || commandLower === "referrals") {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("referred_name, referred_phone, status, points_awarded, date")
        .eq("referrer_id", profile.id)
        .order("date", { ascending: false });

      if (!referrals || referrals.length === 0) {
        const replyEmpty = `\uD83E\uDD16 Bot: You haven't referred any agents yet.\n\n🔍— Your referral link:\n${process.env.NEXT_PUBLIC_BASE_URL || "https://agentsapp.online"}/?ref=${profile.cp_id || ""}\n\nShare this link to earn *+500 XP* per approved referral!`;
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      const approved = referrals.filter(r => r.status === "approved" || r.status === "active").length;
      const pending = referrals.filter(r => r.status === "pending").length;
      let replyMsg = `¤ *Your Referrals* (${referrals.length} total)\n\u2705 Approved: ${approved} | â³ Pending: ${pending}\n\n`;
      referrals.forEach((r, idx) => {
        const statusEmoji = r.status === "approved" ? "\u2705" : r.status === "pending" ? "â³" : "âŒ";
        replyMsg += `${idx + 1}. ${statusEmoji} *${r.referred_name}*\n   📈± ${r.referred_phone}\n   —“ï¸ ${r.date} | Ž ${r.points_awarded > 0 ? `+${r.points_awarded} XP` : "Pending"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 18. MY PROFILE
    if (commandLower === "my profile" || commandLower === "profile" || commandLower === "my details") {
      const statusEmoji = profile.status === "approved" ? "\u2705 Approved" : profile.status === "pending" ? "â³ Pending Approval" : "âŒ Rejected";
      const replyMsg = `👤 *Your AgentsApp Profile*\n\n` +
        `📈› Name: *${profile.name}*\n` +
        `¢ Agency: *${profile.agency_name || "N/A"}*\n` +
        `📈± Phone: *${profile.phone}*\n` +
        `📈§ Email: *${profile.email || "N/A"}*\n` +
        `†” CP ID: *${profile.cp_id || "Pending"}*\n` +
        `📈„ RERA No: *${profile.rera_number || "Not submitted"}*\n` +
        `📈 Location: *${profile.location || "N/A"}*\n` +
        `â­ XP Points: *${profile.points || 0} XP*\n` +
        `âœ”ï¸ Status: *${statusEmoji}*`;
      await sendOutboundReply(replyMsg);
      return NextResponse.json({ status: "success", reply: replyMsg });
    }

    // 19. MY FOLLOWING PROJECTS
    if (commandLower === "my projects" || commandLower === "following projects" || commandLower === "projects i follow") {
      // agent_invitations links agents to events/projects via accepted status
      const { data: invitations } = await supabase
        .from("agent_invitations")
        .select("*, events(title, location, date, description)")
        .eq("agent_id", profile.id)
        .eq("status", "accepted");

      // Filter for project-type events (title starts with "New Project:")
      const projectInvites = (invitations || []).filter(inv =>
        inv.events?.title?.startsWith("New Project:")
      );

      if (projectInvites.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: You are not following any projects yet. Check your Invitations tab and tap 'Follow Project' to start tracking.";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let replyMsg = `¢ *Projects You're Following* (${projectInvites.length})\n\n`;
      projectInvites.forEach((inv, idx) => {
        const title = inv.events?.title?.replace("New Project: ", "") || "Unknown";
        replyMsg += `${idx + 1}. —ï¸ *${title}*\n   📈 ${inv.events?.location || "N/A"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 20. MY EVENTS / RSVPs
    if (commandLower === "my events" || commandLower === "my rsvps" || commandLower === "accepted events") {
      const { data: invitations } = await supabase
        .from("agent_invitations")
        .select("*, events(title, location, date, description)")
        .eq("agent_id", profile.id)
        .eq("status", "accepted");

      // Filter for non-project events (actual meets/launches/webinars)
      const eventInvites = (invitations || []).filter(inv =>
        !inv.events?.title?.startsWith("New Project:")
      );

      if (eventInvites.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: You haven't accepted any events yet. Type _\"aa launches\"_ to see upcoming events.";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      let replyMsg = `📈… *Your Accepted Events* (${eventInvites.length})\n\n`;
      eventInvites.forEach((inv, idx) => {
        replyMsg += `${idx + 1}. \u2705 *${inv.events?.title || "Event"}*\n   📈… ${inv.events?.date || "TBD"}\n   📈 ${inv.events?.location || "N/A"}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 21. MY REMINDERS
    if (commandLower === "my reminders" || commandLower === "reminders") {
      const { data: reminders } = await supabase
        .from("reminders")
        .select("title, scheduled_time, priority, is_completed")
        .eq("agent_id", profile.id)
        .eq("is_completed", false)
        .order("scheduled_time", { ascending: true })
        .limit(10);

      if (!reminders || reminders.length === 0) {
        const replyEmpty = "\uD83E\uDD16 Bot: You have no pending reminders. Set one with:\n_\"aa Remind me to call Ravi time Tomorrow 10AM\"_";
        await sendOutboundReply(replyEmpty);
        return NextResponse.json({ status: "success", reply: replyEmpty });
      }

      const priorityEmoji: Record<string, string> = { high: "🔍´", medium: "Ÿ¡", low: "Ÿ¢" };
      let replyMsg = `â° *Your Pending Reminders* (${reminders.length})\n\n`;
      reminders.forEach((r, idx) => {
        const pe = priorityEmoji[r.priority] || "🔍”";
        replyMsg += `${idx + 1}. ${pe} *${r.title}*\n   • ${r.scheduled_time}\n\n`;
      });
      await sendOutboundReply(replyMsg.trim());
      return NextResponse.json({ status: "success", reply: replyMsg.trim() });
    }

    // 22. DASHBOARD QUICK STATS
    if (commandLower === "dashboard" || commandLower === "summary" || commandLower === "my stats") {
      const [leadsRes, remindersRes, eventsRes] = await Promise.all([
        supabase.from("leads").select("id, status").eq("agent_id", profile.id),
        supabase.from("reminders").select("id").eq("agent_id", profile.id).eq("is_completed", false),
        supabase.from("agent_invitations").select("id").eq("agent_id", profile.id).eq("status", "accepted"),
      ]);

      const leads = leadsRes.data || [];
      const hotLeads = leads.filter(l => ["interested", "site_visit", "negotiation"].includes(l.status)).length;
      const replyMsg = `📈Š *Your Dashboard Summary*\n\n` +
        `👤 *${profile.name}* | CP ID: ${profile.cp_id || "Pending"}\n` +
        `â­ XP: *${profile.points || 0} pts*\n\n` +
        `📈‹ *Leads*\n` +
        `â€¢ Total: *${leads.length}*\n` +
        `â€¢ Hot Leads: *${hotLeads}*\n\n` +
        `â° *Pending Reminders:* ${remindersRes.data?.length || 0}\n` +
        `📈… *Events Accepted:* ${eventsRes.data?.length || 0}\n\n` +
        `‘‰ Type _"aa help"_ for all commands.`;
      await sendOutboundReply(replyMsg);
      return NextResponse.json({ status: "success", reply: replyMsg });
    }

    // Default/Fallback help menu
    const helpMsg = `\uD83E\uDD16 Bot: I didn't catch that command. Type *aa help* to see all available commands.`;
    await sendOutboundReply(helpMsg);
    return NextResponse.json({ status: "success", reply: helpMsg });

  } catch (err: any) {
    console.error("Error processing WhatsApp POST Webhook:", err);
    const replyErr = `\uD83E\uDD16 Bot: âŒ Internal Webhook Error: ${err.message}`;
    // Fallback send if error occurs
    const apiKey = process.env.GALLABOX_API_KEY;
    const apiSecret = process.env.GALLABOX_API_SECRET;
    const channelId = process.env.GALLABOX_CHANNEL_ID;
    if (apiKey && apiSecret && channelId) {
      try {
        const cleanPhone = fromPhoneRaw.replace(/\D/g, "");
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        await fetch("https://server.gallabox.com/devapi/messages/whatsapp", {
          method: "POST",
          headers: { "apiKey": apiKey, "apiSecret": apiSecret, "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            channelType: "whatsapp",
            recipient: { name: "Agent", phone: finalPhone },
            whatsapp: { type: "text", text: { body: replyErr } }
          })
        });
      } catch (e) {}
    }
    return NextResponse.json({ error: err.message, reply: replyErr }, { status: 500 });
  }
}

// ============================================================
// H3MS (H3 MANAGEMENT SYSTEM) — SUPABASE EDGE FUNCTION: WHATSAPP WEBHOOK
// File: supabase/functions/whatsapp-webhook/index.ts
// Handles incoming Maytapi WhatsApp messages and stores them in Supabase
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-maytapi-key",
};

function normalizePhoneNumber(rawNumber: string | null | undefined): string | null {
  if (!rawNumber) return null;
  let digits = String(rawNumber).replace(/\D/g, "");
  if (!digits) return null;

  // If leading 0 with 11 digits (e.g. 07000206500), strip 0
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // 10 digits Indian mobile number (e.g. 7000206500) -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration in Edge Function environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Maytapi webhook types: 'message', 'ack'
    const eventType = body.type;
    const msgData = body.message;

    // Ignore delivery receipts (ack) or outgoing messages sent by us (fromMe = true)
    if (eventType !== "message" || !msgData || msgData.fromMe) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Not an incoming user message or fromMe=true" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const maytapiMessageId = msgData.id || `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawSender = msgData.from || body.user?.phone || body.phone;
    const cleanPhone = normalizePhoneNumber(rawSender);

    if (!cleanPhone) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Could not extract sender phone number" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 1. Deduplication: check if message already stored
    const { data: existingMsg } = await supabase
      .from("pms_wa_messages")
      .select("id")
      .eq("maytapi_message_id", maytapiMessageId)
      .maybeSingle();

    if (existingMsg?.id) {
      return new Response(
        JSON.stringify({ status: "already_processed", messageId: existingMsg.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Extract content & media
    let messageText = (msgData.text || msgData.caption || "").trim();
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let mediaName: string | null = null;

    if (
      msgData.type === "image" ||
      msgData.type === "document" ||
      msgData.type === "video" ||
      msgData.type === "audio" ||
      msgData.type === "voice" ||
      msgData.type === "ptt"
    ) {
      mediaUrl = msgData.url || msgData.media?.url || null;
      mediaType = msgData.mime || (msgData.type === "image" ? "image/jpeg" : msgData.type);
      
      // Clean up internal WhatsApp filenames (e.g. false_20701792747652@lid_ACC1E77D1D1A00574790AA881D230BA4.jpeg)
      let rawFilename = msgData.filename || (msgData.type === "image" ? "Photo.jpg" : "Attachment");
      if (/^false_\d+@lid_[a-zA-Z0-9]+/i.test(rawFilename)) {
        const ext = rawFilename.split('.').pop() || (msgData.type === 'image' ? 'jpg' : 'pdf');
        rawFilename = msgData.type === 'image' ? `Photo.${ext}` : `Document.${ext}`;
      }
      mediaName = rawFilename;

      // Only set messageText if user provided an actual text caption
      const userCaption = (msgData.caption || msgData.text || "").trim();
      messageText = userCaption;
    }

    const senderName =
      msgData.senderName ||
      msgData.notifyName ||
      msgData.pushname ||
      cleanPhone;

    // 3. Find or Create Contact in pms_wa_contacts
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("pms_wa_contacts")
      .select("id, display_name")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingContact?.id) {
      contactId = existingContact.id;
      // Update display name if contact had default phone as name
      if (
        senderName &&
        senderName !== cleanPhone &&
        (!existingContact.display_name || existingContact.display_name === cleanPhone)
      ) {
        await supabase
          .from("pms_wa_contacts")
          .update({ display_name: senderName, updated_at: new Date().toISOString() })
          .eq("id", contactId);
      }
    } else {
      const { data: newContact, error: cErr } = await supabase
        .from("pms_wa_contacts")
        .insert([{
          phone: cleanPhone,
          display_name: senderName,
          is_staff: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select("id")
        .maybeSingle();

      if (cErr) {
        console.warn("[whatsapp-webhook] Error creating contact:", cErr);
      }
      if (newContact?.id) contactId = newContact.id;
    }

    if (!contactId) {
      throw new Error(`Failed to resolve contact for phone: ${cleanPhone}`);
    }

    // 4. Find or Create Conversation in pms_wa_conversations
    let conversationId: string | null = null;
    let currentUnread = 0;
    let currentMsgCount = 0;

    const { data: existingConv } = await supabase
      .from("pms_wa_conversations")
      .select("id, unread_count, message_count")
      .eq("contact_id", contactId)
      .maybeSingle();

    if (existingConv?.id) {
      conversationId = existingConv.id;
      currentUnread = Number(existingConv.unread_count || 0);
      currentMsgCount = Number(existingConv.message_count || 0);
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("pms_wa_conversations")
        .insert([{
          contact_id: contactId,
          last_message: messageText || "Incoming message",
          last_message_at: new Date().toISOString(),
          last_message_status: "Received",
          unread_count: 0,
          message_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select("id, unread_count, message_count")
        .maybeSingle();

      if (convErr) {
        console.warn("[whatsapp-webhook] Error creating conversation:", convErr);
      }
      if (newConv?.id) {
        conversationId = newConv.id;
        currentUnread = 0;
        currentMsgCount = 0;
      }
    }

    if (!conversationId) {
      throw new Error(`Failed to resolve conversation for contact: ${contactId}`);
    }

    // 5. Insert Incoming Message in pms_wa_messages
    const { data: insertedMsg, error: msgErr } = await supabase
      .from("pms_wa_messages")
      .insert([{
        conversation_id: conversationId,
        contact_id: contactId,
        message: messageText,
        direction: "incoming",
        status: "Received",
        sent_by: "contact",
        sent_by_name: senderName,
        sent_at: new Date().toISOString(),
        maytapi_message_id: maytapiMessageId,
        media_url: mediaUrl,
        media_type: mediaType,
        media_name: mediaName,
        maytapi_response: body,
      }])
      .select()
      .single();

    if (msgErr) {
      console.error("[whatsapp-webhook] Error inserting incoming message:", msgErr);
      throw msgErr;
    }

    // 6. Update Conversation summary & increment unread_count
    await supabase
      .from("pms_wa_conversations")
      .update({
        last_message: messageText || (mediaName ? `📎 ${mediaName}` : "Attachment"),
        last_message_at: new Date().toISOString(),
        last_message_status: "Received",
        unread_count: currentUnread + 1,
        message_count: currentMsgCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    console.log(`[whatsapp-webhook] Successfully processed message from ${cleanPhone} (Conv: ${conversationId})`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: insertedMsg?.id,
        conversationId,
        sender: cleanPhone,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[whatsapp-webhook] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unknown server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

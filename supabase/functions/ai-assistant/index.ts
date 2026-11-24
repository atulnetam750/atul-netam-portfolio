import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://atulnetam750.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("origin") !== "https://atulnetam750.github.io") return json({ error: "Origin not allowed" }, 403);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !serviceKey || !openAiKey) return json({ error: "Server configuration missing" }, 500);

  let body: { message?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 700) return json({ error: "Message must be 1–700 characters" }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const clientHash = await sha256(ip + ":" + (Deno.env.get("AI_RATE_LIMIT_SALT") || "portfolio-v1"));
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: allowed, error: quotaError } = await admin.rpc("consume_ai_quota", { p_client_hash: clientHash });
  if (quotaError) return json({ error: "Rate limit service unavailable" }, 503);
  if (!allowed) return json({ error: "Hourly limit reached. Please try again later." }, 429);

  const history = Array.isArray(body.history) ? body.history.slice(-6).filter((item: any) =>
    item && ["user", "assistant"].includes(item.role) && typeof item.content === "string" && item.content.length <= 700
  ) : [];
  const input = [
    ...history.map((item: any) => ({ role: item.role, content: item.content })),
    { role: "user", content: message }
  ];

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": "Bearer " + openAiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-6.2-sol",
      instructions: "You are the Hindi-first website assistant for Atul Netam's professional portfolio. Answer politely and concisely. Known public facts: Atul Netam is a video journalist and cameraman associated with IBC24; he works in photography, videography, live event coverage and ground reporting; his portfolio is focused on Narayanpur, Bastar, Chhattisgarh. Do not invent awards, qualifications, private contact details, employment claims, current news, or analytics. If asked for facts not in this context, say you do not have verified information and direct the visitor to the contact form. Reply in the language used by the visitor.",
      input,
      max_output_tokens: 450
    })
  });
  if (!aiResponse.ok) {
    const requestId = aiResponse.headers.get("x-request-id") || "unknown";
    console.error("OpenAI API error", aiResponse.status, requestId);
    return json({ error: "AI service temporarily unavailable" }, 502);
  }
  const result = await aiResponse.json();
  const answer = (result.output || []).flatMap((item: any) => item.content || [])
    .filter((item: any) => item.type === "output_text")
    .map((item: any) => item.text).join("\n").trim();
  if (!answer) return json({ error: "Empty AI response" }, 502);
  return json({ answer });
});

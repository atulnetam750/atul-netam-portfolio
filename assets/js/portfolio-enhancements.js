import "./config.js";
import { supabase, supabaseReady } from "./supabase-client.js";

const config = window.PORTFOLIO_CONFIG || {};
const css = `
#an-chat-launcher{position:fixed;right:20px;bottom:22px;z-index:9998;border:0;border-radius:999px;padding:14px 18px;background:#e7b84b;color:#111;font-weight:800;box-shadow:0 12px 35px #0006;cursor:pointer}
#an-chat-panel{position:fixed;right:18px;bottom:84px;z-index:9999;width:min(370px,calc(100vw - 28px));height:min(520px,calc(100dvh - 120px));display:none;flex-direction:column;background:#11141d;color:#f7f7f7;border:1px solid #373b49;border-radius:18px;box-shadow:0 20px 70px #0009;overflow:hidden;font:14px/1.45 system-ui,sans-serif}
#an-chat-panel.open{display:flex}
#an-chat-head{padding:14px 16px;background:#1b2030;display:flex;justify-content:space-between;align-items:center}
#an-chat-head button{background:transparent;color:#fff;border:0;font-size:22px;cursor:pointer}
#an-chat-log{padding:14px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:10px}
.an-msg{max-width:88%;padding:10px 12px;border-radius:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.an-msg.bot{align-self:flex-start;background:#242a39}
.an-msg.user{align-self:flex-end;background:#dcb34b;color:#171717}
#an-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #343949}
#an-chat-input{min-width:0;flex:1;border-radius:10px;border:1px solid #41485b;background:#0d1018;color:white;padding:11px}
#an-chat-form button{border:0;border-radius:10px;background:#e7b84b;padding:0 14px;font-weight:800}
#an-chat-note{font-size:11px;color:#aab1c0;padding:0 14px 10px}
@media(prefers-reduced-motion:reduce){#an-chat-panel{scroll-behavior:auto}}
`;
const style = document.createElement("style"); style.textContent = css; document.head.append(style);

const launcher = document.createElement("button");
launcher.id = "an-chat-launcher"; launcher.type = "button"; launcher.textContent = "✦ Ask AI";
launcher.setAttribute("aria-expanded", "false"); launcher.setAttribute("aria-controls", "an-chat-panel");
const panel = document.createElement("section"); panel.id = "an-chat-panel"; panel.setAttribute("aria-label", "Atul Netam AI assistant");
panel.innerHTML = `
  <header id="an-chat-head"><div><strong>Atul AI Assistant</strong><div style="font-size:11px;color:#b9c1d2">Hindi • Portfolio Help</div></div><button type="button" id="an-chat-close" aria-label="Close">×</button></header>
  <div id="an-chat-log" aria-live="polite"><div class="an-msg bot">नमस्कार! मैं अतुल नेताम के पोर्टफोलियो, वीडियो कवरेज और प्रोफेशनल काम के बारे में जानकारी दे सकता हूँ।</div></div>
  <form id="an-chat-form"><input id="an-chat-input" maxlength="700" placeholder="अपना सवाल लिखें..." autocomplete="off" required/><button type="submit">भेजें</button></form>
  <div id="an-chat-note">AI उत्तर गलत हो सकते हैं। महत्वपूर्ण जानकारी की पुष्टि करें।</div>`;
document.body.append(launcher, panel);
const log = panel.querySelector("#an-chat-log"), form = panel.querySelector("#an-chat-form");
const input = panel.querySelector("#an-chat-input");
const history = [];
function addMessage(text, who) {
  const node = document.createElement("div"); node.className = "an-msg " + who;
  node.textContent = text; log.append(node); log.scrollTop = log.scrollHeight;
}
function setOpen(open) {
  panel.classList.toggle("open", open); launcher.setAttribute("aria-expanded", String(open));
  if (open) input.focus();
}
launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
panel.querySelector("#an-chat-close").addEventListener("click", () => setOpen(false));

form.addEventListener("submit", async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  if (message.length > 700) return addMessage("कृपया 700 अक्षरों के भीतर सवाल पूछें।", "bot");
  addMessage(message, "user"); input.value = "";
  const send = form.querySelector("button"); send.disabled = true; send.textContent = "…";
  try {
    if (!supabaseReady) throw new Error("AI अभी configure नहीं है। Admin setup में Supabase URL और Publishable Key जोड़ें।");
    const { data, error } = await supabase.functions.invoke(config.aiFunctionName || "ai-assistant", {
      body: { message, history: history.slice(-6) }
    });
    if (error) throw error;
    const answer = String(data?.answer || "अभी जवाब उपलब्ध नहीं है।");
    addMessage(answer, "bot");
    history.push({ role: "user", content: message }, { role: "assistant", content: answer });
  } catch (err) {
    addMessage(err?.message?.includes("configure") || err?.message?.includes("AI अभी")
      ? err.message : "अभी AI सेवा उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।", "bot");
    console.warn("Portfolio AI:", err);
  } finally { send.disabled = false; send.textContent = "भेजें"; input.focus(); }
});

// Render public projects from Supabase. Public RLS exposes only published rows.
async function loadManagedProjects() {
  const grid = document.querySelector("#dynamic-projects-grid");
  if (!grid) return;
  if (!supabaseReady) { grid.textContent = "नए प्रोजेक्ट्स देखने के लिए डेटा सेवा configure की जा रही है।"; return; }
  const { data, error } = await supabase.from("portfolio_projects")
    .select("id,title,category,description,url,image_url,created_at")
    .eq("published", true).order("created_at", { ascending: false }).limit(12);
  grid.replaceChildren();
  if (error) { grid.textContent = "अभी प्रोजेक्ट्स लोड नहीं हो सके।"; console.warn(error); return; }
  if (!data?.length) { grid.textContent = "नए प्रोजेक्ट्स जल्द जोड़े जाएंगे।"; return; }
  for (const project of data) {
    const card = document.createElement("article"); card.className = "proj-item";
    const body = document.createElement("div");
    const category = document.createElement("span"); category.className = "p-cat"; category.textContent = project.category;
    const title = document.createElement("h3"); title.className = "p-name"; title.textContent = project.title;
    const description = document.createElement("p"); description.className = "p-summary"; description.textContent = project.description || "";
    body.append(category, title, description);
    if (project.image_url && /^https:\/\//i.test(project.image_url)) {
      const image = document.createElement("img"); image.src = project.image_url; image.alt = project.title;
      image.loading = "lazy"; image.referrerPolicy = "no-referrer";
      image.style.cssText = "width:100%;max-height:190px;object-fit:cover;border-radius:10px;margin-bottom:10px";
      image.addEventListener("error", () => image.remove(), { once: true }); body.prepend(image);
    }
    card.append(body);
    if (project.url) {
      try {
        const url = new URL(project.url);
        if (url.protocol === "https:") {
          const link = document.createElement("a"); link.href = url.href; link.target = "_blank";
          link.rel = "noopener noreferrer"; link.className = "p-pill"; link.textContent = "प्रोजेक्ट देखें ↗";
          card.append(link);
        }
      } catch (_) {}
    }
    grid.append(card);
  }
}
loadManagedProjects();

// Lightweight contact form enhancement for an existing #contactForm, if present.
const contactForm = document.querySelector("#contactForm");
if (contactForm && supabaseReady) {
  contactForm.addEventListener("submit", async event => {
    event.preventDefault();
    const values = new FormData(contactForm);
    const payload = {
      name: String(values.get("name") || "").trim().slice(0, 100),
      email: String(values.get("email") || "").trim().slice(0, 180),
      message: String(values.get("message") || "").trim().slice(0, 3000)
    };
    if (!payload.name || !payload.email || !payload.message) {
      alert("कृपया नाम, ईमेल और संदेश भरें।"); return;
    }
    const { error } = await supabase.from("contact_messages").insert(payload);
    if (error) { alert("संदेश भेजा नहीं जा सका। कृपया दोबारा प्रयास करें।"); }
    else { alert("आपका संदेश भेज दिया गया है। धन्यवाद!"); contactForm.reset(); }
  });
}

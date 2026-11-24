import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

const cfg = window.PORTFOLIO_CONFIG || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl || "") &&
  typeof cfg.supabasePublishableKey === "string" &&
  cfg.supabasePublishableKey.length > 20 &&
  !cfg.supabasePublishableKey.includes("YOUR_");

export const supabaseReady = configured;
export const supabase = configured
  ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

// Thin Supabase wrapper. Loads the SDK from CDN only if Supabase is configured,
// so the app works fully offline (guest mode) without ever touching the network.
import { CONFIG } from "./config.js";

let _client = null;
let _loadPromise = null;

export function isSupabaseConfigured() {
  return CONFIG.SUPABASE_CONFIGURED;
}

export async function getSupabase() {
  if (!CONFIG.SUPABASE_CONFIGURED) return null;
  if (_client) return _client;
  if (!_loadPromise) {
    _loadPromise = import(
      /* webpackIgnore: true */ "https://esm.sh/@supabase/supabase-js@2"
    )
      .then(({ createClient }) => {
        _client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
        return _client;
      })
      .catch((err) => {
        console.error("[vyrona] Failed to load Supabase SDK — falling back to offline mode.", err);
        return null;
      });
  }
  return _loadPromise;
}

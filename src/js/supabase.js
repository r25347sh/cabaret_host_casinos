/**
 * Supabase client for Cabaret Host Casinos
 * URL / Key は公開可能な anon key を使用
 */
(function (global) {
  "use strict";

  const SUPABASE_URL = "https://ngjculhtbbxazgkkelvi.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_rYgVHob0s7YTscNujVBtPQ_Sh5GNR9s";

  let client = null;

  function getClient() {
    if (client) return client;
    if (global.supabase && global.supabase.createClient) {
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return client;
    }
    client = {
      from(table) {
        return {
          async select(cols) {
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?select=${cols || "*"}`,
              {
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
              }
            );
            if (!res.ok) throw new Error(await res.text());
            return { data: await res.json(), error: null };
          },
          async insert(row) {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
              method: "POST",
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
              },
              body: JSON.stringify(row),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { data, error: null };
          },
          async upsert(row, opts) {
            const onConflict = (opts && opts.onConflict) || "id";
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`,
              {
                method: "POST",
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "resolution=merge-duplicates,return=representation",
                },
                body: JSON.stringify(row),
              }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { data, error: null };
          },
          eq(col, val) {
            this._filters = this._filters || [];
            this._filters.push(`${col}=eq.${encodeURIComponent(val)}`);
            return this;
          },
          async update(patch) {
            const qs = (this._filters || []).join("&");
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?${qs}`,
              {
                method: "PATCH",
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
                },
                body: JSON.stringify(patch),
              }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { data, error: null };
          },
          async single() {
            const r = await this.select("*");
            if (r.error) return r;
            const row = Array.isArray(r.data) ? r.data[0] : r.data;
            return { data: row || null, error: null };
          },
        };
      },
    };
    return client;
  }

  function generateId() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function ensureGuest() {
    let id = localStorage.getItem("cabaret_guest_id");
    if (!id) {
      id = generateId();
      localStorage.setItem("cabaret_guest_id", id);
    }
    return id;
  }

  async function getGuest(id) {
    const sb = getClient();
    const { data, error } = await sb.from("guests").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  async function upsertGuest(row) {
    const sb = getClient();
    const { data, error } = await sb.from("guests").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function addPoints(guestId, pointKey, amount) {
    const guest = await getGuest(guestId);
    if (!guest) throw new Error("ゲストが見つかりません");
    const key = pointKey.toLowerCase();
    const current = Number(guest[key] || 0);
    const patch = { [key]: current + Number(amount) };
    const sb = getClient();
    const { data, error } = await sb.from("guests").eq("id", guestId).update(patch);
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  global.CabaretSB = {
    getClient,
    generateId,
    ensureGuest,
    getGuest,
    upsertGuest,
    addPoints,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  };
})(typeof window !== "undefined" ? window : globalThis);

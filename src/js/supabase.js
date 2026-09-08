/**
 * Supabase client for Cabaret Host Casinos
 * URL / Key は公開可能な anon key を使用
 */
(function (global) {
  "use strict";

  const SUPABASE_URL = "https://ngjculhtbbxazgkkelvi.supabase.co";
  // anon public JWT（Dashboard → Project Settings → API）
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5namN1bGh0YmJ4YXpna2tlbHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjYyMzEsImV4cCI6MjEwNDE0MjIzMX0.2AF7s7-cwgTMGuBl5TN1INhhkTaFJ2z-7Oj8t26iu2k";

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

  function formatError(err) {
    if (!err) return "不明なエラー";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  }

  /** REST 直接（supabase-js の有無に依存しない） */
  async function rest(method, path, body) {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (method === "POST" && path.indexOf("on_conflict") !== -1) {
      headers.Prefer = "resolution=merge-duplicates,return=representation";
    }
    const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: method,
      headers: headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }
    if (!res.ok) {
      const msg =
        (data && (data.message || data.error || data.hint)) ||
        text ||
        res.status + " " + res.statusText;
      throw new Error(msg);
    }
    return data;
  }

  async function getGuest(id) {
    const data = await rest(
      "GET",
      "guests?id=eq." + encodeURIComponent(id) + "&select=*"
    );
    if (Array.isArray(data)) return data[0] || null;
    return data;
  }

  async function upsertGuest(row) {
    const data = await rest("POST", "guests?on_conflict=id", row);
    return Array.isArray(data) ? data[0] : data;
  }

  async function addPoints(guestId, pointKey, amount) {
    const guest = await getGuest(guestId);
    if (!guest) throw new Error("ゲストが見つかりません");
    const key = String(pointKey).toLowerCase();
    if (["point1", "point2", "point3"].indexOf(key) === -1) {
      throw new Error("不正なポイント種別: " + key);
    }
    const current = Number(guest[key] || 0);
    const patch = { [key]: current + Number(amount) };
    const data = await rest(
      "PATCH",
      "guests?id=eq." + encodeURIComponent(guestId),
      patch
    );
    return Array.isArray(data) ? data[0] : data;
  }

  async function findGuestsByName(name) {
    const q =
      "guests?name=eq." +
      encodeURIComponent(name) +
      "&select=*&order=name.asc";
    const data = await rest("GET", q);
    return Array.isArray(data) ? data : data ? [data] : [];
  }

  async function listGuests() {
    const data = await rest("GET", "guests?select=*&order=name.asc");
    return Array.isArray(data) ? data : [];
  }

  global.CabaretSB = {
    getClient,
    generateId,
    ensureGuest,
    getGuest,
    upsertGuest,
    addPoints,
    findGuestsByName,
    listGuests,
    formatError,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  };
})(typeof window !== "undefined" ? window : globalThis);

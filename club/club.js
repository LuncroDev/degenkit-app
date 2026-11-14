/* DegenKit Club front end: wallet sign-in, membership payment, leaderboard, live calls, account profiles. */
(() => {
  "use strict";
  const API = "https://dmryjxwglpdubjqpyapi.supabase.co/functions/v1/club-api";
  const RPC = "https://mainnet.helius-rpc.com/?api-key=74c953b1-4f9b-4f58-91b8-d59aa59a7a89";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
  };
  const state = { token: LS.get("dkc_token"), me: null, wallet: null, adapter: null, plat: "all", quote: null, busy: false, timer: null, picking: false };
  const wallets = new Map();

  // ---------- formatting ----------
  const CHAIN = { solana: "Solana", ethereum: "Ethereum", bsc: "BNB Chain", base: "Base", robinhood: "Robinhood Chain", elysium: "Elysium", arbitrum: "Arbitrum", polygon: "Polygon" };
  const fx = (v) => v == null ? '<b class="dim">–</b>' : `<b class="${v >= 1 ? "up" : "down"}">${(+v >= 10 ? (+v).toFixed(1) : (+v).toFixed(2))}×</b>`;
  const pct = (v) => v == null ? "–" : Math.round(v * 100) + "%";
  const num = (v, d = 0) => v == null ? "–" : (+v).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const short = (a) => a ? a.slice(0, 4) + "…" + a.slice(-4) : "";
  const ago = (t) => { const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000); return s < 90 ? Math.round(s) + "s ago" : s < 5400 ? Math.round(s / 60) + "m ago" : s < 129600 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };
  const dur = (s) => s == null ? "–" : s < 90 ? s + " s" : s < 5400 ? Math.round(s / 60) + " min" : (s / 3600).toFixed(1) + " h";
  const day = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const srcUrl = (s) => s.platform === "x" ? "https://x.com/" + encodeURIComponent(s.handle) : "https://t.me/" + encodeURIComponent(s.handle);
  const safeUrl = (u) => /^https:\/\/(x\.com|twitter\.com|t\.me)\//.test(u || "") ? u : "";
  const plat = (p) => `<span class="c-plat">${p === "x" ? "X" : "TG"}</span>`;

  // ---------- API ----------
  async function api(a, body = {}) {
    let r;
    try {
      r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", ...(state.token ? { authorization: "Bearer " + state.token } : {}) }, body: JSON.stringify({ a, ...body }) });
    } catch { throw new Error("Could not reach the Club server. Check your connection and try again."); }
    let j = {}; try { j = await r.json(); } catch { /* empty body */ }
    if (r.status === 401 && j.code === "auth") { state.token = null; state.me = null; LS.del("dkc_token"); }
    if (!r.ok && r.status !== 202) { const e = new Error(j.error || "Request failed. Try again."); e.status = r.status; e.data = j; throw e; }
    j._status = r.status; return j;
  }
  const friendly = (e) => /reject|denied|cancel|declin/i.test(e && e.message || "") ? "You cancelled the request in your wallet. Nothing was sent." : (e && e.message) || "Something went wrong. Try again.";

  // ---------- wallets (Wallet Standard, with a fallback for injected Phantom and Solflare) ----------
  function addStandard(w) {
    if (!w || !Array.isArray(w.chains) || !w.chains.some((c) => c.startsWith("solana:")) || !w.features || !w.features["standard:connect"]) return;
    wallets.set(w.name, {
      name: w.name, icon: typeof w.icon === "string" && w.icon.startsWith("data:image/") ? w.icon : "",
      async connect() { const { accounts } = await w.features["standard:connect"].connect(); if (!accounts || !accounts.length) throw new Error("The wallet returned no account."); this.account = accounts[0]; return accounts[0].address; },
      async signMessage(bytes) { const f = w.features["solana:signMessage"]; if (!f) throw new Error(w.name + " cannot sign messages. Use Phantom, Solflare or Backpack."); const [r] = await f.signMessage({ account: this.account, message: bytes }); return r.signature; },
      async signTx(bytes) { const f = w.features["solana:signTransaction"]; if (!f) throw new Error(w.name + " cannot sign transactions here."); const [r] = await f.signTransaction({ transaction: bytes, account: this.account, chain: "solana:mainnet" }); return r.signedTransaction; },
    });
    if (state.picking) renderJoin();
  }
  function addLegacy(name, p) {
    if (!p || wallets.has(name)) return;
    wallets.set(name, {
      name, icon: "/assets/wallets/" + name.toLowerCase() + ".png",
      async connect() { const r = await p.connect(); const pk = (r && r.publicKey) || p.publicKey; if (!pk) throw new Error("The wallet returned no account."); return pk.toString(); },
      async signMessage(bytes) { const r = await p.signMessage(bytes, "utf8"); return r.signature || r; },
      async signTx(bytes) { const { web3 } = await libs(); const signed = await p.signTransaction(web3.Transaction.from(bytes)); return signed.serialize(); },
    });
    if (state.picking) renderJoin();
  }
  const stdApi = { register: (...ws) => { ws.forEach(addStandard); return () => {}; } };
  window.addEventListener("wallet-standard:register-wallet", (e) => { try { e.detail(stdApi); } catch { /* not a standard wallet */ } });
  try { window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: stdApi })); } catch { /* old browser */ }
  [500, 1500, 3000].forEach((ms) => setTimeout(() => { addLegacy("Phantom", window.phantom && window.phantom.solana); addLegacy("Solflare", window.solflare); }, ms));

  let libsP = null;
  function libs() {
    if (!libsP) libsP = (async () => {
      const sources = [
        ["https://esm.sh/@solana/web3.js@1.95.4", "https://esm.sh/@solana/spl-token@0.4.9", "https://esm.sh/buffer@6.0.3"],
        ["https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.4/+esm", "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.9/+esm", "https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm"],
      ];
      for (const [a, b, c] of sources) {
        try { const [web3, spl, buf] = await Promise.all([import(a), import(b), import(c)]); if (!window.Buffer) window.Buffer = buf.Buffer; return { web3, spl }; } catch (e) { console.error("library source failed", a, e); }
      }
      libsP = null; throw new Error("Could not load the Solana libraries. Check your connection and reload the page.");
    })();
    return libsP;
  }

  // ---------- sign-in and payment ----------
  async function connect(name) {
    const ad = wallets.get(name); if (!ad) return;
    const addr = await ad.connect();
    if (state.me && state.me.wallet !== addr) throw new Error("This wallet (" + short(addr) + ") is not the one you signed in with (" + short(state.me.wallet) + "). Switch accounts in your wallet or sign out first.");
    state.adapter = ad; state.wallet = addr; state.picking = false;
  }
  async function signIn() {
    const { message } = await api("nonce", { wallet: state.wallet });
    const sig = await state.adapter.signMessage(new TextEncoder().encode(message));
    const r = await api("login", { wallet: state.wallet, signature: btoa(String.fromCharCode(...new Uint8Array(sig))) });
    state.token = r.token; LS.set("dkc_token", r.token); state.me = r.me;
  }
  async function pay(asset) {
    const q = state.quote = await api("quote");
    const { web3, spl } = await libs();
    const conn = new web3.Connection(RPC, "confirmed");
    const from = new web3.PublicKey(state.wallet), to = new web3.PublicKey(q.treasury);
    const tx = new web3.Transaction();
    if (asset === "SOL") {
      tx.add(web3.SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: Math.round(q.sol * 1e9) }));
    } else {
      const mint = new web3.PublicKey(q.usdc_mint);
      const src = spl.getAssociatedTokenAddressSync(mint, from), dst = spl.getAssociatedTokenAddressSync(mint, to);
      tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(from, dst, to, mint));
      tx.add(spl.createTransferCheckedInstruction(src, mint, dst, from, BigInt(Math.round(q.usdc * 1e6)), 6));
    }
    tx.feePayer = from;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    setMsg("Approve the payment in your wallet.");
    const signed = await state.adapter.signTx(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
    setMsg("Sending the transaction…");
    let sig;
    try { sig = await conn.sendRawTransaction(signed, { maxRetries: 5 }); }
    catch (e) { throw new Error(/insufficient|0x1\b|debit an account/i.test(e.message || "") ? "Not enough " + asset + " in this wallet for the payment and the network fee." : "The network rejected the transaction: " + (e.message || "unknown error")); }
    LS.set("dkc_pending", sig);
    await confirmPayment(sig);
  }
  async function confirmPayment(sig) {
    for (let i = 0; i < 12; i++) {
      setMsg("Payment sent. Waiting for the network to confirm it…");
      let r;
      try { r = await api("verify", { tx: sig }); }
      catch (e) { if (e.status === 400) { LS.del("dkc_pending"); throw e; } r = {}; }
      if (r.ok) { LS.del("dkc_pending"); state.me = r.me; return; }
      await sleep(4000);
    }
    throw new Error("We could not confirm the payment yet. Your transaction is saved on this device: press “Check my payment” in a minute.");
  }

  // ---------- landing: stats, sample, join card ----------
  let msgText = "", msgKind = "";
  function setMsg(t, kind = "") { msgText = t; msgKind = kind; const el = $("#cMsg"); if (el) { el.textContent = t; el.className = "c-msg" + (kind ? " " + kind : ""); } }
  async function act(fn) {
    if (state.busy) return;
    state.busy = true; renderJoin();
    try { await fn(); setMsg(""); } catch (e) { setMsg(friendly(e), "err"); }
    state.busy = false; route();
  }
  function renderJoin() {
    const box = $("#cJoin"); if (!box) return;
    const me = state.me, dis = state.busy ? " disabled" : "";
    const s1 = me || state.wallet, s2 = !!me, mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const here = encodeURIComponent(location.href.split("#")[0]), ref = encodeURIComponent(location.origin);
    const list = [...wallets.values()].map((w) => `<button class="c-btn" data-wallet="${esc(w.name)}"${dis}>${w.icon ? `<img src="${esc(w.icon)}" alt="">` : ""}Connect ${esc(w.name)}</button>`).join("");
    const none = `<span>No Solana wallet found in this browser.${mobile ? " On a phone, open this page inside your wallet app:" : " Install Phantom or Solflare, then reload."}</span>
      <div class="act">${mobile ? `<a class="c-btn" href="https://phantom.app/ul/browse/${here}?ref=${ref}">Open in Phantom</a><a class="c-btn" href="https://solflare.com/ul/v1/browse/${here}?ref=${ref}">Open in Solflare</a>` : `<a class="c-btn" href="https://phantom.app/" target="_blank" rel="noopener">Get Phantom</a><a class="c-btn" href="https://solflare.com/" target="_blank" rel="noopener">Get Solflare</a>`}</div>`;
    const needWallet = !state.adapter;
    const q = state.quote;
    box.innerHTML = `<ol class="c-steps">
      <li class="${s1 ? "done" : "now"}"><div><b>Connect your Solana wallet</b>
        ${s1 ? `<span>Connected: <span class="c-mono">${esc(short(state.wallet || me.wallet))}</span></span>` : (state.picking ? (list ? `<div class="c-wallets">${list}</div>` : none) : `<span>Phantom, Solflare, Backpack and other Solana wallets work.</span><div class="act"><button class="c-btn pri" data-do="pick"${dis}>Connect wallet</button></div>`)}
      </div></li>
      <li class="${s2 ? "done" : s1 ? "now" : ""}"><div><b>Sign in</b>
        <span>${s2 ? "Signed in." : "Sign a short text message to prove the wallet is yours. It is free and moves nothing."}</span>
        ${!s2 && s1 ? `<div class="act"><button class="c-btn pri" data-do="signin"${dis}>${state.busy ? "Waiting for your wallet…" : "Sign in with wallet"}</button></div>` : ""}
      </div></li>
      <li class="${me && me.member ? "done" : s2 ? "now" : ""}"><div><b>Pay for ${me ? me.period_days : 30} days</b>
        <span>${me && me.member ? "Active" + (me.paid_until ? " until " + esc(day(me.paid_until)) : "") + ". Paying again adds another " + me.period_days + " days." : "Send $" + (me ? me.price_usd : 99) + " in SOL or USDC from this wallet. Access opens when the transaction confirms."}</span>
        ${s2 ? (needWallet ? `<div class="act">${state.picking ? (list ? `<div class="c-wallets">${list}</div>` : none) : `<button class="c-btn pri" data-do="pick"${dis}>Reconnect wallet to pay</button>`}</div>`
          : `<div class="act"><button class="c-btn pri" data-do="pay-usdc"${dis}>Pay ${me.price_usd} USDC</button><button class="c-btn" data-do="pay-sol"${dis}>Pay in SOL${q ? " (" + q.sol + " SOL)" : ""}</button>${LS.get("dkc_pending") ? `<button class="c-btn" data-do="check"${dis}>Check my payment</button>` : ""}</div>`) : ""}
      </div></li></ol>
      <p class="c-msg${msgKind ? " " + msgKind : ""}" id="cMsg" role="status" aria-live="polite">${esc(msgText)}</p>
      ${s2 ? `<p class="c-fine"><button class="c-link" data-do="signout">Sign out</button>${me.member ? ` · <a href="#/board">Open the leaderboard</a>` : ""}</p>` : ""}`;
  }
  document.addEventListener("click", (e) => {
    const w = e.target.closest("[data-wallet]"), d = e.target.closest("[data-do]"), cp = e.target.closest("[data-copy]"), ch = e.target.closest("[data-plat]");
    if (w) return act(() => connect(w.dataset.wallet));
    if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy).then(() => { const t = cp.textContent; cp.textContent = "Copied"; setTimeout(() => (cp.textContent = t), 1200); }); return; }
    if (ch) { state.plat = ch.dataset.plat; return route(); }
    if (!d) return;
    const k = d.dataset.do;
    if (k === "pick") { state.picking = true; renderJoin(); }
    else if (k === "signin") act(signIn);
    else if (k === "pay-usdc") act(() => pay("USDC"));
    else if (k === "pay-sol") act(() => pay("SOL"));
    else if (k === "check") act(() => confirmPayment(LS.get("dkc_pending")));
    else if (k === "signout") { api("logout").catch(() => {}); state.token = null; state.me = null; state.wallet = null; state.adapter = null; LS.del("dkc_token"); location.hash = ""; route(); }
  });
  async function loadPublic() {
    try {
      const p = await api("public");
      const set = (id, v) => { const el = $(id); if (el) el.textContent = num(v); };
      set("#stX", p.sources_x); set("#stTg", p.sources_tg); set("#stCalls", p.calls); set("#st24", p.calls_24h);
      const rows = (p.sample || []).map((r) => `<tr><td>${esc(day(r.posted_at))}</td><td><span class="c-acct">${plat(r.platform)}<b>${esc(r.handle)}</b></span></td><td>${esc(r.symbol || "?")} <span class="dim">${esc(CHAIN[r.chain] || r.chain)}</span></td><td>${fx(r.x_peak)} <span class="dim">after ${esc(dur(r.secs_to_peak))}</span></td><td>${fx(r.x_1h)}</td><td>${fx(r.x_24h)}</td><td>${pct(r.hold)}</td><td><span class="c-badge ${esc(r.outcome)}">${esc(r.outcome)}</span></td><td class="${r.points >= 0 ? "up" : "down"}">${r.points > 0 ? "+" : ""}${num(r.points, 1)}</td></tr>`).join("");
      if (rows) { $("#cSampleBody").innerHTML = rows; $("#cSample").hidden = false; }
    } catch { /* the landing page works without live numbers */ }
  }

  // ---------- member views ----------
  function callRow(c) {
    const t = c.token, s = c.source, img = /^https:\/\//.test(t.image || "") ? `<img src="${esc(t.image)}" alt="" loading="lazy" width="36" height="36">` : '<span class="ph"></span>';
    const live = c.status !== "final";
    const badge = c.status === "final" ? `<span class="c-badge ${esc(c.outcome)}">${esc(c.outcome)}</span>` : c.status === "tracking" ? '<span class="c-badge live">Tracking</span>' : c.status === "no_data" ? '<span class="c-badge">No data</span>' : '<span class="c-badge">Queued</span>';
    const pts = c.points == null ? "" : `<small><span class="${c.points >= 0 ? "up" : "down"}">${c.points > 0 ? "+" : ""}${num(c.points, 1)} pts</span>${live ? " so far" : ""} · ${pct(c.hold)} of time above entry</small>`;
    const post = safeUrl(c.post_url);
    return `<article class="c-row">
      <div class="tok">${img}<div style="min-width:0"><b>${esc(t.symbol || "Unknown token")}</b><span>${esc(CHAIN[t.chain] || t.chain)} · ${esc(short(t.address))}</span></div></div>
      <div class="src"><a href="#/a/${+s.id}">${esc(s.platform === "x" ? "@" + s.handle : s.handle)}</a><span>${s.platform === "x" ? "X" : "Telegram"} · ${esc(ago(c.posted_at))}${c.repeats ? " · repeated " + (+c.repeats) + "×" : ""}</span></div>
      <div class="m"><i>Now</i>${fx(c.x_now)}</div><div class="m"><i>Peak</i>${fx(c.x_peak)}</div><div class="m"><i>1 h</i>${fx(c.x_1h)}</div><div class="m"><i>6 h</i>${fx(c.x_6h)}</div><div class="m"><i>24 h</i>${fx(c.x_24h)}</div>
      <div class="res">${badge}${pts}</div>
      <div class="links"><q>${esc((c.excerpt || "").replace(/\s+/g, " "))}</q>${post ? `<a href="${esc(post)}" target="_blank" rel="noopener nofollow">Open post</a>` : ""}<a href="https://dexscreener.com/${encodeURIComponent(t.chain)}/${encodeURIComponent(t.address)}" target="_blank" rel="noopener nofollow">Open chart</a><button class="c-link" data-copy="${esc(t.address)}">Copy address</button></div>
    </article>`;
  }
  const skeleton = '<div class="c-calls"><div class="c-skel"></div><div class="c-skel"></div><div class="c-skel"></div></div>';
  const failed = (e) => `<div class="c-empty"><b>Could not load this view</b>${esc(friendly(e))}<br><button class="c-btn sm" style="margin-top:12px" onclick="location.reload()">Reload</button></div>`;
  const chips = () => `<div class="c-filters" role="group" aria-label="Source">${[["all", "All sources"], ["x", "X"], ["telegram", "Telegram"]].map(([k, l]) => `<button class="c-chip" data-plat="${k}" aria-pressed="${state.plat === k}">${l}</button>`).join("")}</div>`;

  async function viewBoard(v) {
    v.innerHTML = skeleton;
    const { rows } = await api("leaderboard");
    const list = rows.filter((r) => state.plat === "all" || r.platform === state.plat);
    const tr = (r) => `<tr class="click" data-href="#/a/${+r.id}"><td>${r.rank ? "#" + (+r.rank) : '<span class="dim">–</span>'}</td>
      <td><span class="c-acct">${plat(r.platform)}<a href="#/a/${+r.id}" style="color:inherit;text-decoration:none"><b>${esc(r.platform === "x" ? "@" + r.handle : r.name || r.handle)}</b></a></span></td>
      <td><span class="c-score ${r.score >= 55 ? "hi" : r.score < 45 ? "lo" : ""}">${num(r.score, 1)}</span></td><td>${+r.scored} <span class="dim">/ ${+r.calls}</span></td>
      <td>${r.scored ? pct(r.wins / r.scored) : "–"}</td><td>${fx(r.med_peak)}</td><td>${fx(r.avg_24h)}</td><td>${pct(r.hold)}</td><td class="${r.dumps + r.rugs ? "down" : "dim"}">${+r.dumps + +r.rugs}</td><td class="dim">${r.last_call ? esc(ago(r.last_call)) : "–"}</td></tr>`;
    const ranked = list.filter((r) => r.rank), rest = list.filter((r) => !r.rank);
    v.innerHTML = chips() + (list.length ? `<div class="c-tablewrap"><table class="c-table"><thead><tr><th>Rank</th><th>Account</th><th>Score</th><th>Scored calls</th><th>Win rate</th><th>Median peak</th><th>Avg at 24 h</th><th>Time above entry</th><th>Dumps + rugs</th><th>Last call</th></tr></thead><tbody>
      ${ranked.map(tr).join("")}${rest.length ? `<tr><td class="sep" colspan="10">Not ranked yet: fewer than 5 scored calls</td></tr>` + rest.map(tr).join("") : ""}</tbody></table></div>
      <p class="c-fine">Score runs from 0 to 100 over the last 90 days; 50 is neutral. A win is a call whose blended 1 h, 6 h and 24 h return is at least 1.2× while the price stayed above entry at least 40% of the time. Data, not advice.</p>`
      : `<div class="c-empty"><b>No accounts with calls yet</b>Accounts appear here as soon as their first call is measured.</div>`);
  }
  async function viewCalls(v, silent) {
    if (!silent) v.innerHTML = skeleton;
    const { rows } = await api("calls", { limit: 80 });
    const list = rows.filter((r) => state.plat === "all" || r.source.platform === state.plat);
    v.innerHTML = chips() + (list.length ? `<div class="c-calls">${list.map(callRow).join("")}</div><p class="c-fine">Multiples compare the price with the entry price in the minute of the call. This list refreshes every minute.</p>`
      : `<div class="c-empty"><b>No calls in this view yet</b>New calls show up here within about a minute of being posted.</div>`);
  }
  async function viewAccount(v, id) {
    v.innerHTML = skeleton;
    const { source: s } = await api("source", { id });
    const tile = (l, val) => `<div class="c-stat"><b>${val}</b><span>${l}</span></div>`;
    const origin = s.origin ? ` · pump.fun leaderboard #${+s.origin_rank} (${s.origin === "pump_alltime" ? "all time" : "PnL board"}, snapshot 14 Nov 2026)${s.wallet ? ` · wallet <a href="https://solscan.io/account/${encodeURIComponent(s.wallet)}" target="_blank" rel="noopener nofollow">${esc(short(s.wallet))}</a>` : ""}` : "";
    v.innerHTML = `<p class="c-fine" style="margin:0 0 4px"><a href="#/board">← Leaderboard</a></p>
      <div class="c-phead"><div><h2>${esc(s.platform === "x" ? "@" + s.handle : s.name || s.handle)}</h2><p>${s.platform === "x" ? "X" : "Telegram"} · <a href="${esc(srcUrl(s))}" target="_blank" rel="noopener nofollow">Open ${s.platform === "x" ? "profile" : "channel"}</a>${origin}</p></div>
      <span class="c-score ${s.score >= 55 ? "hi" : s.score < 45 ? "lo" : ""}" style="font-size:22px;padding:8px 14px">${s.score == null ? "–" : num(s.score, 1)}</span></div>
      <div class="c-tiles">${tile("Rank", s.rank ? "#" + (+s.rank) : "–")}${tile("Scored calls", (+s.scored || 0) + " / " + (+s.calls || 0))}${tile("Win rate", s.scored ? pct(s.wins / s.scored) : "–")}${tile("Median peak", s.med_peak == null ? "–" : (+s.med_peak).toFixed(2) + "×")}${tile("Time above entry", pct(s.hold))}${tile("Dumps + rugs", (+s.dumps || 0) + (+s.rugs || 0))}</div>
      ${(s.call_list || []).length ? `<div class="c-calls">${s.call_list.map(callRow).join("")}</div>` : `<div class="c-empty"><b>No measured calls yet</b>This account has not posted a contract address since tracking started.</div>`}`;
  }

  // ---------- routing ----------
  async function route() {
    clearInterval(state.timer);
    const me = state.me, land = $("#cLanding"), app = $("#cApp"), h = location.hash || "";
    const wantsJoin = h === "#/join" || h === "#join";
    if (!me || !me.member || wantsJoin) {
      land.hidden = false; app.hidden = true; renderJoin();
      if (wantsJoin) $("#join").scrollIntoView({ block: "start" });
      return;
    }
    land.hidden = true; app.hidden = false;
    const m = h.match(/^#\/a\/(\d+)$/), tab = m ? "" : h === "#/calls" ? "calls" : "board";
    $("#cWho").innerHTML = `${me.admin ? "Admin" : "Member until " + esc(day(me.paid_until))} · <b>${esc(short(me.wallet))}</b> <a class="c-btn sm" href="#/join">${me.admin ? "Membership" : "Renew"}</a> <button class="c-btn sm" data-do="signout">Sign out</button>`;
    document.querySelectorAll(".c-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const v = $("#cView");
    try {
      if (m) await viewAccount(v, +m[1]);
      else if (tab === "calls") { await viewCalls(v); state.timer = setInterval(() => { if (!document.hidden) viewCalls(v, true).catch(() => {}); }, 60000); }
      else await viewBoard(v);
    } catch (e) {
      if (e.status === 402 || e.status === 401) { state.me = e.data && e.data.me || null; return route(); }
      v.innerHTML = failed(e);
    }
  }
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".c-tab"), row = e.target.closest("tr[data-href]");
    if (tab) location.hash = tab.dataset.tab === "calls" ? "#/calls" : "#/board";
    else if (row && !e.target.closest("a,button")) location.hash = row.dataset.href;
  });
  window.addEventListener("hashchange", route);

  (async () => {
    renderJoin(); loadPublic();
    if (state.token) { try { state.me = (await api("me")).me; } catch { /* signed out */ } }
    await route();
    const pending = LS.get("dkc_pending");
    if (pending && state.me && !state.me.member) act(() => confirmPayment(pending));
  })();
})();

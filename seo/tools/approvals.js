// DegenKit token approval checker. Reads ERC-20 Approval events and current allowances; revokes with approve(spender, 0).
// Read-only until the user signs a revoke in their own wallet. Keys are never requested.
import { BrowserProvider, JsonRpcProvider, Contract, isAddress, getAddress, formatUnits } from "https://esm.sh/ethers@6.13.4";

const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const PERMIT2 = { address: "0x000000000022D473030F116dDEE9F6B43aC78BA3", label: "Uniswap Permit2" };
const NETS = {
  ethereum: { name: "Ethereum", chainId: 1, hex: "0x1", rpc: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io",
    scan: { base: "https://api.etherscan.io/v2/api", chainid: 1, key: "2HECWBMT2ME82JNMXU3E74YRHZVCWZGW61" }, add: null },
  robinhood: { name: "Robinhood Chain", chainId: 4663, hex: "0x1237", rpc: "https://rpc.mainnet.chain.robinhood.com", explorer: "https://robinhoodchain.blockscout.com",
    scan: { base: "https://robinhoodchain.blockscout.com/api" },
    add: { chainId: "0x1237", chainName: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"], blockExplorerUrls: ["https://robinhoodchain.blockscout.com"] } },
  base: { name: "Base", chainId: 8453, hex: "0x2105", rpc: "https://base-rpc.publicnode.com", explorer: "https://basescan.org", scan: null,
    spenders: [PERMIT2],
    add: { chainId: "0x2105", chainName: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"] } },
  bnb: { name: "BNB Chain", chainId: 56, hex: "0x38", rpc: "https://bsc-rpc.publicnode.com", explorer: "https://bscscan.com", scan: null,
    spenders: [{ address: "0x10ED43C718714eb63d5aA57B78B54704E256024E", label: "PancakeSwap V2 Router" }, PERMIT2],
    add: { chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org"], blockExplorerUrls: ["https://bscscan.com"] } },
};
const EXTRA_LABELS = [["0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "Uniswap V2 Router"]];
const ERC20 = ["function allowance(address,address) view returns (uint256)", "function symbol() view returns (string)",
  "function name() view returns (string)", "function decimals() view returns (uint8)", "function approve(address,uint256) returns (bool)"];
const UNLIMITED = 2n ** 200n;
const MAX_PAIRS = 250;

const $ = (id) => document.getElementById(id);
const net = () => NETS[$("apNet").value];
const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
function msg(t, cls){ const m = $("apMsg"); m.textContent = t || ""; m.className = "t-msg" + (cls ? " " + cls : ""); }

function syncMode(){
  const n = net();
  const manual = !n.scan;
  $("apManual").hidden = !manual;
  if(manual){
    $("apManualNote").textContent = `A full wallet scan isn’t available on ${n.name} yet. Enter a token you hold and the checker will read its allowance for ` +
      n.spenders.map(s => s.label).join(", ") + " and any extra spender you add.";
  }
  $("apScan").textContent = manual ? "Check this token" : "Check approvals";
}
$("apNet").addEventListener("change", () => { syncMode(); $("apResults").hidden = true; msg(""); });
syncMode();

// ---------- explorer logs ----------
async function fetchApprovalLogs(n, owner){
  const padded = "0x" + "0".repeat(24) + owner.slice(2).toLowerCase();
  const seen = new Set(); const out = [];
  let from = 0;
  for(let round = 0; round < 10; round++){
    const url = `${n.scan.base}?` + (n.scan.chainid ? `chainid=${n.scan.chainid}&` : "") +
      `module=logs&action=getLogs&fromBlock=${from}&toBlock=latest&topic0=${APPROVAL_TOPIC}&topic0_1_opr=and&topic1=${padded}` +
      (n.scan.key ? `&apikey=${n.scan.key}` : "");
    const res = await fetch(url);
    if(!res.ok) throw new Error("Explorer API request failed (HTTP " + res.status + ")");
    const data = await res.json();
    if(!Array.isArray(data.result)){
      if(/no records/i.test(String(data.message || ""))) break;
      throw new Error("Explorer API: " + (typeof data.result === "string" ? data.result : (data.message || "unexpected response")));
    }
    let added = 0;
    for(const l of data.result){
      const k = l.transactionHash + ":" + l.logIndex;
      if(seen.has(k)) continue;
      seen.add(k); out.push(l); added++;
    }
    if(data.result.length < 1000 || added === 0) break;
    from = Number(data.result[data.result.length - 1].blockNumber);
  }
  return out;
}

// ---------- allowance reads ----------
const metaCache = new Map();
async function tokenMeta(provider, token){
  if(metaCache.has(token)) return metaCache.get(token);
  const c = new Contract(token, ERC20, provider);
  const [symbol, decimals] = await Promise.all([c.symbol().catch(() => "?"), c.decimals().catch(() => 18)]);
  const m = { symbol: String(symbol).slice(0, 24), decimals: Number(decimals) };
  metaCache.set(token, m); return m;
}
async function readPairs(provider, owner, pairs, onProgress){
  const results = []; let i = 0, done = 0;
  async function worker(){
    while(i < pairs.length){
      const p = pairs[i++];
      try{
        const c = new Contract(p.token, ERC20, provider);
        const amount = await c.allowance(owner, p.spender);
        if(amount > 0n){
          const meta = await tokenMeta(provider, p.token);
          results.push({ ...p, amount, ...meta });
        }
      }catch(e){ /* not an ERC-20 or call failed: skip */ }
      onProgress(++done, pairs.length);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return results.sort((a, b) => (b.amount >= UNLIMITED) - (a.amount >= UNLIMITED));
}

// ---------- render ----------
function cell(tr, html){ const td = document.createElement("td"); if(html instanceof Node) td.appendChild(html); else td.textContent = html; tr.appendChild(td); return td; }
function link(n, addr, text){ const a = document.createElement("a"); a.href = `${n.explorer}/address/${addr}`; a.target = "_blank"; a.rel = "noopener"; a.textContent = text; return a; }
function render(n, owner, rows){
  const tb = $("apRows"); tb.innerHTML = "";
  $("apTitle").textContent = rows.length ? `${rows.length} active approval${rows.length > 1 ? "s" : ""} on ${n.name}` : `No active approvals found on ${n.name}`;
  for(const r of rows){
    const tr = document.createElement("tr");
    const t = document.createElement("div"); t.className = "tok";
    const b = document.createElement("b"); b.textContent = r.symbol; t.appendChild(b);
    const s1 = document.createElement("span"); s1.className = "sub"; s1.appendChild(link(n, r.token, short(r.token))); t.appendChild(s1);
    cell(tr, t);
    const sp = document.createElement("div"); sp.className = "tok";
    if(r.label){ const l = document.createElement("b"); l.textContent = r.label; sp.appendChild(l); }
    const s2 = document.createElement("span"); s2.className = "sub"; s2.appendChild(link(n, r.spender, short(r.spender))); sp.appendChild(s2);
    cell(tr, sp);
    const amt = cell(tr, r.amount >= UNLIMITED ? "Unlimited" : Number(formatUnits(r.amount, r.decimals)).toLocaleString("en-US", { maximumFractionDigits: 4 }));
    if(r.amount >= UNLIMITED) amt.className = "unl";
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "t-btn small"; btn.textContent = "Revoke";
    btn.addEventListener("click", () => revoke(n, owner, r, btn));
    cell(tr, btn);
    tb.appendChild(tr);
  }
  $("apResults").hidden = false;
}

// ---------- actions ----------
function readOwner(){
  const v = $("apAddr").value.trim();
  if(!isAddress(v)) throw new Error("Enter a valid 0x wallet address.");
  return getAddress(v);
}
$("apScan").addEventListener("click", async () => {
  const btn = $("apScan"); const n = net();
  let owner;
  try{ owner = readOwner(); }catch(e){ msg(e.message, "err"); return; }
  btn.disabled = true; $("apResults").hidden = true;
  try{
    const provider = new JsonRpcProvider(n.rpc, n.chainId, { staticNetwork: true });
    let pairs;
    if(n.scan){
      msg(`Reading approval history on ${n.name}…`);
      const logs = (await fetchApprovalLogs(n, owner)).filter(l => Array.isArray(l.topics) && l.topics.length === 3);
      const map = new Map();
      for(const l of logs){
        const token = getAddress(l.address); const spender = getAddress("0x" + l.topics[2].slice(-40));
        map.set(token + spender, { token, spender });
      }
      pairs = [...map.values()].slice(-MAX_PAIRS);
      if(!pairs.length){ render(n, owner, []); msg("This wallet has never approved an ERC-20 spender on " + n.name + ".", "ok"); return; }
    }else{
      const tok = $("apToken").value.trim();
      if(!isAddress(tok)){ msg("Enter the token contract address to check.", "err"); return; }
      const extra = $("apSpender").value.trim();
      if(extra && !isAddress(extra)){ msg("The extra spender isn’t a valid address.", "err"); return; }
      const sp = [...n.spenders]; if(extra) sp.push({ address: extra, label: "" });
      pairs = sp.map(s => ({ token: getAddress(tok), spender: getAddress(s.address), label: s.label }));
    }
    const knownLabels = new Map([...EXTRA_LABELS.map(([a, l]) => [getAddress(a), l]), ...Object.values(NETS).flatMap(x => (x.spenders || []).map(s => [getAddress(s.address), s.label]))]);
    pairs.forEach(p => { if(!p.label && knownLabels.has(p.spender)) p.label = knownLabels.get(p.spender); });
    const rows = await readPairs(provider, owner, pairs, (d, t) => msg(`Checking current allowances… ${d}/${t}`));
    render(n, owner, rows);
    msg(rows.length ? "Review each spender. Revoke the ones you don’t recognise or no longer use." : "Nothing to revoke — every past approval is already used up or set to 0.", rows.length ? "" : "ok");
  }catch(e){
    console.error(e); msg(e.message || String(e), "err");
  }finally{ btn.disabled = false; }
});

$("apConnect").addEventListener("click", async () => {
  if(!window.ethereum){ msg("No EVM wallet found in this browser. You can still paste any address.", "err"); return; }
  try{
    const [a] = await window.ethereum.request({ method: "eth_requestAccounts" });
    $("apAddr").value = getAddress(a); msg("Wallet address filled in. Choose the network and check.", "ok");
  }catch(e){ msg(e && e.code === 4001 ? "Connection rejected in the wallet." : (e.message || String(e)), "err"); }
});

async function ensureChain(n){
  const cur = String(await window.ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if(cur === n.hex) return;
  try{ await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: n.hex }] }); }
  catch(e){
    if(e && e.code === 4902 && n.add){ await window.ethereum.request({ method: "wallet_addEthereumChain", params: [n.add] }); }
    else throw e;
  }
}
async function revoke(n, owner, r, btn){
  if(!window.ethereum){ msg("Connect an EVM wallet to revoke.", "err"); return; }
  btn.disabled = true;
  try{
    const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
    if(getAddress(acct) !== owner){ throw new Error(`Your wallet is connected as ${short(getAddress(acct))}. Switch to ${short(owner)} to revoke its approvals.`); }
    await ensureChain(n);
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    msg("Confirm the revoke in your wallet…");
    const tx = await new Contract(r.token, ERC20, signer).approve(r.spender, 0n);
    btn.textContent = "Revoking…"; msg("Waiting for confirmation…");
    await tx.wait();
    btn.textContent = "Revoked ✓"; msg("Approval revoked.", "ok");
    const amtCell = btn.closest("tr").children[2]; amtCell.textContent = "0"; amtCell.className = "";
  }catch(e){
    btn.disabled = false;
    msg(e && (e.code === 4001 || e.code === "ACTION_REJECTED") ? "Revoke rejected in the wallet." : (e.shortMessage || e.message || String(e)), "err");
  }
}

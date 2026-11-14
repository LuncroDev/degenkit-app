#!/usr/bin/env python3
"""DegenKit Club page builder. Writes /club/index.html (+ club.css, club.js) using the blog page shell.
Usage: python3 club-src/build.py   (also adds /club/ to sitemap.xml)"""
import importlib.util, pathlib, re, json, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("blogbuild", ROOT / "blog-src" / "build.py")
B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
SITE = B.SITE; esc = B.esc

TITLE = "DegenKit Club: Crypto Callers Ranked by Results"
DESC = "DegenKit Club tracks public token calls on X and Telegram and measures the price from the minute of each call. See which callers hold up, and which dump."
QA = [
    ("What is DegenKit Club?", "A members-only data service. It reads public posts from tracked X accounts and Telegram channels, picks out the contract addresses they share, and measures what the token's price did from the minute of the post. Each result moves that account's score up or down."),
    ("How is a call scored?", "Entry is the token's price in the minute the call was posted. We then record the peak, how long the price stayed above entry, and the price 1, 6 and 24 hours later. Those fixed checkpoints carry the score, so a short wick cannot inflate it. A call earns between -10 and +10 points; an account's score runs from 0 to 100 over the last 90 days and it is ranked after 5 scored calls."),
    ("Is this financial advice or a signal service?", "No. The Club reports what already happened after public posts. It does not tell you what to buy or sell, and past results do not predict future ones. Most tokens promoted on social media lose value."),
    ("How do I pay?", "From a Solana wallet, in SOL or USDC. The price is $99 for 30 days. There is no card payment and no automatic renewal: when your 30 days end you decide whether to pay again."),
    ("Which chains are covered?", "Solana, Ethereum, BNB Chain, Base, Robinhood Chain and Elysium. A call is measured on whichever chain the shared contract address trades on."),
    ("Can I get a refund?", "Payments are on-chain transfers and are final. Access starts as soon as the transaction confirms, so check the sample results on this page before you pay."),
]

def ld(*objs):
    return "".join('<script type="application/ld+json">%s</script>' % json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") for o in objs)

BODY = '''<main class="c-wrap" id="club">
<section id="cLanding">
  <p class="c-kicker">DegenKit Club</p>
  <h1 class="c-h1">Crypto callers, ranked by <em>what happened next</em></h1>
  <p class="c-lead">We read public token calls on X and Telegram and measure the price from the minute of each call: how high it went, how long it stayed above entry, and where it stood 1, 6 and 24 hours later. Every call moves the caller's score up or down.</p>
  <p><a class="c-btn pri" href="#/join">Join for $99 / 30 days</a></p>

  <div class="c-stats" style="margin-top:30px">
    <div class="c-stat"><b id="stX">–</b><span>X accounts tracked</span></div>
    <div class="c-stat"><b id="stTg">–</b><span>Telegram channels tracked</span></div>
    <div class="c-stat"><b id="stCalls">–</b><span>Calls measured</span></div>
    <div class="c-stat"><b id="st24">–</b><span>Calls in the last 24 hours</span></div>
  </div>

  <section class="c-sec">
    <h2 class="c-h2">How a call is scored</h2>
    <p class="c-sub">The same four steps for every call, on every chain.</p>
    <div class="c-grid4">
      <div class="c-card"><span class="n">01</span><h3>Entry</h3><p>The token's price in the minute the call was posted. Not the low of the day, not the caller's own entry.</p></div>
      <div class="c-card"><span class="n">02</span><h3>Path</h3><p>The peak, how fast it came, and the share of time the price stayed above entry. A call that halves within an hour is flagged as a fast dump.</p></div>
      <div class="c-card"><span class="n">03</span><h3>Checkpoints</h3><p>The price 1, 6 and 24 hours after the call. These fixed points carry the score, so one wick cannot inflate it.</p></div>
      <div class="c-card"><span class="n">04</span><h3>Score</h3><p>Each call earns -10 to +10 points. An account's score runs 0 to 100 over 90 days and it is ranked after 5 scored calls.</p></div>
    </div>
  </section>

  <section class="c-sec" id="cSample" hidden>
    <h2 class="c-h2">Recent results</h2>
    <p class="c-sub">Finished calls, shown at least 24 hours late with account names hidden. Members see names and live calls.</p>
    <div class="c-tablewrap"><table class="c-table"><thead><tr><th>Called</th><th>Account</th><th>Token</th><th>Peak</th><th>1 h</th><th>24 h</th><th>Time above entry</th><th>Result</th><th>Points</th></tr></thead><tbody id="cSampleBody"></tbody></table></div>
  </section>

  <section class="c-sec" id="join">
    <h2 class="c-h2">Membership</h2>
    <p class="c-sub">One plan. Pay from your wallet; no card and no automatic renewal.</p>
    <div class="c-join">
      <div class="c-plan">
        <p class="c-kicker" style="margin:0">Club member</p>
        <p class="c-price">$99 <small>/ 30 days</small></p>
        <ul class="c-list">
          <li>Leaderboard of every tracked X account and Telegram channel</li>
          <li>Live call feed, updated every minute</li>
          <li>Account profiles with every measured call and its price path</li>
          <li>Solana, Ethereum, BNB Chain, Base, Robinhood Chain and Elysium</li>
          <li>Links to the original post and the chart for each call</li>
        </ul>
        <p class="c-fine">Data and analysis only. Not financial advice and not buy or sell signals. Past results do not predict future results, and most tokens promoted on social media lose value. Payments are on-chain and final.</p>
      </div>
      <div class="c-plan" id="cJoin"><noscript>Turn on JavaScript to connect a wallet and join.</noscript></div>
    </div>
  </section>

  <section class="c-sec">
    <h2 class="c-h2">Questions people ask</h2>
    %s
    <p class="c-fine">DegenKit is independent. It is not affiliated with the accounts it tracks, pump.fun, X or Telegram. Questions: <a href="/support/">support</a>.</p>
  </section>
</section>

<section id="cApp" hidden>
  <div class="c-bar">
    <div class="c-tabs" role="tablist" aria-label="Club views">
      <button class="c-tab" role="tab" data-tab="board" aria-selected="true">Leaderboard</button>
      <button class="c-tab" role="tab" data-tab="calls" aria-selected="false">Live calls</button>
    </div>
    <div class="c-who" id="cWho"></div>
  </div>
  <div id="cView" aria-live="polite"></div>
</section>
</main>
<script src="/club/club.js" defer></script>''' % "".join('<details class="t-faq"><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in QA)

def main():
    out = ROOT / "club"; out.mkdir(exist_ok=True)
    jsonld = ld(
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "DegenKit", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Club", "item": SITE + "/club/"}]},
        {"@context": "https://schema.org", "@type": "WebPage", "name": "DegenKit Club", "url": SITE + "/club/", "description": DESC, "publisher": {"@id": SITE + "/#org"}},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in QA]})
    html = B.page(TITLE, DESC, SITE + "/club/", BODY, jsonld=jsonld,
                  extra_meta='<link rel="stylesheet" href="/tools/tools.css">\n<link rel="stylesheet" href="/club/club.css">')
    html = html.replace('<link rel="alternate" type="application/rss+xml" title="DegenKit Blog" href="/blog/rss.xml">\n', "")
    (out / "index.html").write_text(html, encoding="utf-8")
    for f in ("club.css", "club.js"):
        (out / f).write_text((SRC / f).read_text(encoding="utf-8"), encoding="utf-8")
    sm = ROOT / "sitemap.xml"
    if sm.exists():
        s = sm.read_text(encoding="utf-8")
        s = re.sub(r"[ \t]*<url><loc>[^<]*/club/</loc>.*?</url>\n?", "", s)
        s = s.replace("</urlset>", f'  <url><loc>{SITE}/club/</loc><lastmod>{datetime.date.today().isoformat()}</lastmod><priority>0.8</priority></url>\n</urlset>')
        sm.write_text(s, encoding="utf-8")
    print("built /club/")

if __name__ == "__main__": main()

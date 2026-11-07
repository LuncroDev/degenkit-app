#!/usr/bin/env python3
"""DegenKit blog linter. Usage: python3 blog-src/lint.py [slug ...]
Checks the measurable rules from BLOG-STANDARDS.md. Exit 1 if any ERROR."""
import re, sys, glob, os, yaml
HERE = os.path.dirname(os.path.abspath(__file__))
BANNED = ["guaranteed","100x","moonshot","to the moon","get rich","can't lose","risk-free","risk free","passive income","easy money","game-changer","revolutionary","unlock the power","in today's fast-paced","delve"]
def load(p):
    t = open(p, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
    return (yaml.safe_load(m.group(1)) or {}, m.group(2)) if m else ({}, t)
def lint(path):
    meta, body = load(path); E, W = [], []
    slug = os.path.basename(path)[:-3]
    title = str(meta.get("title","")); ex = str(meta.get("excerpt","")); seo = str(meta.get("seo_title","")) or title
    words = len(re.findall(r"\w+", re.sub(r"```.*?```|:::\w*|!\[.*?\]\(.*?\)", " ", body, flags=re.S)))
    if not 40 <= len(title) <= 90: W.append(f"title length {len(title)} (aim 40-70)")
    if len(seo)+16 > 70 and not meta.get("seo_title") and len(title) > 70: W.append("long title: add seo_title (<=54 chars + suffix)")
    if not 110 <= len(ex) <= 175: E.append(f"excerpt length {len(ex)} (must be 110-175: it is the meta description)")
    if words < 700: E.append(f"only {words} words (min 700)")
    elif words > 1800: W.append(f"{words} words (long: >1800)")
    if not meta.get("cover_alt"): E.append("missing cover_alt")
    if not meta.get("tags"): E.append("missing tags")
    h1 = re.findall(r"^# [^#]", body, re.M)
    if h1: E.append("body contains an H1 (title is the H1; use ##)")
    h2 = re.findall(r"^## .+", body, re.M)
    if len(h2) < 3: E.append(f"only {len(h2)} H2 sections (min 3)")
    intro = body.strip().split("\n\n")[0]
    if len(intro.split()) > 70: W.append("first paragraph >70 words: answer the question in the first 2 sentences")
    links = re.findall(r"\]\((/[^)\s]*|https://degenkit\.app[^)\s]*)", body)
    internal = [l for l in links if not re.search(r"\.(webp|png|jpg|mp4|gif)$", l)]
    if len(set(internal)) < 3: E.append(f"{len(set(internal))} distinct internal links (min 3)")
    if not any(re.match(r"(https://degenkit\.app)?/(launch|tools|docs)/", l) for l in internal): E.append("no link to a /launch/, /tools/ or /docs/ page")
    ext = re.findall(r"\]\((https?://(?!degenkit\.app)[^)\s]+)", body)
    if len(ext) < 1: W.append("no external source link")
    low = body.lower()
    for b in BANNED:
        if b in low: E.append(f"banned phrase: '{b}'")
    for m in re.finditer(r"!\[(.*?)\]\(", body):
        if len(m.group(1).strip()) < 8: W.append("image alt too short"); break
    if re.search(r"\b(buy now|you should buy|will go up|will pump)\b", low): E.append("price prediction / buy call")
    if not re.search(r"(not financial advice|not investment advice|risk|DYOR|can lose)", low): W.append("no risk note")
    if re.search(r"\b(Pons|Robinhood|Phantom|MetaMask|Solflare|Raydium|Uniswap)\b", body) and not re.search(r"not affiliated|independent", low) and re.search(r"\bPons\b", body): E.append("mentions Pons without a non-affiliation note")
    return slug, words, E, W
if __name__ == "__main__":
    args = sys.argv[1:]
    files = [os.path.join(HERE,"posts",a+".md") for a in args] if args else sorted(glob.glob(os.path.join(HERE,"posts","*.md")))
    bad = 0; tot_e = tot_w = 0
    for f in files:
        if os.path.basename(f).startswith("_"): continue
        s, w, E, W = lint(f)
        if E or W:
            print(f"\n{s} ({w} words)")
            for e in E: print("  ERROR", e)
            for x in W: print("  warn ", x)
        tot_e += len(E); tot_w += len(W); bad += bool(E)
    print(f"\n{len(files)} posts, {bad} with errors ({tot_e} errors, {tot_w} warnings)")
    sys.exit(1 if bad else 0)

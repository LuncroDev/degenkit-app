"""Extra free tools: calculators and generators. Imported by build.py."""
SCRIPT = '<script src="/tools/calc.js" defer></script>'

def cta(title, sub, href="/launch/ethereum/", label="Open the token creator"):
    return '<div class="t-cta"><div><b>%s</b><span>%s</span></div><a href="%s">%s →</a></div>' % (title, sub, href, label)

def page(T, slug, name, h1, lead, tool, prose, qa, title, desc):
    body = ('<main class="t-wrap">\n<div class="t-crumb"><a href="/tools/">Free tools</a> › %s</div>\n<h1 class="t-h1">%s</h1>\n<p class="t-lead">%s</p>\n%s\n%s\n%s\n</main>\n%s'
            % (T.esc(name), T.esc(h1), lead, tool, prose, T.faq_html(qa), SCRIPT))
    url = "/tools/%s/" % slug
    T.write(url, title, desc, body, T.ld(T.crumbs(name, url), T.app_ld(name, url, desc), T.faq_ld(qa)))
    return url

NETS = '<option value="ethereum">Ethereum</option><option value="base">Base</option><option value="bnb">BNB Chain</option><option value="robinhood">Robinhood Chain</option><option value="elysium">Elysium</option>'

def build_all(T):
    urls = []
    # ---------------------------------------------------------------- liquidity
    urls.append(page(T, "liquidity-calculator", "Liquidity calculator", "Liquidity and market cap calculator",
        "Work out your token's launch price, starting market cap and price impact before you add liquidity. Built for ERC-20 launches on Uniswap-style pools, and it works the same for any constant-product pool.",
        '''<section class="t-card t-two">
<div class="t-fields">
  <label class="full">Total supply<input id="lqSupply" type="text" inputmode="decimal" value="1000000000"></label>
  <label>% of supply in the pool<input id="lqPct" type="number" min="0" max="100" step="1" value="80"></label>
  <label>Liquidity you add<input id="lqQuote" type="number" min="0" step="0.1" value="2"></label>
  <label>Paired with<select id="lqSym"><option>ETH</option><option>BNB</option><option>HYPE</option><option>SOL</option><option>USDC</option></select></label>
  <label>Price of that coin (USD)<input id="lqUsd" type="number" min="0" step="1" placeholder="e.g. 3000"></label>
  <label>Test buy size<input id="lqBuy" type="number" min="0" step="0.01" value="0.1"></label>
  <label>Pool fee %<input id="lqFee" type="number" min="0" max="5" step="0.05" value="0.3"></label>
</div>
<div class="t-out">
  <div class="big"><span>Starting market cap (FDV)</span><b id="lqMc">–</b></div>
  <div><span>Launch price per token</span><b id="lqPrice">–</b></div>
  <div><span>Tokens in the pool</span><b id="lqTok">–</b></div>
  <div><span>Total pool value</span><b id="lqDepth">–</b></div>
  <div><span>Tokens a test buy receives</span><b id="lqOut">–</b></div>
  <div><span>Price impact of that buy</span><b id="lqImpact">–</b></div>
  <p class="t-note" id="lqNote"></p>
</div>
</section>''',
        cta("Ready to launch an ERC-20?", "Create the token first, then add liquidity with the numbers you planned.") + '''
<section class="t-sec"><h2>How the liquidity calculator works</h2>
<p>A Uniswap V2-style pool holds two assets and keeps their product constant. The launch price is simply the amount of ETH (or BNB, HYPE, SOL) you add divided by the number of tokens you add. Multiply that price by the total supply and you get the starting market cap, also called fully diluted valuation.</p>
<p>The price impact figure shows how far one buy moves the price. A thin pool means small buys cause big swings, in both directions. If a 0.1 ETH buy moves the price by more than 15%, the pool is probably too shallow for a public launch.</p>
<p>Keep these in mind: tokens you leave outside the pool still count toward market cap, the pool fee is taken from every swap, and the ETH you add is at risk like any other liquidity position. Read <a href="/blog/add-liquidity-uniswap-erc20/">how to add liquidity on Uniswap</a> and <a href="/blog/market-cap-vs-fdv-explained/">market cap vs FDV</a> for the details.</p></section>
<section class="t-sec"><h2>How much liquidity should you add?</h2>
<p>There is no single right number. More liquidity gives buyers a steadier price and makes the token harder to manipulate, but it is your own money in the pool. Use the calculator to compare two or three setups, then check the price impact of the buy sizes you expect from your community.</p>
<div class="t-links"><a href="/launch/ethereum/">Ethereum token creator →</a><a href="/launch/base/">Base token creator →</a><a href="/tools/token-tax-calculator/">Token tax calculator →</a></div></section>''',
        [("How do I calculate a token's launch price?", "Divide the amount of ETH (or other paired coin) you add to the pool by the number of tokens you add. With 2 ETH and 800,000,000 tokens, the launch price is 0.0000000025 ETH per token."),
         ("How is the starting market cap calculated?", "Launch price multiplied by total supply. This is the fully diluted value, because it counts every token, including any you keep outside the pool."),
         ("What is price impact?", "The amount a single trade moves the pool price. It depends on the trade size compared with the liquidity in the pool. Deeper pools have lower price impact."),
         ("Does this work for Base, BNB Chain and Robinhood Chain?", "Yes. Any constant-product pool uses the same maths, whether it is Uniswap V2 on Ethereum or Base, PancakeSwap V2 on BNB Chain or a Raydium CPMM pool on Solana."),
         ("Is this financial advice?", "No. The calculator only does arithmetic on the numbers you enter. Token launches are high risk and you can lose the liquidity you add.")],
        "Liquidity & Market Cap Calculator for Token Launch | DegenKit",
        "Free liquidity calculator: get your token's launch price, starting market cap and price impact before you add liquidity on Uniswap or PancakeSwap."))

    # ---------------------------------------------------------------- tax
    urls.append(page(T, "token-tax-calculator", "Token tax calculator", "Token tax calculator",
        "See what a buy and sell tax really costs. Enter the tax rates of any ERC-20 tax token and get the amount received, the round-trip cost and the price rise needed to break even.",
        '''<section class="t-card t-two">
<div class="t-fields">
  <label>Buy tax %<input id="txBuy" type="number" min="0" max="100" step="0.5" value="5"></label>
  <label>Sell tax %<input id="txSell" type="number" min="0" max="100" step="0.5" value="5"></label>
  <label>Amount you buy (USD)<input id="txIn" type="number" min="0" step="10" value="1000"></label>
  <label>Price change before selling %<input id="txMove" type="number" step="1" value="0"></label>
</div>
<div class="t-out">
  <div class="big"><span>You receive after selling</span><b id="txOut">–</b></div>
  <div><span>Profit or loss</span><b id="txPnl">–</b></div>
  <div><span>Token value right after the buy</span><b id="txAfterBuy">–</b></div>
  <div><span>Round-trip tax cost</span><b id="txRound">–</b></div>
  <div><span>Price rise needed to break even</span><b id="txBreak">–</b></div>
  <div><span>Total tax paid</span><b id="txTaxPaid">–</b></div>
</div>
</section>''',
        cta("Launching a tax token?", "Set your own buy and sell rates on Ethereum, Base, BNB Chain, Robinhood Chain or Elysium.", "/docs/tax-token/", "How tax tokens work") + '''
<section class="t-sec"><h2>How token taxes add up</h2>
<p>A tax token takes a percentage of every buy and every sell and sends it to a wallet chosen by the creator. The two taxes compound: with a 5% buy tax and a 5% sell tax, a holder loses 9.75% on a round trip, not 10%, because the sell tax applies to what is left after the buy tax.</p>
<p>That is why the break-even number matters. At 5% and 5%, the price has to rise about 10.8% before a buyer gets their money back, before gas and pool fees. High taxes make a token hard to trade, and buyers check for them. Read <a href="/blog/how-token-buy-sell-tax-works/">how buy and sell taxes work</a> and <a href="/blog/how-to-spot-a-honeypot-token/">how to spot a honeypot</a>.</p>
<p>This calculator ignores slippage, pool fees and gas. Use the <a href="/tools/liquidity-calculator/">liquidity calculator</a> for price impact and the <a href="/tools/eth-gas-calculator/">gas calculator</a> for network costs.</p></section>''',
        [("How do I calculate buy and sell tax on a token?", "Multiply the amount by one minus the tax rate. A 1,000 USD buy with a 5% buy tax leaves 950 USD of tokens. Selling 950 USD with a 5% sell tax returns 902.50 USD."),
         ("What is a reasonable token tax?", "It varies by project. Many buyers avoid tokens with a combined tax far above 10%, and very high sell taxes are a common warning sign of a honeypot."),
         ("Do the buy and sell tax add together?", "Not exactly. They compound. A 5% buy tax and a 5% sell tax cost 9.75% in total on a round trip."),
         ("Can a tax be changed after launch?", "It depends on the contract. With a DegenKit tax token the owner can change rates within the contract's limits, or renounce ownership to lock them."),
         ("Does this include gas and slippage?", "No. It only models the token's own buy and sell tax.")],
        "Token Tax Calculator: Buy & Sell Tax, Break-Even | DegenKit",
        "Free token tax calculator. Enter a token's buy and sell tax to see what you receive, the round-trip cost and the price rise needed to break even."))

    # ---------------------------------------------------------------- tokenomics
    urls.append(page(T, "tokenomics-calculator", "Tokenomics calculator", "Tokenomics calculator",
        "Plan your token allocation before you launch. Split the supply between liquidity, team, community and reserves, see the chart update live and copy the result into your docs.",
        '''<section class="t-card t-two">
<div>
  <div class="t-fields" style="margin-bottom:14px"><label class="full">Total supply<input id="tkSupply" type="text" inputmode="decimal" value="1000000000"></label></div>
  <div class="t-alloc" id="tkRows"></div>
  <div class="t-actions"><button class="t-btn ghost small" type="button" id="tkAdd">+ Add allocation</button><button class="t-btn ghost small" type="button" id="tkCopy">Copy as text</button></div>
  <p class="t-msg">Total: <b id="tkTotal">–</b></p>
</div>
<div><svg class="t-donut" id="tkDonut" viewBox="0 0 120 120" role="img" aria-label="Token allocation chart"></svg><div class="t-legend" id="tkLegend"></div></div>
</section>''',
        cta("Got your allocation?", "Create the token with a fixed supply and send each share where it belongs.") + '''
<section class="t-sec"><h2>How to plan token allocation</h2>
<p>Tokenomics is the plan for who holds the supply and why. Buyers read it to judge risk: a large share in a few team wallets means those wallets can move the price, while a large share in the liquidity pool means the price is harder to push around.</p>
<p>A simple, common split for a small community token puts most of the supply into liquidity, keeps a modest share for the community and marketing, and gives the team a small share that vests over time. There is no rule that fits every project, so use the chart to check that your split matches what you plan to tell holders.</p>
<p>With a DegenKit ERC-20 the whole supply is minted to your wallet at creation and no more can ever be minted. You then move each share to its wallet or pool. Read <a href="/blog/token-launch-checklist/">the token launch checklist</a> and work out your pool numbers with the <a href="/tools/liquidity-calculator/">liquidity calculator</a>.</p></section>''',
        [("What is tokenomics?", "Tokenomics describes a token's supply and how it is distributed: how many tokens exist, who receives them, and whether any are locked or vested."),
         ("What is a good token allocation?", "There is no universal answer. Buyers generally prefer a large share in liquidity and a small, vested team share. Whatever you choose, publish it and stick to it."),
         ("How many tokens should I create?", "Supply is a presentation choice. One billion is common for community tokens because it gives a low unit price. Supply alone does not change the market cap."),
         ("Can I change the supply later?", "Not with a DegenKit token. The supply is fixed at creation and the contract has no mint function."),
         ("Does this tool create a token?", "No. It is a planner. To create the token, use the token creator on the network you want.")],
        "Tokenomics Calculator: Plan Your Token Allocation | DegenKit",
        "Free tokenomics calculator. Split your token supply between liquidity, team, community and reserves, see a live allocation chart and copy the plan."))

    # ---------------------------------------------------------------- gas
    urls.append(page(T, "eth-gas-calculator", "ETH gas calculator", "ETH gas and token deploy cost calculator",
        "Check what a transaction costs right now on Ethereum, Base, BNB Chain, Robinhood Chain and Elysium. Live gas price, gas units for common actions and the cost of deploying an ERC-20 token.",
        '''<section class="t-card">
<div class="t-fields">
  <label>Network<select id="gsNet">''' + NETS + '''</select></label>
  <label>Gas price (gwei)<input id="gsGwei" type="number" min="0" step="0.001" value="1"></label>
  <label>Gas units<input id="gsUnits" type="number" min="0" step="1000" value="1200000"></label>
  <label><span><span id="gsSymA">ETH</span> price (USD)</span><input id="gsUsd" type="number" min="0" step="1" placeholder="e.g. 3000"></label>
</div>
<div class="t-actions" style="margin:14px 0"><button class="t-btn small" type="button" id="gsLive">Refresh live gas</button><button class="t-btn ghost small" type="button" data-units="65000">Transfer</button><button class="t-btn ghost small" type="button" data-units="150000">Swap</button><button class="t-btn ghost small" type="button" data-units="1200000">Deploy token</button></div>
<div class="t-out"><div class="big"><span>Transaction cost</span><b id="gsCost">–</b></div><div><span>In USD</span><b id="gsCostUsd">–</b></div></div>
<p class="t-msg" id="gsMsg"></p>
</section>
<section class="t-sec"><h2>Typical costs at this gas price</h2>
<div class="t-tablewrap"><table class="t-table"><thead><tr><th>Action</th><th>Gas units</th><th>Cost</th><th>USD</th></tr></thead><tbody id="gsRows"></tbody></table></div>
<p class="t-note">Gas units are typical figures and vary by contract. Your wallet shows the exact estimate before you sign.</p></section>''',
        cta("Create an ERC-20 without code", "One transaction, fixed supply, sent straight to your wallet.") + '''
<section class="t-sec"><h2>How gas fees are calculated</h2>
<p>Every EVM transaction pays <b>gas units × gas price</b>. Gas units measure how much work the transaction does: a simple token transfer uses about 65,000, while deploying a new token contract uses far more. The gas price, quoted in gwei, rises and falls with demand for block space. One gwei is one billionth of an ETH.</p>
<p>That is why the same action costs very different amounts on different networks. Ethereum mainnet has the highest gas prices. Layer 2 networks such as Base and Robinhood Chain usually cost a small fraction of that, and BNB Chain is cheap too. See <a href="/blog/ethereum-gas-fees-explained/">Ethereum gas fees explained</a> and <a href="/blog/token-launch-costs-by-network/">token launch costs by network</a>.</p>
<p>On Layer 2 networks the wallet may also add a small fee for posting data to Ethereum, which this calculator does not include. Use the <a href="/tools/eth-unit-converter/">wei, gwei and ETH converter</a> if you need to change units.</p></section>''',
        [("How much does it cost to deploy an ERC-20 token?", "Gas units for the deployment multiplied by the current gas price, plus any service fee. A token deployment commonly uses around one million gas units, so the cost depends almost entirely on the network and the gas price at that moment."),
         ("What is gwei?", "A unit of ETH used to quote gas prices. One gwei is 0.000000001 ETH."),
         ("Why is Base cheaper than Ethereum?", "Base is a Layer 2 network. It processes transactions off Ethereum mainnet and posts compressed data back, so each transaction pays far less."),
         ("Where does the live gas price come from?", "The page asks each network's public RPC for its current gas price. It changes every block, so refresh before you rely on it."),
         ("When is gas cheapest?", "Usually when fewer people are using the network, which for Ethereum often means weekends and the hours when both the US and Europe are quiet.")],
        "ETH Gas Calculator: Live Gas & Token Deploy Cost | DegenKit",
        "Free ETH gas calculator with live gas prices for Ethereum, Base, BNB Chain, Robinhood Chain and Elysium. See the cost to deploy an ERC-20 token."))

    # ---------------------------------------------------------------- units
    urls.append(page(T, "eth-unit-converter", "Wei, gwei and ETH converter", "Wei, gwei and ETH converter",
        "Convert between wei, gwei and ETH, turn raw ERC-20 amounts into readable numbers for any decimals, and convert lamports to SOL. Exact to the last digit.",
        '''<section class="t-card">
<h2 style="margin:0 0 14px;font-family:'Space Grotesk',sans-serif;font-size:18px">Wei · Gwei · ETH</h2>
<div class="t-fields"><label>Wei<input id="ucWei" type="text" inputmode="numeric" autocomplete="off"></label><label>Gwei<input id="ucGwei" type="text" inputmode="decimal" autocomplete="off"></label><label class="full">ETH<input id="ucEth" type="text" inputmode="decimal" autocomplete="off"></label></div>
</section>
<section class="t-card">
<h2 style="margin:0 0 14px;font-family:'Space Grotesk',sans-serif;font-size:18px">ERC-20 token amount</h2>
<div class="t-fields"><label>Token decimals<input id="ucDec" type="number" min="0" max="36" value="18"></label><label>Readable amount<input id="ucHuman" type="text" inputmode="decimal" autocomplete="off"></label><label class="full">Raw amount (as stored on-chain)<input id="ucRaw" type="text" inputmode="numeric" autocomplete="off"></label></div>
</section>
<section class="t-card t-two">
<div><h2 style="margin:0 0 14px;font-family:'Space Grotesk',sans-serif;font-size:18px">Lamports · SOL</h2>
<div class="t-fields"><label>Lamports<input id="ucLam" type="text" inputmode="numeric" autocomplete="off"></label><label>SOL<input id="ucSol" type="text" inputmode="decimal" autocomplete="off"></label></div></div>
<div><h2 style="margin:0 0 14px;font-family:'Space Grotesk',sans-serif;font-size:18px">Quick gas fee</h2>
<div class="t-fields"><label>Gas price (gwei)<input id="ucGasPrice" type="number" value="20"></label><label>Gas limit<input id="ucGasLimit" type="number" value="21000"></label><label class="full">ETH price (USD)<input id="ucEthUsd" type="number" placeholder="optional"></label></div>
<div class="t-out" style="margin-top:12px"><div><span>Fee</span><b id="ucGasOut">–</b></div></div></div>
</section>''',
        cta("Create your own ERC-20", "Pick the name, symbol and supply. Tokens use 18 decimals, like ETH.") + '''
<section class="t-sec"><h2>Ethereum units explained</h2>
<p>ETH is stored on-chain as whole numbers of <b>wei</b>, the smallest unit. One ETH is 1,000,000,000,000,000,000 wei (10<sup>18</sup>). <b>Gwei</b> sits in the middle at 1,000,000,000 wei (10<sup>9</sup>) and is the unit wallets use for gas prices.</p>
<div class="t-tablewrap"><table class="t-table"><thead><tr><th>Unit</th><th>Wei</th><th>ETH</th></tr></thead><tbody>
<tr><th scope="row">Wei</th><td><code>1</code></td><td><code>0.000000000000000001</code></td></tr>
<tr><th scope="row">Gwei</th><td><code>1,000,000,000</code></td><td><code>0.000000001</code></td></tr>
<tr><th scope="row">ETH</th><td><code>1,000,000,000,000,000,000</code></td><td><code>1</code></td></tr></tbody></table></div>
<p>ERC-20 tokens work the same way. A token with 18 decimals stores "1 token" as 1 followed by 18 zeros. Explorers and contract calls often show the raw number, which is why a supply of one billion tokens appears as a 28-digit figure. Tokens with 6 decimals, such as USDC, use far fewer zeros.</p>
<p>On Solana the smallest unit is the <b>lamport</b>: one SOL is 1,000,000,000 lamports. For live network costs, use the <a href="/tools/eth-gas-calculator/">ETH gas calculator</a>, and see <a href="/blog/ethereum-gas-fees-explained/">Ethereum gas fees explained</a>.</p></section>''',
        [("How many wei are in 1 ETH?", "1,000,000,000,000,000,000 wei, which is 10 to the power of 18."),
         ("How many gwei are in 1 ETH?", "1,000,000,000 gwei, which is 10 to the power of 9."),
         ("How do I convert gwei to ETH?", "Divide the gwei amount by 1,000,000,000. For example, 20 gwei is 0.00000002 ETH."),
         ("Why does my token balance look so large in a contract call?", "Contracts store balances as raw integers. Divide the raw number by 10 to the power of the token's decimals to get the readable amount."),
         ("How many lamports are in 1 SOL?", "1,000,000,000 lamports.")],
        "Wei to ETH Converter: Wei, Gwei, ETH & Token Decimals | DegenKit",
        "Free wei, gwei and ETH converter. Convert raw ERC-20 token amounts for any decimals and lamports to SOL. Exact results, runs in your browser."))

    # ---------------------------------------------------------------- names
    urls.append(page(T, "meme-coin-name-generator", "Meme coin name generator", "Meme coin name generator",
        "Stuck on a name? Pick a theme, add your own word if you like, and get twelve meme coin names with ticker symbols. Like one? Open it in the token creator with the name already filled in.",
        '''<section class="t-card">
<div class="t-fields">
  <label>Theme<select id="mcTheme"><option value="any">Surprise me</option><option value="dog">Dogs</option><option value="cat">Cats</option><option value="frog">Frogs</option><option value="space">Space</option><option value="food">Food</option><option value="ai">AI and robots</option><option value="money">Money</option></select></label>
  <label>Create on<select id="mcChain">''' + NETS + '''<option value="solana">Solana</option></select></label>
  <label class="full">Your own word (optional)<input id="mcWord" type="text" maxlength="16" placeholder="e.g. Pickle" autocomplete="off"></label>
</div>
<div class="t-actions" style="margin-top:14px"><button class="t-btn" type="button" id="mcGo">Generate names</button></div>
<div class="t-names" id="mcOut"></div>
<p class="t-note" style="margin-top:14px">Names are generated at random. Check that a name is not already a registered trademark or an existing token before you use it.</p>
</section>''',
        cta("Found a name you like?", "Create it as an ERC-20 on Ethereum or Base in one signature.") + '''
<section class="t-sec"><h2>What makes a good meme coin name</h2>
<p>The names that stick are short, easy to say and easy to spell. If someone hears the name once in a voice chat, they should be able to type it into a search bar. Two words is usually the limit, and the ticker should be three to five letters.</p>
<p>Check three things before you commit. First, search the name on a token explorer and on X: a clash with an existing token confuses buyers and helps copycats. Second, avoid real brands, companies and people, because trademark owners do act against tokens that use their names. Third, say it out loud and make sure it does not mean something unfortunate in another language.</p>
<p>The name and symbol are permanent once an ERC-20 is deployed, so take a minute here. Then read <a href="/blog/how-to-make-a-meme-coin-on-solana/">how to make a meme coin</a> and the <a href="/blog/token-launch-checklist/">token launch checklist</a>, and plan your pool with the <a href="/tools/liquidity-calculator/">liquidity calculator</a>.</p></section>''',
        [("How do I come up with a meme coin name?", "Start from a theme people already enjoy, such as an animal or a joke, keep it to one or two words and make sure the ticker is short. Then check that no existing token already uses it."),
         ("How long should a ticker symbol be?", "Three to five letters is the norm. Short tickers are easier to remember and to search for."),
         ("Can I use a brand or celebrity name?", "You should not. It can infringe trademarks or publicity rights and exchanges and explorers may delist or flag the token."),
         ("Can I change the name after creating the token?", "On an ERC-20 the name and symbol are fixed in the contract at deployment. Choose carefully before you sign."),
         ("Is the generator free?", "Yes. It runs in your browser and nothing you type is sent anywhere.")],
        "Meme Coin Name Generator: Names & Tickers | DegenKit",
        "Free meme coin name generator. Pick a theme, get twelve token names with ticker symbols and open your favourite in the token creator in one click."))

    # ---------------------------------------------------------------- elysium rpc
    rows = [("Network name", "Elysium"), ("RPC URL", "https://rpc.elysium.kinetiq.xyz"), ("Chain ID", "99901"), ("Chain ID (hex)", "0x1863d"),
            ("Currency symbol", "HYPE"), ("Block explorer", "https://elysium.kinetiq.xyz")]
    tr = "".join('<tr><th scope="row">%s</th><td><code>%s</code><button class="t-copy" type="button" data-copy="%s" aria-label="Copy %s">Copy</button></td></tr>' % (T.esc(k), T.esc(v), T.esc(v), T.esc(k)) for k, v in rows)
    urls.append(page(T, "elysium-rpc", "Elysium RPC", "Elysium RPC, chain ID and add to MetaMask",
        "Network details for Elysium, Kinetiq's Layer 2 for the Hyperliquid ecosystem: RPC URL, chain ID 99901, explorer and gas token. Add it to your wallet in one click.",
        '''<section class="t-card">
<div class="t-status-row"><span class="t-dot" id="elDot"></span><span id="elState">Checking the public RPC…</span></div>
<div class="t-stats"><div><span>Latest block</span><b id="elBlock">–</b></div><div><span>Response time</span><b id="elMs">–</b></div><div><span>Chain ID</span><b>99901</b></div></div>
<div class="t-actions"><button class="t-btn" type="button" id="elAdd">Add Elysium to wallet</button><button class="t-btn ghost" type="button" id="elRe">Check again</button></div>
<p class="t-msg" id="elMsg"></p>
</section>
<section class="t-sec"><h2>Elysium network details</h2>
<div class="t-tablewrap"><table class="t-table"><tbody>''' + tr + '''</tbody></table></div>
<p class="t-note">These are the values DegenKit uses in its own Elysium launcher. Kinetiq can change them, so confirm against Kinetiq's documentation before you use them in production. DegenKit is not affiliated with Kinetiq or Hyperliquid.</p></section>''',
        cta("Create a token on Elysium", "Fixed-supply and tax tokens are live. The service fee is 1 HYPE.", "/launch/elysium/", "Open the Elysium launcher") + '''
<section class="t-sec"><h2>How to add Elysium to MetaMask</h2>
<ol class="t-steps"><li>Click <b>Add Elysium to wallet</b> above and approve the request in MetaMask, Rabby or another browser wallet.</li><li>Or add it by hand: open your wallet's network settings, choose "Add a custom network" and paste the values from the table.</li><li>Switch to Elysium. You need HYPE on Elysium to pay gas.</li></ol>
<p>HYPE reaches Elysium through a bridge from HyperEVM. Read <a href="/blog/bridge-hype-to-elysium/">how to bridge HYPE to Elysium</a>, <a href="/blog/elysium-gas-fees/">Elysium gas fees</a> and <a href="/blog/what-is-elysium-chain/">what Elysium is</a>.</p></section>''',
        [("What is the Elysium chain ID?", "99901, which is 0x1863d in hexadecimal."),
         ("What is the Elysium RPC URL?", "The public RPC used by DegenKit is https://rpc.elysium.kinetiq.xyz. Check Kinetiq's documentation for the current official list."),
         ("What token pays gas on Elysium?", "HYPE. You need a small amount of HYPE on Elysium to send any transaction."),
         ("Is Elysium an EVM chain?", "Yes. Elysium is EVM-compatible, so MetaMask, Rabby and other EVM wallets work, and tokens are standard ERC-20 contracts."),
         ("How do I get HYPE on Elysium?", "Bridge it from HyperEVM using the bridge linked from Kinetiq's official channels.")],
        "Elysium RPC URL, Chain ID 99901 & Add to MetaMask | DegenKit",
        "Elysium network details: RPC URL, chain ID 99901, explorer and HYPE gas token. Live RPC status and one-click add to MetaMask."))

    # ---------------------------------------------------------------- dex volume
    snap = [("Solana", "solana", 53.835, 10.084), ("Ethereum", "ethereum", 50.011, 11.781), ("Base", "base", 30.612, 7.608),
            ("BNB Chain", "bnb", 28.193, 6.184), ("Robinhood Chain", "robinhood", 21.212, 4.275), ("Elysium", "elysium", 0.218, 0.217)]
    tr = "".join('<tr data-chain="%s"><th scope="row"><a href="/launch/%s/">%s</a></th><td data-k="d30">$%sb</td><td data-k="d7">$%sb</td><td data-k="d1">–</td><td><a href="/launch/%s/">Create a token →</a></td></tr>'
                 % (n, k, n, ("%.2f" % a), ("%.2f" % b), k) for n, k, a, b in snap)
    urls.append(page(T, "dex-volume-by-chain", "DEX volume by chain", "DEX volume by chain: where tokens actually trade",
        "Trading volume on decentralized exchanges for the six networks DegenKit supports. Use it to see where liquidity and traders are before you pick a chain for your token.",
        '''<section class="t-card">
<div class="t-tablewrap"><table class="t-table" id="dvTable"><thead><tr><th>Network</th><th>30 days</th><th>7 days</th><th>24 hours</th><th></th></tr></thead><tbody>''' + tr + '''</tbody></table></div>
<p class="t-msg" id="dvMsg">Snapshot from DefiLlama, 13 November 2026.</p>
<p class="t-note">Source: <a href="https://defillama.com/dexs/chains" rel="noopener" target="_blank">DefiLlama DEX volume by chain</a>. The page tries to refresh these numbers live when it loads.</p>
</section>''',
        cta("Picked a network?", "Create a fixed-supply or tax token on any of the six in one signature.", "/launch/", "Choose your network") + '''
<section class="t-sec"><h2>How to read DEX volume when you choose a chain</h2>
<p>DEX volume is the dollar value of swaps on decentralized exchanges. A chain with high volume has more traders, deeper pools and more tools that already support it, so a new token there is easier for buyers to find and trade.</p>
<p>In the snapshot above, Solana and Ethereum are close at the top, and the EVM networks together (Ethereum, Base, BNB Chain and Robinhood Chain) carry well over twice Solana's volume. Uniswap is the largest single DEX and runs on Ethereum, Base and Robinhood Chain, which means one ERC-20 skill set covers three of the five biggest markets.</p>
<p>Volume is not the whole picture. Most of it comes from large established tokens and stablecoins, so it does not tell you how many new tokens succeed. Gas cost matters too: Ethereum has the deepest liquidity and the highest fees, while Base, BNB Chain and Robinhood Chain are far cheaper to launch and trade on. Compare costs with the <a href="/tools/eth-gas-calculator/">gas calculator</a> and read <a href="/blog/which-blockchain-to-launch-token/">which blockchain to launch a token on</a>.</p></section>''',
        [("Which blockchain has the most DEX volume?", "It changes month to month. In mid-November 2026 DefiLlama showed Solana and Ethereum at the top for 30-day volume, followed by Base, BNB Chain and Robinhood Chain."),
         ("Does high DEX volume mean I should launch there?", "It is one signal. High volume means more traders and liquidity, but also more competition and, on Ethereum, higher gas costs."),
         ("Where does this data come from?", "DefiLlama, which aggregates swap volume reported by decentralized exchanges on each chain."),
         ("What is the biggest DEX?", "Uniswap had the largest share of tracked DEX volume in November 2026, with pools on Ethereum, Base and Robinhood Chain."),
         ("Is Elysium's volume low because it is new?", "Yes. Elysium's mainnet launched in November 2026, so it has only days of history compared with years for the others.")],
        "DEX Volume by Chain: Ethereum, Solana, Base & More | DegenKit",
        "DEX trading volume by chain for Ethereum, Solana, Base, BNB Chain, Robinhood Chain and Elysium, with data from DefiLlama. See where tokens trade."))
    return urls

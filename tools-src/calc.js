/* DegenKit free calculators. Everything runs in the browser; nothing is sent anywhere. */
(function(){
  var $=function(id){return document.getElementById(id);};
  function num(id){var v=parseFloat(String($(id).value).replace(/,/g,""));return isFinite(v)?v:0;}
  function fmt(n,d){if(!isFinite(n))return "–";var a=Math.abs(n);if(a!==0&&a<0.000001)return n.toExponential(3);
    return n.toLocaleString("en-US",{maximumFractionDigits:d===undefined?(a<1?8:a<1000?4:2):d});}
  function usd(n){if(!isFinite(n))return "–";return "$"+fmt(n,Math.abs(n)<1?8:2);}
  function on(ids,fn){ids.forEach(function(i){var e=$(i);if(e){e.addEventListener("input",fn);e.addEventListener("change",fn);}});fn();}

  /* ---------- liquidity & market cap ---------- */
  if($("lqSupply")){
    on(["lqSupply","lqPct","lqQuote","lqSym","lqUsd","lqBuy","lqFee"],function(){
      var supply=num("lqSupply"),pct=num("lqPct"),q=num("lqQuote"),px=num("lqUsd"),buy=num("lqBuy"),fee=num("lqFee")/100,sym=$("lqSym").value;
      var tok=supply*pct/100, price=tok>0?q/tok:NaN;
      $("lqTok").textContent=fmt(tok,0);
      $("lqPrice").textContent=fmt(price)+" "+sym+(px?"  ("+usd(price*px)+")":"");
      $("lqMc").textContent=px?usd(price*supply*px):fmt(price*supply)+" "+sym;
      $("lqDepth").textContent=px?usd(q*px*2):fmt(q*2)+" "+sym;
      var ok=tok>0&&q>0&&buy>0, inAmt=buy*(1-fee), out=ok?tok*inAmt/(q+inAmt):NaN, newP=ok?(q+inAmt)/(tok-out):NaN;
      $("lqOut").textContent=ok?fmt(out,0)+"  ("+fmt(out/supply*100,3)+"% of supply)":"–";
      var imp=ok?(newP/price-1)*100:NaN; var e=$("lqImpact"); e.textContent=ok?"+"+fmt(imp,2)+"%":"–"; e.className=imp>15?"t-warn":"";
      $("lqNote").textContent=pct<100&&supply>0?fmt(supply-tok,0)+" tokens ("+fmt(100-pct,2)+"%) stay outside the pool.":"The whole supply is in the pool.";
    });
  }

  /* ---------- token tax ---------- */
  if($("txBuy")){
    on(["txBuy","txSell","txIn","txMove"],function(){
      var b=num("txBuy")/100,s=num("txSell")/100,amt=num("txIn"),mv=num("txMove")/100;
      var afterBuy=amt*(1-b), value=afterBuy*(1+mv), out=value*(1-s);
      $("txAfterBuy").textContent=usd(afterBuy)+"  ("+fmt(b*100,2)+"% taken)";
      $("txOut").textContent=usd(out);
      var pnl=out-amt; var e=$("txPnl"); e.textContent=(pnl>=0?"+":"")+usd(pnl).replace("$-","-$")+"  ("+(amt?fmt(pnl/amt*100,2):"0")+"%)"; e.className=pnl<0?"t-warn":"";
      $("txRound").textContent=fmt((1-(1-b)*(1-s))*100,2)+"%";
      var be=(1-b)*(1-s); $("txBreak").textContent=be>0?"+"+fmt((1/be-1)*100,2)+"%":"never";
      $("txTaxPaid").textContent=usd(amt*b+value*s);
    });
  }

  /* ---------- tokenomics ---------- */
  if($("tkRows")){
    var COL=["#FF7A1A","#1CE39B","#627EEA","#F0B90B","#E8505B","#9945FF","#3FB9C9","#B6F23A","#FF8FA8","#8E9A7C"];
    var rows=[["Liquidity pool",60],["Community & airdrop",15],["Team (vested)",10],["Marketing",10],["Reserve",5]];
    function draw(){
      var box=$("tkRows"); box.innerHTML="";
      rows.forEach(function(r,i){var d=document.createElement("div");d.className="r";
        d.innerHTML='<span class="sw" style="background:'+COL[i%COL.length]+'"></span><input type="text" aria-label="Allocation name" maxlength="32"><input type="number" aria-label="Percent" min="0" max="100" step="0.5"><button type="button" aria-label="Remove">×</button>';
        var ins=d.querySelectorAll("input"); ins[0].value=r[0]; ins[1].value=r[1];
        ins[0].addEventListener("input",function(){r[0]=this.value;calc();}); ins[1].addEventListener("input",function(){r[1]=parseFloat(this.value)||0;calc();});
        d.querySelector("button").addEventListener("click",function(){rows.splice(i,1);draw();}); box.appendChild(d);});
      calc();
    }
    function calc(){
      var supply=num("tkSupply"), total=rows.reduce(function(a,r){return a+r[1];},0), t=$("tkTotal");
      t.textContent=fmt(total,2)+"%"+(Math.abs(total-100)<0.001?"  ✓":total<100?"  ("+fmt(100-total,2)+"% unallocated)":"  (over by "+fmt(total-100,2)+"%)");
      t.className=Math.abs(total-100)<0.001?"":"t-warn";
      var svg='<circle cx="60" cy="60" r="45" fill="none" stroke="rgba(128,128,128,.18)" stroke-width="22"/>',C=2*Math.PI*45,off=0,leg="",txt="Token allocation (supply "+fmt(supply,0)+")\n";
      rows.forEach(function(r,i){var len=C*Math.min(r[1],100)/Math.max(total,100);
        svg+='<circle cx="60" cy="60" r="45" fill="none" stroke="'+COL[i%COL.length]+'" stroke-width="22" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 60 60)"/>'; off+=len;
        var n=document.createElement("div"); n.textContent=r[0]||"Unnamed";
        leg+='<div><span><i style="background:'+COL[i%COL.length]+'"></i>'+n.innerHTML+'</span><b>'+fmt(r[1],2)+'% · '+fmt(supply*r[1]/100,0)+'</b></div>';
        txt+="- "+(r[0]||"Unnamed")+": "+fmt(r[1],2)+"% ("+fmt(supply*r[1]/100,0)+" tokens)\n";});
      $("tkDonut").innerHTML=svg; $("tkLegend").innerHTML=leg; $("tkCopy").dataset.text=txt;
    }
    $("tkAdd").addEventListener("click",function(){if(rows.length<10){rows.push(["New allocation",0]);draw();}});
    $("tkSupply").addEventListener("input",calc);
    $("tkCopy").addEventListener("click",function(){var b=this;navigator.clipboard.writeText(b.dataset.text).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy as text";},1400);});});
    draw();
  }

  /* ---------- unit converter ---------- */
  if($("ucWei")){
    function toRaw(s,dec){s=String(s).trim().replace(/,/g,"");if(!/^\d*\.?\d*$/.test(s)||s===""||s===".")return null;var p=s.split("."),f=(p[1]||"");if(f.length>dec)f=f.slice(0,dec);return BigInt((p[0]||"0")+f.padEnd(dec,"0"));}
    function fromRaw(r,dec){var s=r.toString().padStart(dec+1,"0"),i=s.slice(0,s.length-dec),f=dec?s.slice(-dec).replace(/0+$/,""):"";return i+(f?"."+f:"");}
    function link(ids){ids.forEach(function(a){$(a[0]).addEventListener("input",function(){var r=toRaw(this.value,a[1]());ids.forEach(function(b){if(b[0]!==a[0])$(b[0]).value=r===null?"":fromRaw(r,b[1]());});});});}
    var z=function(n){return function(){return n;};};
    link([["ucWei",z(0)],["ucGwei",z(9)],["ucEth",z(18)]]);
    link([["ucLam",z(0)],["ucSol",z(9)]]);
    var dec=function(){var d=parseInt($("ucDec").value,10);return isFinite(d)&&d>=0&&d<=36?d:18;};
    link([["ucRaw",z(0)],["ucHuman",dec]]);
    $("ucDec").addEventListener("input",function(){$("ucHuman").dispatchEvent(new Event("input"));});
    $("ucEth").value="1"; $("ucEth").dispatchEvent(new Event("input")); $("ucSol").value="1"; $("ucSol").dispatchEvent(new Event("input")); $("ucHuman").value="1000000"; $("ucHuman").dispatchEvent(new Event("input"));
    on(["ucGasPrice","ucGasLimit","ucEthUsd"],function(){var g=num("ucGasPrice"),l=num("ucGasLimit"),p=num("ucEthUsd"),eth=g*l/1e9;$("ucGasOut").textContent=fmt(eth)+" ETH"+(p?"  ("+usd(eth*p)+")":"");});
  }

  /* ---------- meme coin name generator ---------- */
  if($("mcGo")){
    var A={dog:["Doge","Shiba","Pup","Woof","Bark","Corgi","Pug","Hound"],cat:["Kitty","Meow","Purr","Paws","Whisker","Tabby","Neko","Claw"],frog:["Frog","Toad","Ribbit","Croak","Lily","Pond","Hopper","Tadpole"],space:["Moon","Rocket","Orbit","Comet","Nova","Star","Galaxy","Astro"],food:["Taco","Pizza","Noodle","Waffle","Pickle","Bagel","Nacho","Donut"],ai:["Bot","Neural","Pixel","Glitch","Byte","Robo","Quantum","Agent"],money:["Stonk","Diamond","Whale","Bull","Gem","Hodl","Pump","Yield"]};
    var PRE=["Baby","Mega","Super","Turbo","Giga","Based","Lil","King","Sir","Captain","Mr","Space","Degen","Cyber","Golden","Sleepy","Angry","Happy"];
    var SUF=["Inu","Coin","Moon","Wif Hat","X","Fi","Verse","Rocket","Cash","Swap","AI","Army","Club","Lord","2.0","Zilla","Mania","Pad"];
    function pick(a){return a[Math.floor(Math.random()*a.length)];}
    function cap(s){return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();}
    function ticker(n){var w=n.replace(/[^A-Za-z0-9 ]/g,"").split(" ").filter(Boolean),t=w.length>1?w.map(function(x){return x[0];}).join("")+w[w.length-1].slice(1,3):w[0].slice(0,5);return t.toUpperCase().slice(0,6);}
    function gen(){
      var th=$("mcTheme").value, kw=$("mcWord").value.trim().replace(/[^A-Za-z0-9 ]/g,"").slice(0,16), chain=$("mcChain").value, box=$("mcOut"), seen={}, n=0, tries=0; box.innerHTML="";
      while(n<12&&tries<200){tries++;
        var pool=th==="any"?A[pick(Object.keys(A))]:A[th], base=kw&&Math.random()<0.7?kw.split(" ").map(cap).join(" "):pick(pool), f=Math.random(), name;
        name=f<0.34?pick(PRE)+" "+base:f<0.68?base+" "+pick(SUF):pick(PRE)+" "+base+" "+pick(SUF);
        if(seen[name]||name.length>26)continue; seen[name]=1; n++;
        var t=ticker(name), d=document.createElement("div"); d.className="t-name";
        var b=document.createElement("b"); b.textContent=name; var s=document.createElement("span"); s.textContent="$"+t;
        var a=document.createElement("a"); a.href="/launch/"+chain+"/?name="+encodeURIComponent(name)+"&symbol="+encodeURIComponent(t); a.textContent="Create this token →";
        d.appendChild(b); d.appendChild(s); d.appendChild(a); box.appendChild(d);}
    }
    $("mcGo").addEventListener("click",gen); $("mcTheme").addEventListener("change",gen); $("mcChain").addEventListener("change",gen); gen();
  }


  /* ---------- EVM gas / deploy cost ---------- */
  if($("gsNet")){
    var NET={ethereum:["https://ethereum-rpc.publicnode.com","ETH"],base:["https://mainnet.base.org","ETH"],bnb:["https://bsc-dataseed.binance.org","BNB"],robinhood:["https://rpc.mainnet.chain.robinhood.com","ETH"],elysium:["https://rpc.elysium.kinetiq.xyz","HYPE"]};
    function gcalc(){var g=num("gsGwei"),u=num("gsUnits"),p=num("gsUsd"),sym=NET[$("gsNet").value][1],c=g*u/1e9;
      $("gsCost").textContent=fmt(c)+" "+sym; $("gsCostUsd").textContent=p?usd(c*p):"enter a price"; $("gsSymA").textContent=sym;
      var rows=[["ERC-20 transfer",65000],["Approve",46000],["DEX swap",150000],["Add liquidity",250000],["Deploy a token (typical)",1200000]],h="";
      rows.forEach(function(r){var x=g*r[1]/1e9;h+="<tr><th scope=\"row\">"+r[0]+"</th><td>"+r[1].toLocaleString("en-US")+"</td><td>"+fmt(x)+" "+sym+"</td><td>"+(p?usd(x*p):"–")+"</td></tr>";});
      $("gsRows").innerHTML=h;}
    function live(){var n=NET[$("gsNet").value],m=$("gsMsg");m.textContent="Reading live gas price…";m.className="t-msg";
      fetch(n[0],{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_gasPrice",params:[]})}).then(function(r){return r.json();}).then(function(j){
        var g=parseInt(j.result,16)/1e9; $("gsGwei").value=g<0.01?g.toPrecision(3):g.toFixed(3); m.textContent="Live gas price loaded from the public RPC. It changes block by block."; m.className="t-msg ok"; gcalc();
      }).catch(function(){m.textContent="Could not read the live gas price. Enter it by hand from your wallet or an explorer."; m.className="t-msg err"; gcalc();});}
    ["gsGwei","gsUnits","gsUsd"].forEach(function(i){$(i).addEventListener("input",gcalc);});
    $("gsNet").addEventListener("change",live); $("gsLive").addEventListener("click",live);
    [].forEach.call(document.querySelectorAll("[data-units]"),function(b){b.addEventListener("click",function(){$("gsUnits").value=b.dataset.units;gcalc();});});
    gcalc(); live();
  }


  /* ---------- DEX volume by chain (DefiLlama) ---------- */
  if($("dvTable")){
    var SLUG={"Solana":"Solana","Ethereum":"Ethereum","Base":"Base","BNB Chain":"BSC","Robinhood Chain":"Robinhood Chain","Elysium":"Elysium"}, okN=0;
    function big(n){return n>=1e9?"$"+(n/1e9).toFixed(2)+"b":n>=1e6?"$"+(n/1e6).toFixed(1)+"m":"$"+Math.round(n).toLocaleString("en-US");}
    [].forEach.call(document.querySelectorAll("#dvTable tbody tr"),function(row){
      fetch("https://api.llama.fi/overview/dexs/"+encodeURIComponent(SLUG[row.dataset.chain])+"?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true").then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){
        if(typeof j.total30d!=="number")return;
        row.querySelector('[data-k="d30"]').textContent=big(j.total30d); row.querySelector('[data-k="d7"]').textContent=big(j.total7d||0); row.querySelector('[data-k="d1"]').textContent=big(j.total24h||0);
        okN++; $("dvMsg").textContent="Live data from DefiLlama, loaded "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+"."; $("dvMsg").className="t-msg ok";
      }).catch(function(){});});
  }

  /* ---------- Elysium RPC ---------- */
  if($("elAdd")){
    var RPC="https://rpc.elysium.kinetiq.xyz";
    [].forEach.call(document.querySelectorAll(".t-copy"),function(b){b.addEventListener("click",function(){navigator.clipboard.writeText(b.dataset.copy).then(function(){var o=b.textContent;b.textContent="Copied";setTimeout(function(){b.textContent=o;},1200);});});});
    $("elAdd").addEventListener("click",function(){var m=$("elMsg");
      if(!window.ethereum){m.textContent="No browser wallet found. Install MetaMask or Rabby, or add the network by hand with the values below.";m.className="t-msg err";return;}
      window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:"0x1863d",chainName:"Elysium",nativeCurrency:{name:"HYPE",symbol:"HYPE",decimals:18},rpcUrls:[RPC],blockExplorerUrls:["https://elysium.kinetiq.xyz"]}]})
        .then(function(){m.textContent="Elysium was added to your wallet.";m.className="t-msg ok";}).catch(function(e){m.textContent=(e&&e.message)||"The request was rejected.";m.className="t-msg err";});});
    function check(){var t0=performance.now(),dot=$("elDot");
      fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_blockNumber",params:[]})}).then(function(r){return r.json();}).then(function(j){
        var ms=Math.round(performance.now()-t0); dot.className="t-dot ok"; $("elState").textContent="Public RPC is responding"; $("elBlock").textContent=parseInt(j.result,16).toLocaleString("en-US"); $("elMs").textContent=ms+" ms";
      }).catch(function(){dot.className="t-dot bad"; $("elState").textContent="No response from the public RPC (it may block browser requests or be busy)";});}
    check(); $("elRe").addEventListener("click",check);
  }
})();

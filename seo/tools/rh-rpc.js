// Robinhood Chain RPC page: live status of the public RPC + add-to-wallet buttons. No dependencies.
(function(){
  var RPC = "https://rpc.mainnet.chain.robinhood.com";
  var NETS = {
    main: { chainId: "0x1237", chainName: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"], blockExplorerUrls: ["https://robinhoodchain.blockscout.com"] },
    test: { chainId: "0xb626", chainName: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.testnet.chain.robinhood.com"], blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"] }
  };
  function $(id){ return document.getElementById(id); }
  function msg(t, cls){ var m = $("rhMsg"); m.textContent = t || ""; m.className = "t-msg" + (cls ? " " + cls : ""); }
  function call(method){
    return fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: [] }) })
      .then(function(r){ if(!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(j){ if(j.error) throw new Error(j.error.message || "RPC error"); return j.result; });
  }
  function check(){
    $("rhDot").className = "t-dot"; $("rhState").textContent = "Checking the public mainnet RPC…";
    var t0 = performance.now();
    Promise.all([call("eth_chainId"), call("eth_blockNumber")]).then(function(res){
      var ms = Math.round(performance.now() - t0), id = parseInt(res[0], 16), blk = parseInt(res[1], 16);
      $("rhChain").textContent = id + " (" + res[0] + ")";
      $("rhBlock").textContent = blk.toLocaleString("en-US");
      $("rhMs").textContent = ms + " ms";
      var ok = id === 4663;
      $("rhDot").className = "t-dot " + (ok ? "ok" : "bad");
      $("rhState").textContent = ok ? "Public mainnet RPC is responding" : "RPC answered with an unexpected chain ID";
    }).catch(function(e){
      $("rhDot").className = "t-dot bad";
      $("rhState").textContent = "Couldn’t reach the public RPC from your browser";
      ["rhChain","rhBlock","rhMs"].forEach(function(i){ $(i).textContent = "—"; });
      msg("It may be rate-limited or blocked by your network or browser extensions. (" + e.message + ")", "err");
    });
  }
  function add(which){
    var eth = window.ethereum;
    if(!eth){ msg("No EVM wallet found in this browser. Install MetaMask, Rabby or another EVM wallet, then try again.", "err"); return; }
    msg("Check your wallet to approve the network…");
    eth.request({ method: "wallet_addEthereumChain", params: [NETS[which]] })
      .then(function(){ msg(NETS[which].chainName + " added. Check that the chain ID shows " + parseInt(NETS[which].chainId, 16) + ".", "ok"); })
      .catch(function(e){ msg(e && e.code === 4001 ? "Request rejected in the wallet." : "Couldn’t add the network: " + (e && e.message || e), "err"); });
  }
  $("addMain").addEventListener("click", function(){ add("main"); });
  $("addTest").addEventListener("click", function(){ add("test"); });
  $("recheck").addEventListener("click", function(){ msg(""); check(); });
  check();
})();

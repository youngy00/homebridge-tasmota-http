(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))e(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function n(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function e(t){if(t.ep)return;t.ep=!0;const r=n(t);fetch(t.href,r)}})();function c(s,o){return window.homebridge.request(s,o)}function d(){return`
    <div class="container">

      <h1>Homebridge Tasmota Local</h1>

      <button id="scanButton">
        Scan Network
      </button>

      <hr>

      <div id="results">
        No scan performed.
      </div>

    </div>
  `}function a(){const s=document.getElementById("scanButton"),o=document.getElementById("results");s.addEventListener("click",async()=>{o.textContent="Scanning...";try{const n=await c("/scan");if(n.length===0){o.textContent="No Tasmota devices found.";return}o.innerHTML=n.map(e=>`
        <div class="device">
          <strong>${e.name}</strong><br>
          IP: ${e.host}<br>
          Status: ${e.configured?"Configured":"Import"}
          ${e.configured?"":`<br><button class="importButton" data-host="${e.host}">
                   Import
                 </button>`}
        </div>
        <hr>
      `).join(""),document.querySelectorAll(".importButton").forEach(e=>{e.addEventListener("click",async()=>{const t=e.dataset.host;e.disabled=!0,e.textContent="Importing...";try{await c("/import",{host:t}),e.textContent="Imported"}catch(r){console.error(r),e.disabled=!1,e.textContent="Import"}})})}catch(n){console.error(n),o.textContent="Scan failed."}})}document.body.innerHTML=d();a();

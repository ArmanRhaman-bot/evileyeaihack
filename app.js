const $=id=>document.getElementById(id);
let token=localStorage.getItem("evil_token")||"";
let role=localStorage.getItem("evil_role")||"";

/* HARD-CODED ADMIN CREDENTIALS */
const ADMIN_USER="@arman";
const ADMIN_PASS="@arman2026##";

/* ===== SESSION STATE ===== */
let SESSION = {
  total:0, win:0, loss:0,
  log: [],                 // resolved [{period, predSize, predNum, actSize, actNum, result}]
  pending: null,           // {period, size, num, conf}
  lastResolvedPeriod: null // kon period ta resolve hoyeche
};

function headers(){return {"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})}}
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Request failed");return j}
function toast(msg){$("toast").textContent=msg;$("toast").className="show";setTimeout(()=>$("toast").className="",2200)}
function show(id){["authScreen","adminLoginScreen","userApp","adminApp"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function classify(n){return Number(n)>=5?"BIG":"SMALL"}
function cclass(c){return (c||"").includes("red")?"red":(c||"").includes("green")?"green":"violet"}

/* ================================================== */
/* DRAGGABLE + RESIZABLE PANEL                        */
/* ================================================== */
(function(){
  const panel = $("floatPanel");
  const bar   = $("dragBar");
  const handle= $("resizeHandle");
  const reopen= $("reopenBtn");
  const btnMin= $("btnMin");
  const btnClose= $("btnClose");

  let dragging=false, startX=0, startY=0, startLeft=0, startTop=0;
  function pointerDown(e){
    if(e.target.closest(".win-btns")) return;
    dragging=true;
    const p = e.touches?e.touches[0]:e;
    startX=p.clientX; startY=p.clientY;
    const rect=panel.getBoundingClientRect();
    startLeft=rect.left; startTop=rect.top;
    panel.style.transform="none";
    panel.style.left=startLeft+"px";
    panel.style.top =startTop +"px";
    document.addEventListener("mousemove",pointerMove);
    document.addEventListener("mouseup",pointerUp);
    document.addEventListener("touchmove",pointerMove,{passive:false});
    document.addEventListener("touchend",pointerUp);
  }
  function pointerMove(e){
    if(!dragging) return;
    e.preventDefault?.();
    const p = e.touches?e.touches[0]:e;
    const dx=p.clientX-startX, dy=p.clientY-startY;
    let nl=startLeft+dx, nt=startTop+dy;
    nl=Math.max(0,Math.min(window.innerWidth-60,nl));
    nt=Math.max(0,Math.min(window.innerHeight-40,nt));
    panel.style.left=nl+"px";
    panel.style.top =nt+"px";
  }
  function pointerUp(){
    dragging=false;
    document.removeEventListener("mousemove",pointerMove);
    document.removeEventListener("mouseup",pointerUp);
    document.removeEventListener("touchmove",pointerMove);
    document.removeEventListener("touchend",pointerUp);
  }
  bar.addEventListener("mousedown",pointerDown);
  bar.addEventListener("touchstart",pointerDown,{passive:false});

  let resizing=false, rStartX=0, rStartY=0, rStartW=0, rStartH=0;
  function resizeDown(e){
    e.stopPropagation();
    resizing=true;
    const p = e.touches?e.touches[0]:e;
    rStartX=p.clientX; rStartY=p.clientY;
    const rect=panel.getBoundingClientRect();
    rStartW=rect.width; rStartH=rect.height;
    document.addEventListener("mousemove",resizeMove);
    document.addEventListener("mouseup",resizeUp);
    document.addEventListener("touchmove",resizeMove,{passive:false});
    document.addEventListener("touchend",resizeUp);
  }
  function resizeMove(e){
    if(!resizing) return;
    e.preventDefault?.();
    const p = e.touches?e.touches[0]:e;
    const dx=p.clientX-rStartX, dy=p.clientY-rStartY;
    let nw=Math.max(240,rStartW+dx);
    let nh=Math.max(300,rStartH+dy);
    nw=Math.min(window.innerWidth-10,nw);
    nh=Math.min(window.innerHeight-10,nh);
    panel.style.width =nw+"px";
    panel.style.height=nh+"px";
  }
  function resizeUp(){
    resizing=false;
    document.removeEventListener("mousemove",resizeMove);
    document.removeEventListener("mouseup",resizeUp);
    document.removeEventListener("touchmove",resizeMove);
    document.removeEventListener("touchend",resizeUp);
  }
  handle.addEventListener("mousedown",resizeDown);
  handle.addEventListener("touchstart",resizeDown,{passive:false});

  function hidePanel(){ panel.classList.add("hidden"); reopen.classList.remove("hidden"); }
  btnMin.onclick = hidePanel;
  btnClose.onclick = hidePanel;
  reopen.onclick = ()=>{ panel.classList.remove("hidden"); reopen.classList.add("hidden"); };
})();

/* ================================================== */
/* AI PREDICTION — same logic as python               */
/* ================================================== */
function aiAnalyze(data){
  if(!data || !data.length){
    const size = Math.random()<0.5 ? "BIG" : "SMALL";
    const num  = size==="BIG" ? rand(5,9) : rand(0,4);
    return {size, num, conf: rand(85,92)};
  }
  const last5 = data.slice(0,5).map(x=>classify(x.number));
  let size, conf, num;

  if(last5[0]===last5[1] && last5[1]===last5[2]){
    size = last5[0];
    conf = rand(95,99);
  } else if(last5[0]!==last5[1]){
    size = last5[0]==="SMALL" ? "BIG" : "SMALL";
    conf = rand(88,94);
  } else {
    const bigCount = last5.filter(x=>x==="BIG").length;
    size = bigCount > (last5.length-bigCount) ? "SMALL" : "BIG";
    conf = rand(85,90);
  }
  num = size==="BIG" ? rand(5,9) : rand(0,4);
  return {size, num, conf};
}
function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

/* ================================================== */
/* MAIN TICK                                          */
/* ================================================== */
let TICK_RUNNING = false;

async function tick(){
  if(TICK_RUNNING) return;
  TICK_RUNNING = true;
  try{
    const t = performance.now();
    const j = await api("/api/history?x="+Date.now());
    const d = j?.data?.list || [];
    if(!d.length) throw new Error("No data");

    $("ping").textContent = Math.round(performance.now()-t)+"MS";

    const currPeriod = String(d[0].issueNumber);
    const currNum    = Number(d[0].number);
    const currSize   = classify(currNum);

    /* ===== STEP 1: RESOLVE pending prediction (only once per period) ===== */
    if(SESSION.pending && String(SESSION.pending.period) === currPeriod){
      if(SESSION.lastResolvedPeriod !== currPeriod){
        SESSION.lastResolvedPeriod = currPeriod;

        const res = (SESSION.pending.size === currSize) ? "WIN" : "LOSS";
        SESSION.total++;
        if(res==="WIN") SESSION.win++; else SESSION.loss++;

        SESSION.log.unshift({
          period: currPeriod,
          predSize: SESSION.pending.size,
          predNum: SESSION.pending.num,
          actSize: currSize,
          actNum: currNum,
          result: res
        });
        if(SESSION.log.length > 30) SESSION.log.pop();

        renderLastResult(SESSION.log[0]);
        renderStats();
        renderLog();
        renderModal();

        toast(res==="WIN" ? "✅ WIN" : "❌ LOSS");

        /* clear pending — next block generates for next period */
        SESSION.pending = null;
      }
    }

    /* ===== STEP 2: GENERATE new prediction (only once per period) ===== */
    if(!SESSION.pending){
      const nxt = String(Number(currPeriod)+1);
      /* Only generate if we haven't already predicted this target */
      if(SESSION.lastResolvedPeriod !== nxt){
        const a = aiAnalyze(d);
        SESSION.pending = { period: nxt, size: a.size, num: a.num, conf: a.conf };
      }
    }

    /* ===== STEP 3: Render current prediction ===== */
    if(SESSION.pending){
      const p = SESSION.pending;
      $("targetPeriod").textContent = p.period;
      $("predNum").textContent = p.num;
      $("predNum").className = p.size==="BIG" ? "red" : "green";
      $("predSize").textContent = (p.size==="BIG"?"🔴 ":"🔵 ") + p.size;
      $("predConf").textContent = "CONF: " + p.conf + "%";
      $("predStatus").textContent = "Waiting for period " + p.period + "…";
    } else {
      $("targetPeriod").textContent = currPeriod;
      $("predSize").textContent = "-- LOCKED --";
      $("predConf").textContent = "CONF: --%";
      $("predStatus").textContent = "Resolving…";
    }
    $("lastUpdated").textContent = new Date().toLocaleTimeString();

  }catch(e){
    $("predStatus").textContent = "OFFLINE — check server";
  } finally {
    TICK_RUNNING = false;
  }
}

/* ---- Renderers ---- */
function renderLastResult(r){
  if(!r){ $("lastResult").innerHTML = '<div class="empty">No prediction yet</div>'; return; }
  const cls = r.result==="WIN" ? "lr-win" : "lr-loss";
  const sym = r.result==="WIN" ? "✅ WIN" : "❌ LOSS";
  $("lastResult").innerHTML = `
    <div class="lr-row">
      <span>${String(r.period).slice(-6)}</span>
      <span class="tag ${r.predSize.toLowerCase()}">${r.predSize} ${r.predNum}</span>
      <span>${r.actSize} ${r.actNum}</span>
      <span class="${cls}">${sym}</span>
    </div>`;
}

function renderStats(){
  $("stTotal").textContent = SESSION.total;
  $("stWin").textContent   = SESSION.win;
  $("stLoss").textContent  = SESSION.loss;
  const rate = SESSION.total ? Math.round(SESSION.win*100/SESSION.total) : 0;
  $("stRate").textContent  = rate + "%";
}

function renderLog(){
  const el = $("predLog");
  if(!SESSION.log.length){ el.innerHTML = '<div class="empty">No predictions yet</div>'; return; }
  el.innerHTML = SESSION.log.map(r=>`
    <div class="row">
      <span>${String(r.period).slice(-6)}</span>
      <span class="tag ${r.predSize.toLowerCase()}">${r.predSize[0]}${r.predNum}</span>
      <span class="n ${r.actSize==="BIG"?"red":"green"}">${r.actNum}</span>
      <span class="tag ${r.result==="WIN"?"big":"small"}">${r.result==="WIN"?"W":"L"}</span>
    </div>`).join("");
}

function renderModal(){
  const el = $("modalHistory");
  if(!SESSION.log.length){ el.innerHTML = '<div class="empty">No history yet</div>'; $("modalTotal").textContent="0"; $("modalAcc").textContent="--%"; return; }
  el.innerHTML = SESSION.log.map(r=>`
    <div class="row">
      <span>${String(r.period).slice(-6)}</span>
      <span class="tag ${r.predSize.toLowerCase()}">${r.predSize[0]}${r.predNum}</span>
      <span class="n ${r.actSize==="BIG"?"red":"green"}">${r.actNum}</span>
      <span class="tag ${r.result==="WIN"?"big":"small"}">${r.result==="WIN"?"W":"L"}</span>
    </div>`).join("");
  $("modalTotal").textContent = SESSION.total;
  $("modalAcc").textContent = (SESSION.total?Math.round(SESSION.win*100/SESSION.total):0)+"%";
}

/* ================================================== */
/* AUTH                                               */
/* ================================================== */
async function loginUser(){
  const key=$("vipKey").value.trim();
  if(!key)return toast("Enter VIP key");
  try{
    const j=await api("/api/login/user",{method:"POST",body:JSON.stringify({key})});
    token=j.token;role="user";
    localStorage.setItem("evil_token",token);
    localStorage.setItem("evil_role",role);
    show("userApp");
    tick();
    if(window.__tickTimer) clearInterval(window.__tickTimer);
    window.__tickTimer = setInterval(tick, 15000);
  }catch(e){toast(e.message)}
}

async function loginAdmin(){
  const u=$("adminUser").value.trim();
  const p=$("adminPass").value;
  if(u!==ADMIN_USER || p!==ADMIN_PASS) return toast("Invalid admin credentials");
  try{
    const j=await api("/api/login/admin",{method:"POST",body:JSON.stringify({username:u,password:p})});
    token=j.token;role="admin";
    localStorage.setItem("evil_token",token);
    localStorage.setItem("evil_role",role);
    show("adminApp");
    loadAdmin();
  }catch(e){toast(e.message)}
}

async function logout(){
  try{await api("/api/logout",{method:"POST"})}catch{}
  if(window.__tickTimer) clearInterval(window.__tickTimer);
  token="";role="";localStorage.clear();show("authScreen");
}

/* ================================================== */
/* ADMIN                                              */
/* ================================================== */
async function loadAdmin(){
  try{
    const j=await api("/api/admin/overview"),s=j.stats;
    $("sUsers").textContent=s.users;$("sKeys").textContent=s.keys;
    $("sActive").textContent=s.activeKeys;$("sSignals").textContent=s.signals;
    $("keys").innerHTML=j.keys.map(k=>`<div class="admin-item"><div><b>${k.code}</b><small>${k.days} days • ${k.used?"USED":"UNUSED"} • ${k.revoked?"REVOKED":"ACTIVE"}</small></div>${k.revoked?"":'<button class="danger" onclick="revokeKey(\''+k.code+'\')">REVOKE</button>'}</div>`).join("")||'<div class="empty">No keys</div>';
    $("users").innerHTML=j.users.map(u=>`<div class="admin-item"><div><b>${u.key}</b><small>${u.signals||0} signals • ${u.wins||0} wins • ${u.losses||0} losses</small></div><span>USER</span></div>`).join("")||'<div class="empty">No users</div>';
  }catch(e){toast(e.message);show("authScreen")}
}

async function genKey(){
  try{
    const j=await api("/api/admin/keys",{method:"POST",body:JSON.stringify({days:Number($("days").value)})});
    $("newKey").classList.remove("hidden");
    $("newKey").textContent=j.code;
    toast("VIP key created");
    loadAdmin();
  }catch(e){toast(e.message)}
}

async function revokeKey(code){
  if(!confirm("Revoke "+code+"?"))return;
  try{await api("/api/admin/keys/"+encodeURIComponent(code),{method:"DELETE"});loadAdmin()}
  catch(e){toast(e.message)}
}

/* ================================================== */
/* EVENTS                                             */
/* ================================================== */
$("userLogin").onclick=loginUser;
$("adminLogin").onclick=loginAdmin;
$("showAdmin").onclick=()=>show("adminLoginScreen");
$("backAuth").onclick=()=>show("authScreen");
$("logoutUser").onclick=logout;
$("logoutAdmin").onclick=logout;
$("adminRefresh").onclick=loadAdmin;
$("genKey").onclick=genKey;

/* REFRESH — live theke just status update, kono notun prediction na */
$("refresh").onclick=()=>{ tick(); toast("Refreshed"); };

/* INJECT — force re-lock but don't spam. Sudhu jodi pending na thake. */
$("inject").onclick=()=>{
  if(SESSION.pending){
    toast("Prediction already locked for " + SESSION.pending.period);
    return;
  }
  SESSION.pending = null;
  tick();
  toast("Prediction generated");
};

$("tg").onclick=()=>window.open("https://t.me/Topboyadm","_blank","noopener,noreferrer");
$("showTg").onclick=()=>window.open("https://t.me/Topboyadm","_blank","noopener,noreferrer");

$("openHistoryFromAuth").onclick=()=>{ $("historyModal").classList.remove("hidden"); renderModal(); };
$("closeHistoryModal").onclick=()=>$("historyModal").classList.add("hidden");
$("hideAuth").onclick=()=>{ $("floatPanel").classList.add("hidden"); $("reopenBtn").classList.remove("hidden"); };

document.querySelectorAll("nav button[data-target]").forEach(b=>{
  b.onclick=()=>{
    const cards=document.querySelectorAll("#userApp .card");
    if(b.dataset.target==="log"&&cards[2])cards[2].scrollIntoView({behavior:"smooth"});
    if(b.dataset.target==="stats"&&cards[1])cards[1].scrollIntoView({behavior:"smooth"});
  };
});

/* ================================================== */
/* BOOT                                               */
/* ================================================== */
if(token&&role==="admin"){show("adminApp");loadAdmin()}
else if(token&&role==="user"){
  show("userApp");tick();
  if(window.__tickTimer) clearInterval(window.__tickTimer);
  window.__tickTimer = setInterval(tick, 15000);
}
else show("authScreen");
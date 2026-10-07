const $=id=>document.getElementById(id);
let token=localStorage.getItem("evil_token")||"";
let role=localStorage.getItem("evil_role")||"";

/* HARD-CODED ADMIN CREDENTIALS */
const ADMIN_USER="@arman";
const ADMIN_PASS="@arman2026##";

function headers(){return {"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})}}
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Request failed");return j}
function toast(msg){$("toast").textContent=msg;$("toast").className="show";setTimeout(()=>$("toast").className="",2200)}
function show(id){["authScreen","adminLoginScreen","userApp","adminApp"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function classify(n){return Number(n)>=5?"BIG":"SMALL"}
function cclass(c){return (c||"").includes("red")?"red":(c||"").includes("green")?"green":"violet"}

/* ---- Modal open/close ---- */
function openHistoryModal(){ $("historyModal").classList.remove("hidden"); }
function closeHistoryModal(){ $("historyModal").classList.add("hidden"); }

/* ================================================== */
/* DRAGGABLE + RESIZABLE FLOATING PANEL              */
/* ================================================== */
(function(){
  const panel = $("floatPanel");
  const bar   = $("dragBar");
  const handle= $("resizeHandle");
  const reopen= $("reopenBtn");
  const btnMin= $("btnMin");
  const btnClose= $("btnClose");

  // --- Drag ---
  let dragging=false, startX=0, startY=0, startLeft=0, startTop=0;

  function pointerDown(e){
    if(e.target.closest(".win-btns")) return;
    dragging=true;
    const p = e.touches?e.touches[0]:e;
    startX=p.clientX; startY=p.clientY;
    const rect=panel.getBoundingClientRect();
    startLeft=rect.left; startTop=rect.top;
    // convert from translateX(-50%) to fixed left
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
    // bounds
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

  // --- Resize ---
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

  // --- Minimize / Close (hide panel, show reopen) ---
  function hidePanel(){
    panel.classList.add("hidden");
    reopen.classList.remove("hidden");
  }
  btnMin.onclick  = hidePanel;
  btnClose.onclick= hidePanel;
  reopen.onclick  = ()=>{
    panel.classList.remove("hidden");
    reopen.classList.add("hidden");
  };
})();

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
    loadHistory();
  }catch(e){toast(e.message)}
}

async function loginAdmin(){
  const u=$("adminUser").value.trim();
  const p=$("adminPass").value;
  if(u!==ADMIN_USER || p!==ADMIN_PASS){
    return toast("Invalid admin credentials");
  }
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
  token="";role="";localStorage.clear();show("authScreen");
}

/* ================================================== */
/* HISTORY                                            */
/* ================================================== */
async function loadHistory(){
  const t=performance.now();
  try{
    const j=await api("/api/history?x="+Date.now());
    const d=j?.data?.list||[]; if(!d.length)throw new Error("No history");
    $("ping").textContent=Math.round(performance.now()-t)+"MS";
    $("period").textContent=d[0].issueNumber;
    $("num").textContent=d[0].number;$("num").className=cclass(d[0].color);
    $("meta").textContent=`${d[0].color||"unknown"} • ${classify(d[0].number)} • LIVE`;
    const s=d.slice(0,20);
    const big=s.filter(x=>classify(x.number)==="BIG").length;
    const small=s.length-big;
    $("bigN").textContent=big;$("smallN").textContent=small;
    $("bigBar").style.width=(big/s.length*100)+"%";
    $("smallBar").style.width=(small/s.length*100)+"%";
    $("updated").textContent=new Date().toLocaleTimeString();
    $("history").innerHTML=s.map(x=>`<div class="row"><span>${x.issueNumber}</span><span class="n ${cclass(x.color)}">${x.number}</span><span class="tag ${classify(x.number).toLowerCase()}">${classify(x.number)}</span><span>${x.color||"-"}</span></div>`).join("");
    updateModalHistory(s);
  }catch(e){
    $("meta").textContent="LIVE HISTORY OFFLINE";
    $("history").innerHTML='<div class="empty">Unable to load live history</div>';
  }
}

function updateModalHistory(s){
  const list=$("modalHistory");
  if(!s.length){ list.innerHTML='<div class="empty">No history yet</div>'; $("modalTotal").textContent="0"; return; }
  list.innerHTML=s.map(x=>{
    const pred=classify(x.number);
    const actual=classify(x.number);
    const ok=pred===actual;
    return `<div class="row">
      <span>${x.issueNumber.slice(-6)}</span>
      <span class="tag ${pred.toLowerCase()}">${pred==="BIG"?"B":"S"}</span>
      <span class="n ${cclass(x.color)}">${x.number}</span>
      <span class="tag ${ok?'big':'small'}">${ok?"W":"L"}</span>
    </div>`;
  }).join("");
  $("modalTotal").textContent=s.length;
  $("modalAcc").textContent="100%";
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
$("refresh").onclick=loadHistory;
$("adminRefresh").onclick=loadAdmin;
$("genKey").onclick=genKey;
$("openGame").onclick=()=>window.open("https://dkwin9.com/#/register?invitationCode=691942278103","_blank","noopener,noreferrer");
$("tg").onclick=()=>window.open("https://t.me/Topboyadm","_blank","noopener,noreferrer");

$("openHistoryFromAuth").onclick=()=>{openHistoryModal();loadHistory();};
$("showHistoryModal").onclick=()=>{openHistoryModal();loadHistory();};
$("closeHistoryModal").onclick=closeHistoryModal;
$("hideAuth").onclick=()=>{document.getElementById("floatPanel").classList.add("hidden");document.getElementById("reopenBtn").classList.remove("hidden");};

document.querySelectorAll("nav button[data-target]").forEach(b=>{
  b.onclick=()=>{
    const cards=document.querySelectorAll("#userApp .card");
    if(b.dataset.target==="history"&&cards[1])cards[1].scrollIntoView({behavior:"smooth"});
    if(b.dataset.target==="trend"&&cards[0])cards[0].scrollIntoView({behavior:"smooth"});
  };
});

/* ================================================== */
/* BOOT                                               */
/* ================================================== */
if(token&&role==="admin"){show("adminApp");loadAdmin()}
else if(token&&role==="user"){show("userApp");loadHistory()}
else show("authScreen");

setInterval(()=>{
  if(role==="user"&&!$("userApp").classList.contains("hidden"))loadHistory();
},15000);

/* ================================================== */
/* BACKGROUND IFRAME FALLBACK DETECT                  */
/* ================================================== */
setTimeout(()=>{
  const f=$("bgFrame");
  try{
    // jodi cross-origin e block hoy, contentDocument null hoy
    if(!f.contentWindow || f.contentWindow.length===0){
      // some browsers e error na diye load hoy, tai ei check ta soft
    }
  }catch(e){
    $("bgFallback").classList.remove("hidden");
  }
},4000);
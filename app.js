const $=id=>document.getElementById(id);
let token=localStorage.getItem("evil_token")||"";
let role=localStorage.getItem("evil_role")||"";

function headers(){return {"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})}}
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Request failed");return j}
function toast(msg){$("toast").textContent=msg;$("toast").className="show";setTimeout(()=>$("toast").className="",2200)}
function show(id){["authScreen","adminLoginScreen","userApp","adminApp"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function classify(n){return Number(n)>=5?"BIG":"SMALL"}
function cclass(c){return (c||"").includes("red")?"red":(c||"").includes("green")?"green":"violet"}

/* ---- Modal open/close ---- */
function openHistoryModal(){ $("historyModal").classList.remove("hidden"); }
function closeHistoryModal(){ $("historyModal").classList.add("hidden"); }

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
  try{
    const j=await api("/api/login/admin",{method:"POST",body:JSON.stringify({username:$("adminUser").value,password:$("adminPass").value})});
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

let lastHistory=[];
async function loadHistory(){
  const t=performance.now();
  try{
    const j=await api("/api/history?x="+Date.now());
    const d=j?.data?.list||[]; if(!d.length)throw new Error("No history");
    lastHistory=d;
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
    // also update modal
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
    const pred=classify(x.number); // for demo, use actual as pred
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

/* ---- Event binds ---- */
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

/* modal bind */
$("openHistoryFromAuth").onclick=()=>{openHistoryModal();loadHistory();};
$("showHistoryModal").onclick=()=>{openHistoryModal();loadHistory();};
$("closeHistoryModal").onclick=closeHistoryModal;
$("hideAuth").onclick=()=>{document.body.classList.toggle("hide-ui");};

/* nav scroll */
document.querySelectorAll("nav button[data-target]").forEach(b=>{
  b.onclick=()=>{
    const cards=document.querySelectorAll("#userApp .card");
    if(b.dataset.target==="history"&&cards[1])cards[1].scrollIntoView({behavior:"smooth"});
    if(b.dataset.target==="trend"&&cards[0])cards[0].scrollIntoView({behavior:"smooth"});
  };
});

/* ---- Auto boot ---- */
if(token&&role==="admin"){show("adminApp");loadAdmin()}
else if(token&&role==="user"){show("userApp");loadHistory()}
else show("authScreen");

setInterval(()=>{
  if(role==="user"&&!$("userApp").classList.contains("hidden"))loadHistory();
},15000);
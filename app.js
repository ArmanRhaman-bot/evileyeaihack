const $=id=>document.getElementById(id);
let token=localStorage.getItem("evil_token")||"";
let role=localStorage.getItem("evil_role")||"";

function headers(){return {"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})}}
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Request failed");return j}
function toast(msg){$("toast").textContent=msg;$("toast").className="show";setTimeout(()=>$("toast").className="",2200)}
function show(id){["authScreen","adminLoginScreen","userApp","adminApp"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function classify(n){return Number(n)>=5?"BIG":"SMALL"}
function cclass(c){return (c||"").includes("red")?"red":(c||"").includes("green")?"green":"violet"}

async function loginUser(){
  const key=$("vipKey").value.trim();
  if(!key)return toast("Enter VIP key");
  try{const j=await api("/api/login/user",{method:"POST",body:JSON.stringify({key})});token=j.token;role="user";localStorage.setItem("evil_token",token);localStorage.setItem("evil_role",role);show("userApp");loadHistory()}catch(e){toast(e.message)}
}
async function loginAdmin(){
  try{const j=await api("/api/login/admin",{method:"POST",body:JSON.stringify({username:$("adminUser").value,password:$("adminPass").value})});token=j.token;role="admin";localStorage.setItem("evil_token",token);localStorage.setItem("evil_role",role);show("adminApp");loadAdmin()}catch(e){toast(e.message)}
}
async function logout(){try{await api("/api/logout",{method:"POST"})}catch{}token="";role="";localStorage.clear();show("authScreen")}

async function loadHistory(){
  const t=performance.now();
  try{
    const j=await api("/api/history?x="+Date.now());
    const d=j?.data?.list||[]; if(!d.length)throw new Error("No history");
    $("ping").textContent=Math.round(performance.now()-t)+"MS";
    $("period").textContent=d[0].issueNumber;
    $("num").textContent=d[0].number;$("num").className=cclass(d[0].color);
    $("meta").textContent=`${d[0].color||"unknown"} • ${classify(d[0].number)} • LIVE`;
    const s=d.slice(0,20),big=s.filter(x=>classify(x.number)==="BIG").length,small=s.length-big;
    $("bigN").textContent=big;$("smallN").textContent=small;
    $("bigBar").style.width=(big/s.length*100)+"%";$("smallBar").style.width=(small/s.length*100)+"%";
    $("updated").textContent=new Date().toLocaleTimeString();
    $("history").innerHTML=s.map(x=>`<div class="row"><span>${x.issueNumber}</span><span class="n ${cclass(x.color)}">${x.number}</span><span class="tag ${classify(x.number).toLowerCase()}">${classify(x.number)}</span><span>${x.color||"-"}</span></div>`).join("");
  }catch(e){$("meta").textContent="LIVE HISTORY OFFLINE";$("history").innerHTML='<div class="empty">Unable to load live history</div>'}
}

async function loadAdmin(){
  try{
    const j=await api("/api/admin/overview"),s=j.stats;
    $("sUsers").textContent=s.users;$("sKeys").textContent=s.keys;$("sActive").textContent=s.activeKeys;$("sSignals").textContent=s.signals;
    $("keys").innerHTML=j.keys.map(k=>`<div class="admin-item"><div><b>${k.code}</b><small>${k.days} days • ${k.used?"USED":"UNUSED"} • ${k.revoked?"REVOKED":"ACTIVE"}</small></div>${k.revoked?"":"<button class=\"danger\" onclick=\"revokeKey('"+k.code+"')\">REVOKE</button>"}</div>`).join("")||'<div class="empty">No keys</div>';
    $("users").innerHTML=j.users.map(u=>`<div class="admin-item"><div><b>${u.key}</b><small>${u.signals||0} signals • ${u.wins||0} wins • ${u.losses||0} losses</small></div><span>USER</span></div>`).join("")||'<div class="empty">No users</div>';
  }catch(e){toast(e.message);show("authScreen")}
}
async function genKey(){try{const j=await api("/api/admin/keys",{method:"POST",body:JSON.stringify({days:Number($("days").value)})});$("newKey").classList.remove("hidden");$("newKey").textContent=j.code;toast("VIP key created");loadAdmin()}catch(e){toast(e.message)}}
async function revokeKey(code){if(!confirm("Revoke "+code+"?"))return;try{await api("/api/admin/keys/"+encodeURIComponent(code),{method:"DELETE"});loadAdmin()}catch(e){toast(e.message)}}

$("userLogin").onclick=loginUser;$("adminLogin").onclick=loginAdmin;$("showAdmin").onclick=()=>show("adminLoginScreen");$("backAuth").onclick=()=>show("authScreen");
$("logoutUser").onclick=logout;$("logoutAdmin").onclick=logout;$("refresh").onclick=loadHistory;$("adminRefresh").onclick=loadAdmin;$("genKey").onclick=genKey;
$("openGame").onclick=()=>window.open("https://dkwin9.com/#/register?invitationCode=691942278103","_blank","noopener,noreferrer");
$("tg").onclick=()=>window.open("https://t.me/Topboyadm","_blank","noopener,noreferrer");
document.querySelectorAll("nav button[data-target]").forEach(b=>b.onclick=()=>document.querySelector(".card:last-of-type")?.scrollIntoView({behavior:"smooth"}));

if(token&&role==="admin"){show("adminApp");loadAdmin()}
else if(token&&role==="user"){show("userApp");loadHistory()}
else show("authScreen");
setInterval(()=>{if(role==="user"&&!$("userApp").classList.contains("hidden"))loadHistory()},15000);
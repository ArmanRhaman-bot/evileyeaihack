const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const API_URL = process.env.WINGO_API_URL ||
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE_ME_NOW";

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");
fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch {
    const initial = { users: [], keys: [], sessions: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}
let db = load();
function save(){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

const sessions = new Map();

function token(){
  return crypto.randomBytes(32).toString("hex");
}
function hash(s){
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}
function auth(req){
  const t = (req.headers.authorization || "").replace("Bearer ","");
  return sessions.get(t) || null;
}
function requireAdmin(req,res,next){
  const s=auth(req);
  if(!s || s.role!=="admin") return res.status(401).json({ok:false,error:"Admin login required"});
  req.session=s; next();
}
function requireUser(req,res,next){
  const s=auth(req);
  if(!s || !["user","admin"].includes(s.role)) return res.status(401).json({ok:false,error:"Login required"});
  req.session=s; next();
}

app.use(express.json({limit:"64kb"}));
app.use(express.static(__dirname, { extensions:["html"] }));

app.get("/api/health",(req,res)=>res.json({ok:true,time:Date.now()}));

app.post("/api/login/admin",(req,res)=>{
  const {username,password}=req.body||{};
  if(username!==ADMIN_USER || password!==ADMIN_PASSWORD)
    return res.status(401).json({ok:false,error:"Invalid admin credentials"});
  const t=token(); sessions.set(t,{role:"admin",username});
  res.json({ok:true,token:t,role:"admin",username});
});

app.post("/api/login/user",(req,res)=>{
  const key=String(req.body?.key||"").trim().toUpperCase();
  const item=db.keys.find(x=>x.code===key);
  if(!item) return res.status(401).json({ok:false,error:"Invalid VIP key"});
  if(item.revoked) return res.status(401).json({ok:false,error:"Key revoked"});
  if(item.expiresAt && Date.now()>item.expiresAt) return res.status(401).json({ok:false,error:"Key expired"});
  let user=db.users.find(x=>x.key===key);
  if(!user){
    user={id:crypto.randomUUID(),key,createdAt:Date.now(),signals:0,wins:0,losses:0,lastLogin:Date.now()};
    db.users.push(user);
  } else user.lastLogin=Date.now();
  item.used=true;
  save();
  const t=token(); sessions.set(t,{role:"user",userId:user.id});
  res.json({ok:true,token:t,role:"user",user:{id:user.id,stats:user}});
});

app.post("/api/logout",(req,res)=>{
  const t=(req.headers.authorization||"").replace("Bearer ","");
  sessions.delete(t); res.json({ok:true});
});

app.get("/api/me",requireUser,(req,res)=>{
  if(req.session.role==="admin") return res.json({ok:true,role:"admin",username:req.session.username});
  const u=db.users.find(x=>x.id===req.session.userId);
  res.json({ok:true,role:"user",user:u});
});

app.get("/api/history",async(req,res)=>{
  try{
    const r=await fetch(API_URL,{headers:{"User-Agent":"Mozilla/5.0"}});
    if(!r.ok) throw new Error("Upstream "+r.status);
    const j=await r.json();
    res.set("Cache-Control","no-store");
    res.json(j);
  }catch(e){res.status(502).json({ok:false,error:"Live history server unavailable"});}
});

/* Admin */
app.get("/api/admin/overview",requireAdmin,(req,res)=>{
  const now=Date.now();
  const activeKeys=db.keys.filter(k=>!k.revoked && (!k.expiresAt || k.expiresAt>now)).length;
  const usedKeys=db.keys.filter(k=>k.used && !k.revoked).length;
  const totalSignals=db.users.reduce((a,u)=>a+(u.signals||0),0);
  const wins=db.users.reduce((a,u)=>a+(u.wins||0),0);
  res.json({ok:true,stats:{
    users:db.users.length, keys:db.keys.length, activeKeys, usedKeys,
    signals:totalSignals,wins,losses:Math.max(0,totalSignals-wins)
  },users:db.users.slice().reverse().slice(0,50),keys:db.keys.slice().reverse().slice(0,50)});
});

app.post("/api/admin/keys",requireAdmin,(req,res)=>{
  const days=Math.max(1,Math.min(3650,Number(req.body?.days)||30));
  const code="RDX-"+crypto.randomBytes(6).toString("hex").toUpperCase();
  db.keys.push({id:crypto.randomUUID(),code,days,createdAt:Date.now(),expiresAt:Date.now()+days*86400000,used:false,revoked:false});
  save(); res.json({ok:true,code,days});
});

app.delete("/api/admin/keys/:code",requireAdmin,(req,res)=>{
  const k=db.keys.find(x=>x.code===req.params.code);
  if(!k) return res.status(404).json({ok:false,error:"Key not found"});
  k.revoked=true; save(); res.json({ok:true});
});

app.post("/api/user/stats",requireUser,(req,res)=>{
  if(req.session.role!=="user") return res.status(403).json({ok:false});
  const u=db.users.find(x=>x.id===req.session.userId);
  const outcome=req.body?.outcome;
  if(["win","loss"].includes(outcome)){
    u.signals=(u.signals||0)+1;
    if(outcome==="win") u.wins=(u.wins||0)+1;
    else u.losses=(u.losses||0)+1;
    save();
  }
  res.json({ok:true,user:u});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log(`EVIL EYE web running on ${PORT}`));

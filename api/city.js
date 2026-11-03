import { put, get, BlobPreconditionFailedError } from '@vercel/blob';
const KEY='city-state.json';
const MAYOR='אדם גלעד 2';
const MAX_RESIDENTS=448; // every lot in the city (121 blocks minus the 9 centre blocks, 4 lots each)
const DEFAULT_REVEAL='2026-11-09T16:00:00.000Z';
const INITIAL={residents:[{id:'s0',name:MAYOR,at:0}],settings:{party:false,title:'',theme:'day',reveal:DEFAULT_REVEAL}};
const allowed=['day','sunset','night'];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,30);
function normSettings(v){
 v=v||{};const r=Date.parse(v.reveal||'');
 return {party:!!v.party,title:clean(v.title).slice(0,40),theme:allowed.includes(v.theme)?v.theme:'day',reveal:isNaN(r)?DEFAULT_REVEAL:new Date(r).toISOString()};
}
// Always read straight from storage (useCache:false). Reading through the CDN returned
// copies up to a minute old, so quick edits overwrote each other and new houses vanished.
async function load(){
 try{
  const file=await get(KEY,{access:'private',useCache:false});
  if(!file||file.statusCode!==200)return {state:structuredClone(INITIAL),etag:null};
  const state=await new Response(file.stream).json();
  state.residents=Array.isArray(state.residents)?state.residents:[];
  state.settings=normSettings(state.settings);
  return {state,etag:file.blob.etag};
 }catch(e){if(e?.status===404||e?.code==='blob_not_found')return {state:structuredClone(INITIAL),etag:null};throw e}
}
async function store(state,etag){
 const opts={access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60};
 if(etag)opts.ifMatch=etag; // only save if nobody else saved in between
 await put(KEY,JSON.stringify(state),opts);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.query&&req.query.status!==undefined)return res.status(200).json({adminConfigured:!!process.env.CITY_ADMIN_KEY});
 if(req.method==='GET'){try{return res.status(200).json((await load()).state)}catch(e){console.error(e);return res.status(500).json({error:'storage unavailable'})}}
 if(!['POST','PATCH','DELETE'].includes(req.method))return res.status(405).end();
 // Only the mayor may change the city. The mayor's code is CITY_ADMIN_KEY when it is set
 // in Vercel, otherwise the code typed at the mayor gate. Sent URL-encoded (Hebrew).
 let sent='';try{sent=decodeURIComponent(String(req.headers['x-city-admin']||''))}catch(e){}
 const admin=sent!==''&&sent===(process.env.CITY_ADMIN_KEY||MAYOR);
 if(!admin)return res.status(403).json({error:'admin required'});
 let body=req.body||{};
 try{if(typeof body==='string')body=JSON.parse(body)}catch(e){return res.status(400).json({error:'bad json'})}
 if(body.action==='check')return res.status(200).json({ok:true});
 for(let attempt=0;attempt<4;attempt++){
  try{
   const {state,etag}=await load();
   if(req.method==='POST'){
    const name=clean(body.name);
    if(name.length<2||name===MAYOR)return res.status(400).json({error:'invalid name'});
    if(state.residents.length>=MAX_RESIDENTS)return res.status(409).json({error:'city full'});
    state.residents.push({id:crypto.randomUUID(),name,at:Date.now()+Math.random()});
   }else if(body.action==='settings'){
    state.settings=normSettings({...state.settings,...body});
   }else if(body.action==='delete'){
    if(!state.residents.some(x=>x.id===body.id))return res.status(404).json({error:'not found'});
    state.residents=state.residents.filter(x=>x.id!==body.id);
   }else if(body.action==='move'){
    const a=state.residents.find(x=>x.id===body.a),b=state.residents.find(x=>x.id===body.b);
    if(!a||!b)return res.status(404).json({error:'not found'});
    [a.at,b.at]=[b.at,a.at];
   }else{return res.status(400).json({error:'bad action'})}
   await store(state,etag);
   return res.status(200).json(state);
  }catch(e){
   if(e instanceof BlobPreconditionFailedError||e?.code==='precondition_failed'){await new Promise(r=>setTimeout(r,150*(attempt+1)));continue}
   console.error(e);return res.status(500).json({error:'save failed'});
  }
 }
 return res.status(409).json({error:'busy, try again'});
}

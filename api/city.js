import { put, get } from '@vercel/blob';
const KEY='city-state.json';
const INITIAL={residents:[{id:'s0',name:'אדם גלעד 2',at:0}],settings:{party:false,title:'',theme:'day'}};
async function load(){
 try {const file=await get(KEY,{access:'private'});if(!file)return structuredClone(INITIAL);return await file.json()} catch(e){if(e?.status===404||e?.code==='blob_not_found')return structuredClone(INITIAL);throw e}
}
async function store(v){await put(KEY,JSON.stringify(v),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:0})}
const clean=s=>String(s||'').replace(/\\s+/g,' ').trim().slice(0,30);
const allowed=['day','sunset','night'];
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'){try{return res.status(200).json(await load())}catch(e){console.error(e);return res.status(500).json({error:'storage unavailable'})}}
 if(!['POST','PATCH','DELETE'].includes(req.method))return res.status(405).end();
 const admin=req.headers['x-city-admin']===process.env.CITY_ADMIN_KEY;
 if(req.method!=='POST'&&!admin)return res.status(403).json({error:'admin required'});
 try{
  let state=await load();let body=req.body||{};if(typeof body==='string')body=JSON.parse(body);
  if(req.method==='POST'){
   const name=clean(body.name);
   if(name.length<2||name==='אדם גלעד 2')return res.status(400).json({error:'invalid name'});
   if(state.residents.length>=140)return res.status(409).json({error:'city full'});
   state.residents.push({id:crypto.randomUUID(),name,at:Date.now()+Math.random()});
  } else if(body.action==='settings'){
   state.settings={party:!!body.party,title:clean(body.title).slice(0,40),theme:allowed.includes(body.theme)?body.theme:'day'};
  }else if(body.action==='delete'){
   state.residents=state.residents.filter(x=>x.id!==body.id);
  }else if(body.action==='move'){
   const a=state.residents.find(x=>x.id===body.a),b=state.residents.find(x=>x.id===body.b);
   if(!a||!b)return res.status(404).json({error:'not found'});
   [a.at,b.at]=[b.at,a.at];
  }else{return res.status(400).json({error:'bad action'})}
  await store(state);return res.status(200).json(state);
 }catch(e){console.error(e);return res.status(500).json({error:'save failed'})}
}

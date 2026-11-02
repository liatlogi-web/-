from pathlib import Path
p=Path("index.html")
s=p.read_text()
if "async function cloudRefresh()" in s: raise SystemExit(0)
code="""
let cloudBusy=false,cloudKey='';
async function cloudCall(method='GET',body){
 const headers={'Content-Type':'application/json'};
 if(method==='PATCH'){
  if(!cloudKey)cloudKey=prompt('הכנס קוד ניהול ענן (הקוד שהגדרת ב-Vercel):')||'';
  if(!cloudKey)throw new Error('לא הוזן קוד ניהול');
  headers['x-city-admin']=cloudKey;
 }
 const response=await fetch('/api/city',{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!response.ok){if(response.status===403)cloudKey='';throw new Error('שמירה בענן נכשלה ('+response.status+')')}
 return response.json();
}
async function cloudRefresh(){
 if(cloudBusy)return;
 try{
  const data=await cloudCall();
  if(!Array.isArray(data.residents))throw new Error('missing residents');
  const list=data.residents.map((r,i)=>({id:String(r.id||i),name:cleanName(r.name),at:Number(r.at)||i})).sort((a,b)=>a.at-b.at);
  const had=initialLoaded;
  initialLoaded=true;
  onResidents(list,had);
  const v=data.settings||{};
  applySettings({party:!!v.party,title:String(v.title||''),theme:THEMES[v.theme]?v.theme:'day'});
  setNote('');
 }catch(err){setNote('אין חיבור לשמירה בענן. שינויים חדשים לא יישמרו.')}
}
async function cloudWrite(method,body){
 cloudBusy=true;
 try{const data=await cloudCall(method,body);await cloudRefreshAfter(data);return true}
 catch(err){$('msg').textContent=err.message;return false}
 finally{cloudBusy=false}
}
async function cloudRefreshAfter(data){
 const list=(data.residents||[]).map(r=>({id:r.id,name:cleanName(r.name),at:r.at})).sort((a,b)=>a.at-b.at);
 onResidents(list,true);
 if(data.settings)applySettings({party:!!data.settings.party,title:data.settings.title||'',theme:THEMES[data.settings.theme]?data.settings.theme:'day'});
}
"""
s=s.replace("async function connect(){goStatic();return;",code+"\nasync function connect(){goStatic();await cloudRefresh();setInterval(cloudRefresh,8000);return;")
s=s.replace("if(localMode){residents=[...residents,{id:'l'+Date.now(),name,at:Date.now()}];onResidents(residents,true);return}","if(localMode){await cloudWrite('POST',{name});return}")
s=s.replace("if(localMode){myId='me-local';residents=[...residents,{id:myId,name,at:Date.now()}];welcome.hidden=true;onResidents(residents,true);return}","if(localMode){const ok=await cloudWrite('POST',{name});if(ok){welcome.hidden=true;try{sessionStorage.setItem('sc_skip','1')}catch(e){}}else{$('welcomeMsg').textContent='לא הצלחנו לשמור את הבית בענן.'}btn.disabled=false;return}")
s=s.replace("if(localMode){a.at=ta;b.at=tb;residents=[...residents].sort((x,y)=>x.at-y.at);render();return}","if(localMode){await cloudWrite('PATCH',{action:'move',a:a.id,b:b.id});return}")
s=s.replace("if(localMode){residents=residents.filter(x=>x.id!==r.id);onResidents(residents,false);return}","if(localMode){await cloudWrite('PATCH',{action:'delete',id:r.id});return}")
s=s.replace("if(localMode||!settingsRef){applySettings(next);return}","if(localMode){await cloudWrite('PATCH',{action:'settings',...next});return}\n  if(!settingsRef){applySettings(next);return}")
s=s.replace("setNote(admin?'מצב עריכה: אחרי שינויים לוחצים \"שמירת האתר\" ומעלים את הקובץ החדש':'');","setNote('מתחבר לשמירה בענן...');")
s=s.replace("setNote('מצב עריכה: אחרי שינויים לוחצים \"שמירת האתר\" ומעלים את הקובץ החדש');render();","setNote('השינויים נשמרים אוטומטית בענן');render();")
s=s.replace("async function saveSite(){","async function saveSite(){await cloudRefresh();$('msg').textContent='האתר מתעדכן ונשמר בענן אוטומטית. לא צריך להוריד קובץ.';return;")
s=s.replace("שמירת האתר (הורדת קובץ)","בדיקת שמירה בענן")
p.write_text(s)

from pathlib import Path
p=Path('index.html')
s=p.read_text()
needle="  setNote('');\n }catch(err){setNote('אין חיבור לשמירה בענן."
if needle in s:
 s=s.replace(needle,"  setNote('');\n  if(!residents.some(r=>r.id===myId)) maybeWelcome();\n }catch(err){setNote('אין חיבור לשמירה בענן.")
p.write_text(s)

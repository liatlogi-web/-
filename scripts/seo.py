from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
old="<title>שקשוקה סיטי</title>"
seo='''<title>שקשוקה סיטי | משחק עיר השקשוקה</title>
<meta name="description" content="שקשוקה סיטי הוא משחק עיר תלת ממדי צבעוני. בואו לבקר בעיר השקשוקה, לראות את הבתים, האצטדיון וההפתעות!">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://shakshuka-city.vercel.app/">
<meta property="og:type" content="website">
<meta property="og:title" content="שקשוקה סיטי | משחק עיר השקשוקה">
<meta property="og:description" content="בואו לבקר בשקשוקה סיטי, משחק עיר תלת ממדי צבעוני!">
<meta property="og:url" content="https://shakshuka-city.vercel.app/">'''
if old in s:s=s.replace(old,seo,1);p.write_text(s,encoding="utf-8")

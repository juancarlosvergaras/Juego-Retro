from pathlib import Path
p=Path('tests/expansion-preview.html')
s=p.read_text(encoding='utf8').replace('<button id="fighter">Luchador</button>','<button id="fighter">Luchador</button><button id="wolf">Lobo</button><button id="zombie">Zombi</button><button id="tank">Tanque</button><button id="pose">Caída fija</button>')
s=s.replace("mission=7,hold=false;","mission=7,hold=false,fixedCrash=false;")
s=s.replace("zone=z;form=f;view=null;","zone=z;form=f;view=null;hold=false;fixedCrash=false;")
s=s.replace("if(!hold)e.invincible=999;","if(!hold)e.invincible=999;if(fixedCrash&&mission===4){s.crash=1.2;s.crashAge=1.0;}")
s=s.replace("['soldier','robot','fighter']","['soldier','robot','fighter','wolf','zombie','tank']")
s=s.replace("document.getElementById('shoot').onclick", "document.getElementById('pose').onclick=()=>{fixedCrash=!fixedCrash;hold=false;resume();};document.getElementById('shoot').onclick")
p.write_text(s,encoding='utf8')

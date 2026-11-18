from pathlib import Path
def edit(name,pairs):
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    for a,b in pairs:
        assert a in s,(name,a)
        s=s.replace(a,b)
    p.write_text(s,encoding='utf-8')
edit('road-war.js',[
 ("w:type==='jeep'?175:120,h:type==='jeep'?94:83","w:type==='jetSoldier'?34:type==='jeep'?175:120,h:type==='jetSoldier'?58:type==='jeep'?94:83"),
 ("text:'Vehículo destruido'});parts(s,n);burst(s,n.x,n.y-35,65);","text:n.type==='jetSoldier'?'Soldado aéreo neutralizado':'Vehículo destruido'});if(n.type!=='jetSoldier')parts(s,n);burst(s,n.x,n.y-35,65);"),
 ("n.x-=230*dt;n.death+=dt;continue;","n.x-=230*dt;n.death+=dt;if(n.type==='jetSoldier')n.y=Math.min(500,n.y+(100+n.death*320)*dt);continue;")])
edit('road-renderer.js',[("{...n,kind:'jetSoldier',facing:-1}","{...n,kind:'jetSoldier',death:Math.max(0,1-n.death/2.8),facing:-1}")])
edit('sea-war.js',[("text:n.type==='sub'?'Submarino neutralizado':'Buzo neutralizado'","text:n.type==='shark'?'Tiburón neutralizado':n.type==='sub'?'Submarino neutralizado':'Buzo neutralizado'")])
edit('level-seven.html',[('Atrio · Planta 1','Casco exterior · La nave nodriza'),('ACÉRCATE A UN TECHO','E · GANCHO / F · JETPACK')])

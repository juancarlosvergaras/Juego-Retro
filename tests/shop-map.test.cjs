const test=require('node:test');
const assert=require('node:assert/strict');
const Armory=require('../armory.js');
const Arsenal=require('../arsenal.js');
const Map=require('../mission-map.js');

const profile=wallet=>({wallet});
test('la armería vende un arma nueva con su munición inicial',()=>{
  const inv=Arsenal.createInventory(),p=profile(2000);
  const result=Armory.buy(p,inv,4);
  assert.equal(result.ok,true);assert.equal(p.wallet,2000-Armory.prices[4]);
  assert.ok(inv.owned.includes(4));assert.equal(inv.ammo[4],Arsenal.weapons[4].ammo);
  assert.equal(Arsenal.selectWeapon(inv,4),true,'el arma comprada se puede equipar');
});
test('con el arma en el equipo se compra munición, más barata y con tope',()=>{
  const inv=Arsenal.createInventory(),p=profile(100000);
  const offer=Armory.offer(inv,3);
  assert.equal(offer.kind,'ammo');assert.equal(offer.have,36);
  for(let i=0;i<10;i++)Armory.buy(p,inv,3);
  assert.equal(inv.ammo[3],Arsenal.weapons[3].ammo*Armory.AMMO_PACKS);
  const before=p.wallet,full=Armory.buy(p,inv,3);
  assert.equal(full.ok,false);assert.equal(p.wallet,before,'no cobra al llegar al tope');
  Armory.buy(p,inv,5);
  assert.ok(Armory.offer(inv,5).cost<Armory.prices[5],'la munición cuesta menos que el arma');
});
test('sin puntos suficientes no cambia nada',()=>{
  const inv=Arsenal.createInventory(),p=profile(100);
  const result=Armory.buy(p,inv,6);
  assert.equal(result.ok,false);assert.equal(p.wallet,100);assert.deepEqual(inv.owned,[1,3]);assert.equal(inv.ammo[6],undefined);
});
test('un arma cuerpo a cuerpo solo se compra una vez',()=>{
  const inv=Arsenal.createInventory(),p=profile(5000);
  assert.equal(Armory.buy(p,inv,2).ok,true);
  const again=Armory.buy(p,inv,2);
  assert.equal(again.ok,false);assert.equal(p.wallet,5000-Armory.prices[2]);
  assert.equal(Armory.offer(inv,2).full,true);
});
test('la armería ofrece todas las armas menos el cuchillo inicial',()=>{
  const offers=Armory.offers(Arsenal.createInventory());
  assert.deepEqual(offers.map(o=>o.slot),[2,3,4,5,6,7,8,9]);
  for(const o of offers){assert.ok(o.cost>0&&o.note.length>10);assert.ok(Object.values(o.stats).every(v=>v>0&&Number.isFinite(v)),o.name);}
  assert.equal(Armory.buy(profile(9999),Arsenal.createInventory(),1).ok,false);
});

test('el mapa tiene tres rutas paralelas y dos bifurcaciones',()=>{
  const {nodes,forks}=Map.graph();
  assert.deepEqual([...new Set(nodes.map(n=>n.lane))].sort(),['land','sea','sky']);
  assert.equal(nodes.filter(n=>n.mission).length,8);
  assert.deepEqual(forks.map(f=>f.choices),[['m3','m4','m5'],['m7','chase','assault']]);
  for(const n of nodes){assert.ok(n.x>=5&&n.x<=95);assert.equal(n.y,Map.lanes.find(l=>l.id===n.lane).y);}
  // Dos mundos nunca comparten sitio.
  assert.equal(new Set(nodes.map(n=>n.x+','+n.y)).size,nodes.length);
});
test('desde la primera misión se llega a la última saltándose mundos de cada bifurcación',()=>{
  const {nodes,edges}=Map.graph(),next=id=>edges.filter(e=>e.from.id===id).map(e=>e.to.id);
  const paths=[];(function walk(id,path){if(id==='m8'){paths.push(path);return;}for(const n of next(id))walk(n,[...path,n]);})('m1',['m1']);
  assert.equal(paths.length,9,'3 rutas en cada bifurcación');
  for(const path of paths){assert.equal(path.length,6);assert.ok(path.includes('m2')&&path.includes('m6'));}
  // Con los mundos ya construidos basta una misión de la primera bifurcación.
  const playable=paths.filter(path=>path.every(id=>!nodes.find(n=>n.id===id).soon));
  assert.deepEqual([...new Set(playable.map(p=>p[2]))].sort(),['m3','m4','m5']);
  assert.deepEqual([...new Set(playable.map(p=>p[4]))].sort(),['assault','chase','m7']);
  for(const e of edges)assert.equal(e.to.col,e.from.col+1,'cada tramo avanza una columna');
});
test('los dos especiales ocupan la segunda bifurcación',()=>{
  const {nodes,edges}=Map.graph(),soon=nodes.filter(n=>n.soon);
  assert.deepEqual(soon,[]);assert.ok(nodes.find(n=>n.id==='assault').special);
  const completed=Map.states(8,nodes,false,true);assert.equal(completed[nodes.findIndex(n=>n.id==='assault')],'done');assert.equal(completed[nodes.findIndex(n=>n.id==='chase')],'open');
  assert.equal(nodes.find(n=>n.id==='chase').special,true);
  for(const n of nodes.filter(n=>n.special)){
    assert.equal(n.col,nodes.find(m=>m.id==='m7').col);
    assert.ok(edges.some(e=>e.from.id==='m6'&&e.to===n&&!e.soon));
    assert.ok(edges.some(e=>e.from===n&&e.to.id==='m8'&&!e.soon));
  }
});
test('el estado del mapa distingue superadas, actual, alternativas y pendientes',()=>{
  const {nodes,edges}=Map.graph(),cleared=[1,2,4],at=level=>Object.fromEntries(Map.states(level,nodes,false,false,!level||level===1?[]:cleared.filter(id=>id!==level)).map((s,i)=>[nodes[i].id,s]));
  assert.deepEqual(at(1),{m1:'current',m2:'open',m3:'open',m4:'open',m5:'open',m6:'open',m7:'open',chase:'open',assault:'open',m8:'open'});
  const fork=at(4);
  assert.equal(fork.m4,'current');assert.equal(fork.m3,'choice');assert.equal(fork.m5,'choice');assert.equal(fork.m2,'done');assert.equal(fork.m6,'open');
  const late=at(6);
  assert.deepEqual([late.m3,late.m4,late.m5,late.m6],['open','done','open','current']);
  assert.equal(at(undefined).m1,'current');assert.equal(at(99).m8,'current');
  const lit=level=>{const list=Map.states(level,nodes,false,false,!level||level===1?[]:cleared.filter(id=>id!==level));return edges.filter(e=>Map.travelled(e,list,nodes)).map(e=>e.from.id+'-'+e.to.id);};
  assert.deepEqual(lit(1),[]);
  assert.deepEqual(lit(4),['m1-m2','m2-m3','m2-m4','m2-m5']);
  assert.ok(!lit(8).some(id=>id.includes('chase')||id.includes('assault')),'los tramos en construcción no se iluminan');
});
test('las curvas del camino unen exactamente sus dos paradas',()=>{
  const {edges}=Map.graph();
  for(const e of edges){const d=Map.route(e.from,e.to);assert.ok(d.startsWith('M'+e.from.x+' '+e.from.y+' C'));assert.ok(d.endsWith(e.to.x+' '+e.to.y));}
});

test('el mapa recuerda las victorias del perfil tras repetir y distingue las rutas solo visitadas',()=>{
  const Campaign=require('../campaign');
  const records=new globalThis.Map();
  const store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
  const save=(name,data)=>store.setItem('cap-dollar.mission-'+name+'.v1',JSON.stringify(data));
  save('three',{ending:false});
  save('four',{road:{complete:true}});
  save('two',{inside:true,king:{defeated:true}});
  save('five',{sea:{complete:false}});
  Campaign.write(store,{level:8});
  assert.deepEqual(Campaign.completedMissions(store),[4]);
  save('four',{road:{complete:false}});
  save('two',{inside:false,king:{defeated:true}});
  Campaign.markCompleted(store,8);
  assert.deepEqual(Campaign.completedMissions(store),[2,4,8]);
  assert.equal(Map.states(8,Map.graph().nodes,false,false,[2,4,8]).at(-1),'done');
});

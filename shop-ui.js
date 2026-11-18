(function(root){
  'use strict';
  // Presentación de la tienda de la misión 01: pestañas, tarjetas con icono,
  // niveles y precios. La lógica de compra sigue en progression.js y armory.js.
  const doc=root.document,money=n=>n.toLocaleString('es-CO');
  const glyphs={
    jump:['....#....','...###...','..#####..','.#######.','...###...','...###...','.........','..#####..','.#######.'],
    jet:['..##.##..','..##.##..','.#######.','.#######.','.#######.','.#######.','..#...#..','.###.###.','..#...#..'],
    life:['.........','.##...##.','####.####','#########','#########','.#######.','..#####..','...###...','....#....'],
    speed:['.....###.','....###..','...###...','..######.','....###..','...###...','..###....','.###.....','.#.......'],
    damage:['#...#...#','.#..#..#.','..#.#.#..','...###...','#########','...###...','..#.#.#..','.#..#..#.','#...#...#'],
    rate:['.#...#...','..#...#..','...#...#.','....#...#','...#...#.','..#...#..','.#...#...','.........','.........'],
    regen:['...###...','...###...','...###...','#########','#########','#########','...###...','...###...','...###...'],
    shield:['#########','#########','#########','#########','.#######.','.#######.','..#####..','...###...','....#....']
  };
  const tints={jump:'#8fe3cf',jet:'#f1c553',life:'#ff8a7a',speed:'#ffe08a',damage:'#ff9f5a',rate:'#b9c8ff',regen:'#a8f0a0',shield:'#9fd0ff'};
  function glyph(canvas,id){const c=canvas.getContext('2d'),map=glyphs[id];if(!map)return false;c.clearRect(0,0,canvas.width,canvas.height);const s=Math.floor(Math.min(canvas.width,canvas.height)/11),ox=Math.floor((canvas.width-9*s)/2),oy=Math.floor((canvas.height-9*s)/2);
    c.fillStyle='#0b141c';map.forEach((line,y)=>[...line].forEach((ch,x)=>{if(ch==='#')c.fillRect(ox+x*s+1,oy+y*s+2,s,s);}));
    c.fillStyle=tints[id]||'#ffd58a';map.forEach((line,y)=>[...line].forEach((ch,x)=>{if(ch==='#')c.fillRect(ox+x*s,oy+y*s,s,s);}));return true;}
  function art(item){const canvas=doc.createElement('canvas');canvas.className='shop-art';canvas.width=72;canvas.height=54;canvas.setAttribute('aria-hidden','true');
    try{if(item.slot)root.ArcadeWeaponRenderer?.pickup(canvas.getContext('2d'),item.slot,36,27);else if(!glyph(canvas,item.id))root.ArcadePowerSprites?.draw(canvas.getContext('2d'),item.id,item.id==='flame'?2:1,36,27,66,48);}catch{}
    return canvas;}
  function el(tag,cls,text){const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function pips(level,max){const row=el('div','shop-pips');row.setAttribute('aria-label','Nivel '+level+' de '+max);for(let i=0;i<max;i++)row.append(el('i',i<level?'on':''));return row;}
  function bar(label,value,top){const row=el('div','shop-stat'),track=el('span','shop-stat-track'),fill=el('i');fill.style.width=Math.round(Math.max(.08,Math.min(1,value/top))*100)+'%';track.append(fill);row.append(el('span','shop-stat-label',label),track);return row;}
  const tabs=[['upgrades','Mejoras','Permanentes para tu perfil'],['powers','Poderes','Tecla G · se recargan solos'],['armory','Armería','Armas y munición de esta misión']];
  let active='upgrades';
  // state: {profile,inventory,catalog,onBuy(id),onEquip(id),onBuyWeapon(slot),flash}
  function render(host,state){
    const {profile,inventory,catalog}=state,wallet=profile.wallet;host.replaceChildren();
    const nav=el('div','shop-tabs');nav.setAttribute('role','tablist');
    for(const [id,label,hint] of tabs){const b=el('button','shop-tab'+(id===active?' active':''));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===active));b.append(el('strong','',label),el('small','',hint));b.onclick=()=>{active=id;render(host,state);host.querySelector('.shop-tab.active')?.focus({preventScroll:true});};nav.append(b);}
    const grid=el('div','shop-grid');host.append(nav,grid);
    const card=(item,{title,meta,body,price,label,disabled,status,tone,onClick})=>{
      const node=el('article','shop-card '+tone+(state.flash===(item.slot?'w'+item.slot:item.id)?' bought':'')),info=el('div','shop-info'),button=el('button','shop-buy');
      info.append(el('strong','',title));if(meta)info.append(meta);info.append(el('p','',body),el('small','shop-availability',status));
      button.type='button';button.disabled=disabled;if(item.id)button.dataset.upgrade=item.id;if(item.slot)button.dataset.weapon=item.slot;
      if(price!==null)button.append(el('span','shop-price','◈ '+money(price)));button.append(el('small','',label));button.onclick=onClick;
      node.append(art(item),info,button);grid.append(node);};
    if(active==='armory'){
      const list=root.ArcadeArmory.offers(inventory),top={damage:Math.max(...list.map(o=>o.stats.damage)),rate:Math.max(...list.map(o=>o.stats.rate)),reach:Math.max(...list.map(o=>o.stats.reach))};
      for(const o of list){const stats=el('div','shop-stats');stats.append(bar('Daño',o.stats.damage,top.damage),bar('Cadencia',o.stats.rate,top.rate),bar('Alcance',o.stats.reach,top.reach));
        const can=wallet>=o.cost;
        card(o,{title:o.name,meta:stats,body:o.note,price:o.full?null:o.cost,label:o.full?(o.pack===null?'En tu equipo':'Munición al máximo'):o.owned?'+'+o.pack+' de munición':'Comprar arma',disabled:o.full||!can,
          status:o.owned?(o.pack===null?'Sin munición · siempre lista':'Tienes '+o.have+' / '+o.limit):o.pack===null?'Cuerpo a cuerpo':'Incluye '+o.pack+' de munición',tone:o.full?'maxed':o.owned?'owned':can?'affordable':'locked',onClick:()=>state.onBuyWeapon(o.slot)});}
      return;
    }
    for(const c of catalog.filter(c=>active==='powers'?c.kind==='power':c.kind!=='power')){
      const level=profile.levels[c.id]||0,owned=profile.owned.includes(c.id),equipped=profile.equipped===c.id,full=c.kind==='upgrade'?level>=c.max:c.kind==='shield'?profile.shield>=10:owned,can=wallet>=c.cost,reward=c.rewardOnly&&!owned;
      const meta=c.kind==='upgrade'?pips(level,c.max):c.kind==='shield'?pips(profile.shield,10):null;
      card(c,{title:c.name,meta,body:c.text,price:owned||full||reward?null:c.cost,label:reward?'Recompensa · Misión 7':owned?(equipped?'Equipado':'Equipar'):full?'Al máximo':'Comprar',disabled:reward||(owned?equipped:full||!can),
        status:reward?'Derrota al Soberano':owned?'Poder adquirido':full?'Mejora completa':can?'Puedes comprarlo':'Te faltan '+money(c.cost-wallet)+' puntos',tone:equipped?'equipped':owned?'owned':full?'maxed':reward?'locked':can?'affordable':'locked',onClick:()=>owned?state.onEquip(c.id):state.onBuy(c.id)});
    }
  }
  root.ArcadeShopUI={render,glyph,get tab(){return active;},set tab(id){if(tabs.some(t=>t[0]===id))active=id;}};
})(typeof window!=='undefined'?window:globalThis);

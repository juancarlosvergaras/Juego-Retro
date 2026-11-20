(function(root){
  'use strict';
  // Armería de la tienda: armas y munición a cambio de puntos. Las armas siguen
  // apareciendo por el nivel; aquí se compra lo que la suerte no dejó en el camino.
  const Arsenal=typeof module!=='undefined'&&module.exports?require('./arsenal.js'):root.ArcadeArsenal;
  const prices={2:600,3:150,4:1200,5:1800,6:2500,7:900,8:1400,9:1600};
  const notes={2:'Golpe lento y contundente. Sin munición.',3:'Fiable y rápida. Tu arma de reserva.',4:'Cinco perdigones en abanico. Letal de cerca.',5:'Fuego automático. Devora la munición.',6:'Explosión en área contra grupos. El impacto directo triplica el daño: pensado para jefes.',7:'Silencioso: no alerta a los enemigos cercanos.',8:'Virotes pesados y precisos. Mucho menos ruidosa que un arma de fuego.',9:'Rebotan y estallan a los 3 s. Cuidado con tus pies.'};
  const AMMO_PACKS=5;
  function ammoCost(slot){return slot===3?prices[3]:Math.max(50,Math.round(prices[slot]*.4/50)*50);}
  function offer(inv,slot){
    const w=Arsenal.weapons[slot];if(!w||!prices[slot])return null;
    const owned=inv.owned.includes(slot),have=inv.ammo[slot]||0,limit=w.ammo===null?null:w.ammo*AMMO_PACKS;
    const full=owned&&(w.ammo===null||have>=limit);
    return{slot,name:w.name,note:notes[slot],owned,full,kind:owned?'ammo':'weapon',cost:owned?ammoCost(slot):prices[slot],pack:w.ammo,have,limit,
      stats:{damage:w.impact||w.damage*(w.pellets||1),rate:1/w.rate,reach:w.range?w.range/8:w.speed*(w.life||1.8)/60}};
  }
  function offers(inv){return [2,3,4,5,6,7,8,9].map(slot=>offer(inv,slot));}
  function buy(profile,inv,slot){
    const o=offer(inv,slot);if(!o)return{ok:false,message:'Arma desconocida.'};
    if(o.full)return{ok:false,message:o.pack===null?'Ya tienes '+o.name.toLowerCase()+'.':'No puedes cargar más munición de '+o.name.toLowerCase()+'.'};
    if(profile.wallet<o.cost)return{ok:false,message:'Faltan '+(o.cost-profile.wallet).toLocaleString('es-CO')+' puntos.'};
    profile.wallet-=o.cost;
    if(!o.owned)inv.owned.push(slot);
    if(o.pack!==null)inv.ammo[slot]=Math.min(o.limit,o.have+o.pack);
    return{ok:true,message:(o.owned?'Munición de '+o.name.toLowerCase():o.name)+' en tu equipo. −'+o.cost.toLocaleString('es-CO')+' puntos.'};
  }
  const api={prices,notes,AMMO_PACKS,offer,offers,buy};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeArmory=api;
})(typeof window!=='undefined'?window:globalThis);

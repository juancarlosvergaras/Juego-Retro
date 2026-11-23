(function(root){
  'use strict';
  const sequences = {
    mixer: ['assets/sprites/fondo-mezcladora-8.webp', 8],
    raven: ['assets/sprites/fondo-cuervos-8.webp', 9],
    plane: ['assets/sprites/fondo-transporte-8.webp', 12],
    pump: ['assets/sprites/fondo-bomba-8.webp', 5],
    manta: ['assets/sprites/fondo-mantarraya-8.webp', 5],
    horse: ['assets/sprites/fondo-caballito-8.webp', 7],
    satellite: ['assets/sprites/fondo-satelite-8.webp', 5],
    steam: ['assets/sprites/fondo-vapor-8.webp', 8],
    forklift: ['assets/sprites/fondo-montacargas-8.webp', 5],
    lighthouse: ['assets/sprites/fondo-faro-8.webp', 6]
  };
  const cache = new Map();
  const strips = {
    derrumbe: 'assets/sprites/suceso-derrumbe-8.webp',
    helicoptero: 'assets/sprites/suceso-helicoptero-8.webp',
    ballena: 'assets/sprites/suceso-ballena-8.webp',
    bolso: 'assets/sprites/suceso-bolso-8.webp',
    lagarto: 'assets/sprites/suceso-lagarto-8.webp',
    casco: 'assets/sprites/suceso-casco-8.webp',
    calavera: 'assets/sprites/suceso-calavera-8.webp',
    gaviota: 'assets/sprites/suceso-gaviota-8.webp',
    rueda: 'assets/sprites/suceso-rueda-8.webp',
    cangrejo: 'assets/sprites/suceso-cangrejo-8.webp',
    aspiradora: 'assets/sprites/suceso-aspiradora-8.webp',
    astronauta: 'assets/sprites/suceso-astronauta-8.webp',
    pizza: 'assets/sprites/suceso-pizza-8.webp',
    voladores: 'assets/sprites/suceso-voladores-8.webp',
    pelicano: 'assets/sprites/suceso-pelicano-8.webp',
  };
  // The speed is in poses per second. A single-action clip holds its last pose.
  const scenes = {
    obra:['casco'], ciudad:['derrumbe'], cementerio:['calavera'], aire:['gaviota'],
    carretera:['helicoptero','rueda'], superficie:['ballena'], lecho:['cangrejo'],
    tiendas:['aspiradora'], espacio:['astronauta'], avenida:['pizza'],
    delta:['voladores'], archipielago:['lagarto'], muelles:['pelicano']
  };
  const motion = {
    casco:[6,6], derrumbe:[3.8,3], calavera:[3.8,4], gaviota:[9,8], helicoptero:[11,9],
    rueda:[9,6], ballena:[4.5,10], cangrejo:[3,4.5], aspiradora:[7,7],
    astronauta:[3,9], pizza:[9,6], voladores:[8,1], lagarto:[5,6], pelicano:[3,4]
  };
  const oneShot=new Set(['derrumbe','calavera','cangrejo','voladores','pelicano']);
  const schedules=new WeakMap();

  // Loading decoration never holds the mission's loading bar. Failed requests back off.
  function sheet(id){
    let entry = cache.get(id);
    if (!entry || entry.failed && Date.now() >= entry.retryAt) {
      const img = new Image();
      entry = {img, ready: false, failed: false, attempts: (entry?.attempts || 0) + 1};
      cache.set(id, entry);
      img.decoding = 'async';
      img.fetchPriority = 'low';
      img.onload = () => {entry.ready = img.naturalWidth > 0 && img.naturalWidth % 8 === 0;};
      img.onerror = () => {
        entry.failed = true;
        entry.retryAt = Date.now() + Math.min(120000, 5000 * 2 ** (entry.attempts - 1));
      };
      img.src = strips[id] || sequences[id][0];
    }
    return entry.ready ? entry.img : null;
  }
  function paint(c,id,frame,center,floor,width,opacity){
    const img=sheet(id);if(!img)return;
    const sw = img.naturalWidth / 8, sh = img.naturalHeight;
    const height = Math.max(1, Math.round(width * sh / sw));
    const alpha = c.globalAlpha;
    c.globalAlpha = alpha * opacity;
    c.drawImage(img, frame * sw, 0, sw, sh,
      Math.round(center - width / 2), Math.round(floor - height), Math.max(1, Math.round(width)), height);
    c.globalAlpha = alpha;
  }
  function draw(c,id,time,center,floor,width,opacity=1,phase=0){
    paint(c,id,Math.floor(time*sequences[id][1]+phase)%8,center,floor,width,opacity);
  }

  function next(owner,scene,time){
    let states=schedules.get(owner);
    if(!states){states=new Map();schedules.set(owner,states);}
    let s=states.get(scene);
    if(!s||time<s.last){
      const delay=scene==='tiendas'?10+Math.random()*8:1.2+Math.random()*3;
      s={last:time,delay,bag:[],active:null,previous:null};
      states.set(scene,s);
    }
    const elapsed=time-s.last;s.last=time;
    // Pausing, loading a save, or visiting another floor does not advance a gag offscreen.
    const dt=elapsed<=.5?elapsed:0;
    if(!s.active){
      if(!s.bag.length){
        s.bag=scenes[scene].slice();
        if(s.previous){s.bag.sort((a,b)=>Number(a===s.previous)-Number(b===s.previous));}
      }
      const id=s.bag.shift();
      s.active={id,age:0,frame:0,u:0,alpha:1,seed:Math.random(),anchor:null};
    }
    const e=s.active,building=e.id==='derrumbe';
    if(!sheet(e.id))return null;
    if(s.delay>0){s.delay-=dt;return building?e:null;}
    const [fps,duration]=motion[e.id];
    e.age=Math.min(duration,e.age+dt);e.u=e.age/duration;
    const tick=Math.floor(e.age*fps);
    e.frame=oneShot.has(e.id)?Math.min(7,tick):tick%8;
    e.alpha=building||scene==='carretera'?1:Math.min(1,e.age*3,(duration-e.age)*3);
    if(e.age>=duration&&!building){
      s.previous=e.id;s.active=null;s.delay=7+Math.random()*11;return null;
    }
    return e;
  }
  // Stationary props use the same parallax as their supporting surface.
  function place(c,e,scroll,floor,span,width,opacity=1,travel=0){
    if(!e)return;
    if(e.anchor===null)e.anchor=scroll+span*(.28+.46*e.seed);
    const x=e.anchor-scroll+(e.u-.5)*travel;
    if(x+width/2<0||x-width/2>span)return;
    paint(c,e.id,e.frame,x,floor,width,opacity*e.alpha);
  }

  // Both highway visitors face right. Leave a whole frame beyond either edge,
  // so the scheduler can retire them without a visible cut, even during turbo.
  function cross(c,e,floor,span,width,opacity=1){
    const margin=width/2+4;
    paint(c,e.id,e.frame,-margin+e.u*(span+2*margin),floor,width,opacity);
  }

  // The wrap happens beyond the edge, including room for a whole flock to exit.
  function pass(distance, span, margin){
    return ((distance % (span + 2 * margin)) + span + 2 * margin) % (span + 2 * margin) - margin;
  }
  root.ArcadeSceneryAnimation = {draw, pass, next, place, cross, sheet, paint};
})(typeof window === 'undefined' ? globalThis : window);

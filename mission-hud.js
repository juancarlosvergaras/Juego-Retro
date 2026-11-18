(function(root){
'use strict';
function create({player,encounter,profile,powers,canvas,score,audio,onSelect,onPower,onCycle,onPersist}){
 const ui=Object.fromEntries(['weapon-slots','weapon-name','ammo-count','ammo-unit','jumps','health','health-fill'].map(id=>[id,document.getElementById(id)]));
 const wheel=document.getElementById('power-wheel');let wheelKey='',blocked=true;
 const sound=document.getElementById('sound-toggle'),volume=document.getElementById('sound-volume');
 function soundUI(){const s=audio.status();sound.disabled=!s.supported;sound.textContent=s.muted||!s.volume?'♫ Silencio':'♫ Sonido';sound.setAttribute('aria-pressed',String(!s.muted&&s.volume>0));volume.value=Math.round(s.volume*100);document.getElementById('sound-level').textContent=volume.value+'%';}
 sound.onclick=async()=>{await audio.unlock();audio.setMuted(!audio.status().muted);soundUI();};
 volume.oninput=()=>{audio.unlock();audio.setVolume(Number(volume.value)/100);audio.setMuted(false);soundUI();};
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>audio.unlock(),{once:true,capture:true});soundUI();
 const persist=()=>onPersist(),powerList=()=>[...profile.owned,...(player.shield>0?['shield']:[])],useFront=()=>onPower(),cyclePower=()=>onCycle();
 for(let slot=1;slot<=9;slot++){
  const button=document.createElement('button');button.type='button';button.dataset.slot=slot;
  button.innerHTML='<b class="slot-number">'+slot+'</b><canvas class="weapon-icon" width="44" height="34" aria-hidden="true"></canvas><span class="slot-name">'+ArcadeArsenal.weapons[slot].name+'</span><small class="slot-ammo"></small>';
  ArcadeWeaponRenderer.pickup(button.querySelector('canvas').getContext('2d'),slot,22,17);
  button.onclick=()=>{if(!blocked)onSelect(slot);canvas.focus({preventScroll:true});};ui['weapon-slots'].append(button);
 }
 document.getElementById('show-shop').onclick=()=>{const shop=document.getElementById('shop');shop.hidden=!shop.hidden;if(!shop.hidden)drawShop();};
  function drawPowerWheel(){
    const list=powerList();if(!list.includes(profile.equipped))profile.equipped=list[0]||null;
    const key=list.join(',')||'empty';
    if(key!==wheelKey){wheelKey=key;wheel.replaceChildren();const cards=document.createElement('div');cards.className='power-cards';
      for(const [i,id] of list.entries()){const c=ArcadeProgression.catalog.find(c=>c.id===id),button=document.createElement('button'),art=document.createElement('canvas'),name=document.createElement('strong'),status=document.createElement('span'),meter=document.createElement('i');let offset=(i-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;
        button.className='power-card'+(offset===0?' front':'');button.dataset.power=id;button.style.setProperty('--offset',offset);button.style.zIndex=String(10-Math.abs(offset));button.hidden=Math.abs(offset)>2;button.setAttribute('aria-label',c.name);button.setAttribute('aria-pressed',offset===0?'true':'false');button.tabIndex=offset===0?0:-1;art.width=72;art.height=46;ArcadePowerSprites.draw(art.getContext('2d'),id,id==='flame'?2:1,36,23,65,44);name.textContent=c.name;status.className='power-wait';meter.className='power-ready';button.append(art,name,status,meter);button.onclick=()=>{if(blocked)return;if(profile.equipped===id)useFront();else{profile.equipped=id;persist();}canvas.focus({preventScroll:true});};cards.append(button);
      }
      if(!list.length){cards.className+=' empty';cards.textContent='Compra poderes en ESC';}
      const controls=document.createElement('button');controls.className='power-cycle';controls.textContent='H · Girar   /   G · Usar';controls.onclick=()=>{if(!blocked)cyclePower();canvas.focus({preventScroll:true});};wheel.append(cards,controls);
    }
    for(const card of wheel.querySelectorAll('.power-card')){const id=card.dataset.power;let offset=(list.indexOf(id)-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;card.style.setProperty('--offset',offset);card.style.zIndex=String(10-Math.abs(offset));card.hidden=Math.abs(offset)>2;card.classList.toggle('front',offset===0);card.tabIndex=offset===0?0:-1;card.setAttribute('aria-pressed',offset===0?'true':'false');const c=ArcadeProgression.catalog.find(c=>c.id===id),wait=powers.cooldowns[id]||0;card.querySelector('.power-wait').textContent=id==='shield'?player.shield+'/10 · ACTIVO':id==='flame'&&(player.form==='wolf'||player.form==='zombie')?'SOLO SOLDADO':wait?wait.toFixed(1)+' s':'LISTO';card.querySelector('.power-ready').style.width=(id==='shield'?player.shield*10:100*(1-wait/(c.cooldown||1)))+'%';card.classList.toggle('cooling',wait>0);}
  }
  function drawShop(){
    document.getElementById('shop-balance').textContent=profile.wallet.toLocaleString('es-CO')+' puntos disponibles';
    document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
    const list=document.getElementById('shop-list');list.replaceChildren();
    for(const c of ArcadeProgression.catalog){
      const row=document.createElement('article'),title=document.createElement('strong'),desc=document.createElement('p'),availability=document.createElement('small'),button=document.createElement('button');
      const level=profile.levels[c.id]||0,owned=profile.owned.includes(c.id),full=c.kind==='upgrade'?level>=c.max:c.kind==='shield'?profile.shield>=10:owned;
      title.textContent=c.name+(c.kind==='upgrade'?' · '+level+'/'+c.max:c.kind==='shield'?' · '+profile.shield+'/10':'');desc.textContent=c.text;
      button.textContent=owned?(profile.equipped===c.id?'Equipado':'Equipar'):full?'Máximo':'Comprar · '+c.cost.toLocaleString('es-CO')+' ptos';
      availability.className='shop-availability';availability.textContent=owned?'Poder adquirido':full?'Mejora completa':profile.wallet>=c.cost?'Puedes comprarlo':'Te faltan '+(c.cost-profile.wallet).toLocaleString('es-CO')+' puntos';
      if(c.rewardOnly&&!owned){button.textContent='Derrota al Soberano';availability.textContent='Recompensa · Misión 7';}
      button.dataset.upgrade=c.id;
      button.disabled=owned?profile.equipped===c.id:full||profile.wallet<c.cost||!!c.rewardOnly;
      button.onclick=()=>{if(owned){profile.equipped=c.id;persist();drawShop();return;}
        const result=ArcadeProgression.buy(profile,c.id);document.getElementById('shop-message').textContent=result.message;
        if(result.ok){ArcadeProgression.apply(profile,player,encounter);persist();drawShop();}
      };row.append(title,desc,availability,button);list.append(row);
    }
  }

 function update(locked,arrival=false){
  blocked=locked;root.ArcadeMobile?.update(player,encounter,profile,powers,(locked&&!arrival)||encounter.dead,arrival);const inv=encounter.inventory,w=ArcadeArsenal.weapons[inv.selected],isWolf=player.form==='wolf',isZombie=player.form==='zombie',unarmed=isWolf||isZombie||player.form==='tank'||player.form==='fighter';
  document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
  ui['weapon-name'].textContent=isZombie?'ZOMBI · J Rayos / L Plasma':isWolf?(player.ram?'LOBO · Embestida':player.wolfAttack?'LOBO · '+(player.wolfAttack.stage===3?'REMATE':player.wolfAttack.kind==='kick'?'Patada':'Zarpazo')+' '+player.wolfAttack.stage+'/3':'LOBO · Zarpazos'):inv.selected+' · '+w.name;if(player.form==='robot')ui['weapon-name'].textContent='ROBOT · '+w.name+' + '+ArcadeArsenal.weapons[window.ArcadeRobotForm.secondary(inv)].name;ui['ammo-count'].textContent=unarmed||w.ammo===null?'∞':inv.ammo[inv.selected]||0;ui['ammo-unit'].textContent=isZombie?'RAYOS SIN MUNICIÓN':isWolf||w.ammo===null?'CUERPO A CUERPO':inv.selected===6?'MISILES':inv.selected===7?'FLECHAS':inv.selected===8?'VIROTES':inv.selected===9?'GRANADAS':'BALAS';
  if(player.form==='tank'){ui['weapon-name'].textContent=player.submersible?'MINI SUBMARINO · TORPEDO':'MINI TANQUE · SÚPER CAÑÓN';ui['ammo-unit'].textContent='RECARGA AUTOMÁTICA';}if(player.form==='fighter'){ui['weapon-name'].textContent='LUCHADOR · COMBO J / PATADA L';ui['ammo-unit'].textContent='CUERPO A CUERPO';}
  for(const button of ui['weapon-slots'].children){const slot=Number(button.dataset.slot),owned=inv.owned.includes(slot);button.disabled=blocked||unarmed||!owned;button.classList.toggle('locked',!owned);button.classList.toggle('selected',!unarmed&&slot===inv.selected);button.setAttribute('aria-pressed',String(!unarmed&&slot===inv.selected));const ammo=owned?(ArcadeArsenal.weapons[slot].ammo===null?'∞':String(inv.ammo[slot]||0)):'—';button.querySelector('.slot-ammo').textContent=ammo;button.setAttribute('aria-label',slot+' · '+ArcadeArsenal.weapons[slot].name+(owned?' · '+ammo+' disponibles':' · Sin recoger'));}
  ui.jumps.textContent=Array.from({length:player.maxJumps||2},(_,i)=>i<player.jumps?'○':'●').join(' ');ui.jumps.setAttribute('aria-label',(Math.max(0,player.maxJumps-player.jumps))+' de '+player.maxJumps+' saltos disponibles');
  ui.health.textContent=encounter.hp+' / '+encounter.maxHp;ui['health-fill'].style.width=(100*encounter.hp/encounter.maxHp)+'%';ui['health-fill'].parentElement.setAttribute('aria-valuenow',encounter.hp);ui['health-fill'].parentElement.setAttribute('aria-valuemax',encounter.maxHp);
  document.getElementById('fuel-value').textContent=unarmed||player.form==='robot'?'JETPACK · SOLO SOLDADO':(player.jetpackMk2?'MK II ×2 · ':'GASOLINA · ')+Math.round(player.fuel/player.fuelMax*100)+'%';document.getElementById('fuel-meter').value=player.fuel/player.fuelMax*100;
  drawPowerWheel();for(const b of wheel.querySelectorAll('button'))b.disabled=blocked;
  const c=ArcadeProgression.catalog.find(c=>c.id===profile.equipped),wait=powers.cooldowns[profile.equipped]||0;document.getElementById('power-status').textContent=(c?'G · '+c.name+(wait?' · '+Math.ceil(wait)+' s':' · LISTO'):'G · Sin poder equipado')+' | ESC: tienda · Escudo '+(player.shield||0)+'/10';
 }
 return{update,drawShop};
}
root.ArcadeMissionHud={create};
})(window);

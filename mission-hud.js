(function(root){
'use strict';
function updateLoadout(ui,player,inv,locked){
 const arsenal=ArcadeArsenal.weapons,weapon=arsenal[inv.selected];
 const form=player.form||'soldier',usesInventory=form==='soldier'||form==='robot';
 let name=inv.selected+' · '+weapon.name,unit='BALAS';
 if(weapon.ammo===null)unit='CUERPO A CUERPO';
 else unit=({6:'MISILES',7:'FLECHAS',8:'VIROTES',9:'GRANADAS'})[inv.selected]||unit;
 switch(form){
 case 'robot':{
   const secondary=root.ArcadeRobotForm.secondary(inv);
   name='ROBOT · '+weapon.name+' + '+(arsenal[secondary]?.name||'Sin arma');break;
 }
 case 'wolf':{
   const combo=player.wolfAttack;
   name='LOBO · '+(player.ram?'Embestida':combo?(combo.stage===3?'REMATE':combo.kind==='kick'?'Patada':'Zarpazo')+' '+combo.stage+'/3':'Zarpazos');
   unit='CUERPO A CUERPO';break;
 }
 case 'zombie':name='ZOMBI · J Rayos / L Plasma';unit='RAYOS SIN MUNICIÓN';break;
 case 'hero':name='CENTELLA · RAYOS OCULARES';unit='F · VUELO LIBRE';break;
 case 'fighter':name='LUCHADOR · COMBO J / PATADA L';unit='CUERPO A CUERPO';break;
 case 'tank':name=player.submersible?'MINI SUBMARINO · TORPEDO':'MINI TANQUE · SÚPER CAÑÓN';unit='RECARGA AUTOMÁTICA';break;
 }
 ui['weapon-name'].textContent=name;ui['ammo-unit'].textContent=unit;
 ui['ammo-count'].textContent=usesInventory&&weapon.ammo!==null?String(inv.ammo[inv.selected]||0):'∞';
 for(const button of ui['weapon-slots'].children){
   const slot=Number(button.dataset.slot),owned=inv.owned.includes(slot),available=ArcadeArsenal.canEquip(form,slot);
   const ammo=owned?(arsenal[slot].ammo===null?'∞':String(inv.ammo[slot]||0)):'—';
   const selected=available&&slot===inv.selected;
   button.disabled=locked||!available||!owned;
   button.classList.toggle('locked',!owned);button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));button.querySelector('.slot-ammo').textContent=ammo;
   button.setAttribute('aria-label',slot+' · '+arsenal[slot].name+(owned?' · '+ammo+' disponibles':' · Sin recoger'));
   button.title=!owned?'Sin recoger':!available?'Esta forma usa otro ataque':arsenal[slot].ammo===null?'No necesita munición':ammo+' restantes';
 }
}
function create({player,encounter,profile,powers,canvas,score,audio,onSelect,onPower,onCycle,onPersist}){
 const ui=Object.fromEntries(['weapon-slots','weapon-name','ammo-count','ammo-unit','jumps','health','health-fill'].map(id=>[id,document.getElementById(id)]));
 const wheel=document.getElementById('power-wheel');let wheelKey='',blocked=true;
 const hitFeedback=root.ArcadeEncounter?.createHitFeedback?.();
 const sound=document.getElementById('sound-toggle'),volume=document.getElementById('sound-volume');
 function soundUI(){const s=audio.status();sound.disabled=!s.supported;sound.textContent=s.muted||!s.volume?'♫ Silencio':'♫ Sonido';sound.setAttribute('aria-pressed',String(!s.muted&&s.volume>0));volume.value=Math.round(s.volume*100);document.getElementById('sound-level').textContent=volume.value+'%';}
 sound.onclick=async()=>{const was=audio.status();await audio.unlock();audio.setMuted(was.unlocked&&!was.muted&&was.volume>0);if(!was.volume)audio.setVolume(.55);soundUI();};
 volume.oninput=()=>{audio.unlock();audio.setVolume(Number(volume.value)/100);audio.setMuted(false);soundUI();};
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{if(e.target!==sound)audio.unlock();},{once:true,capture:true});soundUI();
 const persist=()=>onPersist(),powerList=()=>[...profile.owned,...(player.shield>0?['shield']:[])],useFront=()=>onPower(),cyclePower=()=>onCycle();
 for(let slot=1;slot<=9;slot++){
  const button=document.createElement('button');button.type='button';button.dataset.slot=slot;
  button.innerHTML='<b class="slot-number">'+slot+'</b><canvas class="weapon-icon" width="44" height="34" aria-hidden="true"></canvas><span class="slot-name">'+ArcadeArsenal.weapons[slot].name+'</span><small class="slot-ammo"></small>';
  ArcadeWeaponRenderer.pickup(button.querySelector('canvas').getContext('2d'),slot,22,17);
  button.onclick=()=>{if(!blocked)onSelect(slot);canvas.focus({preventScroll:true});};ui['weapon-slots'].append(button);
 }
 const shopButton=document.getElementById('show-shop');if(shopButton)shopButton.onclick=()=>{const shop=document.getElementById('shop');shop.hidden=!shop.hidden;if(!shop.hidden)drawShop();};
  function drawPowerWheel(){
    const list=powerList();if(!list.includes(profile.equipped))profile.equipped=list[0]||null;
    const key=list.join(',')||'empty';
    if(key!==wheelKey){wheelKey=key;wheel.replaceChildren();const cards=document.createElement('div');cards.className='power-cards';
      for(const [i,id] of list.entries()){const c=ArcadeProgression.catalog.find(c=>c.id===id),button=document.createElement('button'),art=document.createElement('canvas'),name=document.createElement('strong'),status=document.createElement('span'),meter=document.createElement('i');let offset=(i-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;
        button.className='power-card'+(offset===0?' front':'');button.dataset.power=id;button.style.setProperty('--offset',offset);button.style.zIndex=String(10-Math.abs(offset));button.hidden=Math.abs(offset)>2;button.setAttribute('aria-label',c.name);button.setAttribute('aria-pressed',offset===0?'true':'false');button.tabIndex=offset===0?0:-1;art.width=72;art.height=46;ArcadePowerSprites.draw(art.getContext('2d'),id,id==='flame'?2:1,36,23,65,44);name.textContent=c.name;status.className='power-wait';meter.className='power-ready';button.append(art,name,status,meter);button.onclick=()=>{if(blocked)return;if(profile.equipped===id)useFront();else{profile.equipped=id;persist();}canvas.focus({preventScroll:true});};cards.append(button);
      }
      if(!list.length){cards.className+=' empty';cards.textContent=shopButton?'Compra poderes en ESC':'Sin poderes adquiridos';}
      const controls=document.createElement('button');controls.className='power-cycle';controls.textContent='H · Girar   /   G · Usar';controls.onclick=()=>{if(!blocked)cyclePower();canvas.focus({preventScroll:true});};wheel.append(cards,controls);
    }
    for(const card of wheel.querySelectorAll('.power-card')){const id=card.dataset.power;let offset=(list.indexOf(id)-list.indexOf(profile.equipped)+list.length)%list.length;if(offset>list.length/2)offset-=list.length;card.style.setProperty('--offset',offset);card.style.zIndex=String(10-Math.abs(offset));card.hidden=Math.abs(offset)>2;card.classList.toggle('front',offset===0);card.tabIndex=offset===0?0:-1;card.setAttribute('aria-pressed',offset===0?'true':'false');const c=ArcadeProgression.catalog.find(c=>c.id===id),wait=powers.cooldowns[id]||0;card.querySelector('.power-wait').textContent=id==='cloak'&&player.cloak>0?'OCULTO · '+Math.ceil(player.cloak)+' s':id==='shield'?player.shield+'/10 · ACTIVO':id==='flame'&&(player.form==='wolf'||player.form==='zombie')?'SOLO SOLDADO':wait?wait.toFixed(1)+' s':'LISTO';card.querySelector('.power-ready').style.width=(id==='shield'?player.shield*10:100*(1-wait/(c.cooldown||1)))+'%';card.classList.toggle('cooling',wait>0);}
  }
  let shopFlash=null;
  function drawShop(){
    // Si la misión no paga el 100 % (repetida o por dificultad), la tienda lo dice junto al saldo.
    const rewardNote=ArcadeProgression.rewardNote?.()||'';
    document.getElementById('shop-balance').textContent=profile.wallet.toLocaleString('es-CO')+' puntos disponibles'+(rewardNote?' · '+rewardNote:'');
    document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
    // Missions that load the illustrated shop share mission one's tabs, cards and armoury.
    if(root.ArcadeShopUI&&root.ArcadeArmory){const say=text=>{document.getElementById('shop-message').textContent=text;};
      root.ArcadeShopUI.render(document.getElementById('shop-list'),{profile,inventory:encounter.inventory,catalog:ArcadeProgression.catalog,flash:shopFlash,
        onEquip(id){profile.equipped=id;persist();shopFlash=null;drawShop();},
        onBuy(id){const result=ArcadeProgression.buy(profile,id);say(result.message);if(result.ok){ArcadeProgression.apply(profile,player,encounter);persist();audio?.play('pickup',{gain:.5});shopFlash=id;}drawShop();},
        onBuyWeapon(slot){const result=root.ArcadeArmory.buy(profile,encounter.inventory,slot);say(result.message);if(result.ok){persist();audio?.play('pickup',{gain:.5});shopFlash='w'+slot;}drawShop();}});
      shopFlash=null;return;}
    const list=document.getElementById('shop-list');list.replaceChildren();
    for(const c of ArcadeProgression.catalog){
      const row=document.createElement('article'),title=document.createElement('strong'),desc=document.createElement('p'),availability=document.createElement('small'),button=document.createElement('button');
      const level=profile.levels[c.id]||0,owned=profile.owned.includes(c.id),full=c.kind==='upgrade'?level>=c.max:c.kind==='shield'?profile.shield>=10:owned;
      title.textContent=c.name+(c.kind==='upgrade'?' · '+level+'/'+c.max:c.kind==='shield'?' · '+profile.shield+'/10':'');desc.textContent=c.text;
      button.textContent=owned?(profile.equipped===c.id?'Equipado':'Equipar'):full?'Máximo':'Comprar · '+c.cost.toLocaleString('es-CO')+' ptos';
      availability.className='shop-availability';availability.textContent=owned?'Poder adquirido':full?'Mejora completa':profile.wallet>=c.cost?'Puedes comprarlo':'Te faltan '+(c.cost-profile.wallet).toLocaleString('es-CO')+' puntos';
      if(c.rewardOnly&&!owned){button.textContent=c.rewardHint||'Derrota al Soberano';availability.textContent=c.rewardLabel||'Recompensa · Misión 7';}
      button.dataset.upgrade=c.id;
      button.disabled=owned?profile.equipped===c.id:full||profile.wallet<c.cost||!!c.rewardOnly;
      button.onclick=()=>{if(owned){profile.equipped=c.id;persist();drawShop();return;}
        const result=ArcadeProgression.buy(profile,c.id);document.getElementById('shop-message').textContent=result.message;
        if(result.ok){ArcadeProgression.apply(profile,player,encounter);persist();drawShop();}
      };row.append(title,desc,availability,button);list.append(row);
    }
  }

 function update(locked,arrival=false){
  ArcadeProgression.showLives(document,profile);blocked=locked;root.ArcadeMobile?.update(player,encounter,profile,powers,(locked&&!arrival)||encounter.dead,arrival);
  document.getElementById('score-value').textContent=profile.wallet.toLocaleString('es-CO');
  updateLoadout(ui,player,encounter.inventory,blocked);
  ui.jumps.textContent=Array.from({length:player.maxJumps||2},(_,i)=>i<player.jumps?'○':'●').join(' ');ui.jumps.setAttribute('aria-label',(Math.max(0,player.maxJumps-player.jumps))+' de '+player.maxJumps+' saltos disponibles');
  ui.health.textContent=String(encounter.hp).replace('.',',')+' / '+encounter.maxHp;ui['health-fill'].style.width=(100*encounter.hp/encounter.maxHp)+'%';ui['health-fill'].parentElement.setAttribute('aria-valuenow',encounter.hp);ui['health-fill'].parentElement.setAttribute('aria-valuemax',encounter.maxHp);
  // Golpe recibido: sacudida breve del lienzo y destello del marcador de salud.
  hitFeedback?.update(encounter,canvas,ui.health.parentElement);
  document.getElementById('fuel-value').textContent=(player.form||'soldier')!=='soldier'?'JETPACK · SOLO SOLDADO':(player.jetpackMk2?'MK II ×2 · ':'GASOLINA · ')+Math.round(player.fuel/player.fuelMax*100)+'%';document.getElementById('fuel-meter').value=player.fuel/player.fuelMax*100;
  drawPowerWheel();for(const b of wheel.querySelectorAll('button'))b.disabled=blocked;
  const c=ArcadeProgression.catalog.find(c=>c.id===profile.equipped),wait=powers.cooldowns[profile.equipped]||0;document.getElementById('power-status').textContent=(c?'G · '+c.name+(wait?' · '+Math.ceil(wait)+' s':' · LISTO'):'G · Sin poder equipado')+' | ESC: tienda · Escudo '+(player.shield||0)+'/10';
 }
 return{update,drawShop};
}
root.ArcadeMissionHud={create,updateLoadout};
})(window);

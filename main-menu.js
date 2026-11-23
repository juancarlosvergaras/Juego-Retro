(function(root){
  'use strict';
  // Menú único: la misma capa sirve de portada y de pausa. El marcado lo genera
  // menu-shell.js; aquí viven la navegación y el enlace con cada misión.
  const PAUSED='Partida en pausa';
  const pages={2:'level-two.html',3:'level-three.html',4:'level-four.html',5:'level-five.html',6:'level-six.html',7:'level-seven.html',8:'level-eight.html',9:'level-nine.html',10:'level-ten.html'};
  function create({onPlay,onPause,onNewGame,soundControls,onSound,difficulty='normal',onDifficulty,tutorial,hasShop=true,mission=1,resumeAvailable=false,onSelectMission}){
    const layer=document.getElementById('main-menu');
    if(!layer)return null;
    const byId=id=>document.getElementById(id);
    const menuPages=Array.from(layer.querySelectorAll('[data-menu-page]'));
    const play=byId('menu-play'),back=byId('menu-back');
    const shopButton=byId('menu-shop'),restartButton=byId('menu-restart'),developerButton=byId('menu-developer');
    const surfaces=Array.from(document.querySelectorAll('body > header,body > main,body > footer'));
    surfaces.forEach(el=>el.inert=true);
    let started=false,ready=false,page='home',loader=null,busy=false,fromOverlay=false,confirmRestart=false;
    // Panel de estado de la misión (carga, caída, victoria). La pausa ya no se
    // muestra en él: abre este menú.
    const live=typeof layer.contains==='function';
    const overlay=live?(byId('overlay')||byId('level-two-menu')):null;
    const overlayTitle=overlay?.querySelector('h2');
    const plainPause=()=>!!overlay&&!overlay.hidden&&overlayTitle?.textContent.trim()===PAUSED;
    function readCampaign(){try{return root.ArcadeCampaign?.read(root.ArcadeDeveloperMode?.storage(localStorage)||localStorage);}catch{return null;}}
    async function prepare(){if(busy)return false;if(!loader)return true;busy=true;play.disabled=true;try{return await loader()!==false;}finally{busy=false;play.disabled=!ready;}}
    byId('menu-sound').append(soundControls);
    const tutorialToggle=byId('tutorial-enabled'),tutorialReset=byId('tutorial-reset');
    if(tutorialToggle&&tutorial){
      tutorialToggle.checked=tutorial.state.enabled;
      tutorialToggle.onchange=()=>{const saved=tutorial.setEnabled(tutorialToggle.checked);byId('settings-message').textContent=(tutorialToggle.checked?'Tutorial activado. Las ayudas aparecerán al avanzar.':'Tutorial desactivado. No se mostrarán ayudas.')+(saved?'':' La preferencia solo durará esta sesión.');};
      tutorialReset.onclick=()=>{tutorial.reset();byId('settings-message').textContent=tutorial.state.enabled?'Ayudas reiniciadas. Volverán a aparecer cuando las necesites.':'Ayudas reiniciadas. Activa el tutorial para mostrarlas.';};
    }
    const difficultyChoices=byId('difficulty-choices');
    if(difficultyChoices&&root.ArcadeDifficulty){
      const description=byId('difficulty-description');
      const refresh=()=>{difficultyChoices.querySelectorAll('input').forEach(input=>input.checked=input.value===difficulty);description.textContent=root.ArcadeDifficulty.get(difficulty).text;};
      for(const level of root.ArcadeDifficulty.levels){
        const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');
        input.type='radio';input.name='difficulty';input.value=level.id;name.textContent=level.name;
        input.onchange=()=>{if(!input.checked)return;difficulty=level.id;const saved=onDifficulty?.(difficulty);refresh();byId('settings-message').textContent=saved===false?'Dificultad aplicada. Este navegador solo permite conservarla durante esta sesión.':'Dificultad '+level.name+' aplicada y guardada.';};
        label.append(input,name);difficultyChoices.append(label);
      }
      refresh();
    }
    const help=byId('shortcuts').cloneNode(true);help.removeAttribute('id');help.hidden=false;
    byId('menu-help').append(help);
    // La tienda vive en el menú: se traslada el panel que cada misión ya dibuja.
    function openShop(){
      const shop=byId('shop'),host=byId('menu-shop-host'),toggle=byId('show-shop');
      if(!shop||!host||!toggle)return;
      if(shop.parentElement!==host)host.append(shop);
      if(shop.hidden)toggle.click();
    }
    function resetRestart(){confirmRestart=false;if(restartButton)restartButton.textContent='Reiniciar misión';}
    function show(next='home'){
      if(layer.hidden)fromOverlay=started&&!!overlay&&!overlay.hidden&&!plainPause();
      page=next;layer.hidden=false;surfaces.forEach(el=>el.inert=true);onPause();root.ArcadeProfiles?.refresh();
      menuPages.forEach(el=>el.hidden=el.dataset.menuPage!==next);
      const campaign=readCampaign();
      back.hidden=next==='home';play.textContent=started||resumeAvailable||campaign?.level>=2?'Continuar':'Jugar';play.disabled=!ready;
      if(shopButton)shopButton.hidden=!started||!(typeof hasShop==='function'?hasShop():hasShop);
      if(restartButton)restartButton.hidden=!started;
      resetRestart();
      layer.classList?.toggle('in-game',started);
      if(started&&ready)byId('menu-loading').textContent='Partida en pausa. Tu progreso está guardado.';
      if(next==='shop')openShop();
      (next==='home'?play:back).focus({preventScroll:true});
    }
    function close(){layer.hidden=true;surfaces.forEach(el=>el.inert=false);}
    play.onclick=async()=>{
      if(!ready||busy)return;
      const campaign=readCampaign();
      if(!started&&campaign?.level!==mission&&pages[campaign?.level]){location.assign(pages[campaign.level]+'?entry=resume');return;}
      if(!await prepare())return;
      // Abierto desde el panel de caída de la misión 1: se vuelve a ese panel.
      if(started&&fromOverlay&&mission===1&&overlay){fromOverlay=false;close();overlay.hidden=false;overlay.querySelector('#resume')?.focus({preventScroll:true});return;}
      fromOverlay=false;started=true;close();onPlay();
    };
    layer.querySelector('[data-start-level="1"]')?.addEventListener('click',async()=>{if(!ready||busy)return;onSelectMission?.(1);try{root.ArcadeCampaign?.write(root.ArcadeDeveloperMode?.storage(localStorage)||localStorage,{level:1});}catch{}if(mission!==1){location.assign('index.html?entry=select');return;}if(!await prepare())return;started=true;close();onNewGame?.();});
    layer.querySelectorAll('[data-open-menu]').forEach(button=>button.onclick=()=>show(button.dataset.openMenu));
    back.onclick=()=>show('home');
    byId('menu-exit').onclick=()=>{onSound();show('exit');};
    byId('menu-return').onclick=()=>show('home');
    byId('menu-fullscreen').onclick=async()=>{
      const notice=byId('settings-message');
      try{notice.textContent=await root.ArcadeTouchScreen.toggle();}
      catch{notice.textContent='Tu navegador no permite cambiar a pantalla completa.';}
    };
    if(restartButton)restartButton.onclick=()=>{
      if(!started)return;
      if(!confirmRestart){confirmRestart=true;restartButton.textContent='¿Reiniciar la misión? Pulsa otra vez para confirmar';return;}
      resetRestart();fromOverlay=false;close();byId('restart')?.click();
    };
    if(developerButton)developerButton.onclick=()=>{
      show('settings');
      const panel=live?layer.querySelector('.developer-settings'):null;
      panel?.scrollIntoView?.({block:'center'});byId('developer-toggle')?.focus?.({preventScroll:true});
    };
    layer.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(page!=='home')show('home');else if(started&&!e.repeat)play.onclick();return;}
      if(e.key!=='Tab')return;
      const buttons=Array.from(layer.querySelectorAll('button,input,a[href]')).filter(b=>!b.disabled&&!b.closest('[hidden]'));
      const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    if(overlay&&root.MutationObserver){
      overlay.classList.add('menu-unified');
      const open=byId('open-main-menu'),toggle=byId('show-shop');
      if(developerButton&&!layer.querySelector('.developer-settings'))developerButton.hidden=true;
      // En el panel de estado queda un único acceso al menú.
      if(open&&toggle){open.textContent='Menú · Tienda · Ajustes';toggle.after(open);toggle.hidden=true;}
      // Cualquier pausa (ESC, botón Menú, mando o pérdida de foco) abre este menú.
      new root.MutationObserver(()=>{if(layer.hidden&&plainPause())show();})
        .observe(overlay,{attributes:true,attributeFilter:['hidden'],subtree:true,childList:true,characterData:true});
    }
    return {defer(load){loader=load;ready=true;byId('menu-loading').textContent='Elige tu perfil y comienza la partida.';show(root.location?.search&&new URLSearchParams(root.location.search).get('menu')==='levels'?'levels':'home');},show,isOpen:()=>!layer.hidden,ready({autoPlay=false}={}){ready=true;byId('menu-loading').textContent='La cacería comienza contigo.';if(autoPlay){started=true;close();onPlay();}else show();},fail(){byId('menu-loading').textContent='No se pudo cargar el juego. Recarga la página para volver a intentarlo.';},get started(){return started;}};
  }
  root.ArcadeMainMenu={create,PAUSED};
})(window);

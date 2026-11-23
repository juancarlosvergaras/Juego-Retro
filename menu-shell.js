(function(root){
  'use strict';
  // Menú único del juego. Las diez misiones comparten esta definición: el mismo
  // menú sirve de portada y de pausa (Jugar/Continuar, Misiones, Tienda,
  // Ajustes, Ayuda, Reiniciar, Modo desarrollador temporal y Salir).
  // Debe cargarse antes que player-profiles.js, developer-mode.js y controls.js,
  // que añaden sus paneles a las páginas "home" y "settings".
  const missions=[
    {n:1,href:'index.html',art:'assets/thumbs/mision-01.webp',alt:'La obra: un edificio industrial en ruinas con andamios y grúas',title:'La obra',text:'Asciende por la obra, enfréntate a los lobos y alcanza el helicóptero de rescate.',tags:'Ascenso vertical · Plataformas · Jefes',help:'Asciende por la obra, derrota a los lobos y alcanza el helicóptero de rescate.'},
    {n:2,href:'level-two.html',art:'assets/thumbs/mision-02.webp',alt:'Ciudad devastada de día con mechas abandonados',title:'El umbral del rey',text:'Cruza edificios y oficinas en ruinas, pasa entre mechas abandonados y explora el cementerio hasta el mausoleo del rey.',tags:'Recorrido horizontal · Lluvia · Soldado y lobo',help:'Cruza la ciudad en ruinas, destruye el tanque de asedio y entra al mausoleo del rey.'},
    {n:3,href:'level-three.html',art:'assets/thumbs/mision-03.webp',alt:'Portaaviones volador impulsado por cuatro motores',title:'Guerra en el Aire',text:'Asalta el portaaviones, vence al Centinela y consigue el robot de dos armas.',tags:'Recorrido corto · Combate aéreo · Robot de combate',help:'Cruza la cubierta del portaaviones hasta la proa y derriba al Centinela.'},
    {n:4,href:'level-four.html',art:'assets/thumbs/mision-04.webp',alt:'Carretera al atardecer entre ruinas industriales',title:'Furia en la Carretera',text:'Persigue al convoy en moto, combate sidecars y jeeps, y desarma al Devorador de Asfalto.',tags:'Persecución continua · Mini tanque desbloqueable · Jefe por piezas',help:'Alcanza al convoy por la autopista y destruye las tres torretas del Devorador de Asfalto.'},
    {n:5,href:'level-five.html',art:'assets/thumbs/mision-05.webp',alt:'Mar profundo y cámara del submarino',title:'Bajo el abismo',text:'Desciende entre buzos y minas, entra al submarino y derrota al Capitán del Abismo para desbloquear al luchador.',tags:'Combate submarino · Mini submarino · Arsenal del capitán',help:'Desciende al abismo, atraviesa los campos de minas y asalta la cámara del capitán.'},
    {n:6,href:'level-six.html',art:'assets/thumbs/mision-06.webp',alt:'Atrio de un centro comercial y su azotea',title:'El último centro',text:'Recorre tres plantas, juega en el salón Arcade y enfréntate al Coloso de la azotea.',tags:'Escaleras mecánicas · Tres minijuegos · Gigante',help:'Sube las tres plantas del centro comercial y derrota al Coloso en la azotea.'},
    {n:7,href:'level-seven.html',art:'assets/thumbs/mision-07.webp',alt:'La nave alienígena en el espacio',title:'El Soberano del Vacío',text:'Cruza la nave, combate aliens y platillos tripulados, y enfréntate al Soberano del Vacío.',tags:'Exterior e interior · Láseres · Poder alienígena',help:'Cruza el casco y el interior de la nave nodriza y derrota al Soberano en su núcleo.'},
    {n:8,href:'level-eight.html',art:'assets/thumbs/mision-08.webp',alt:'Avenidas y cruces de Nueva York',title:'Nueva York · La última batalla',text:'Cruza el tráfico, reúne a los policías y derrota al Comandante y a su robot gigante.',tags:'Policías aliados · Nuevos soldados · Jefe de dos fases',help:'Cruza Manhattan, reúne a los policías y derrota al Comandante en la última plaza.'},
    {n:9,href:'level-nine.html',art:'assets/thumbs/mision-09.webp',alt:'Hidroplano sobre el delta industrial',title:'Marea de hierro',text:'Abre paso al convoy de Vega. Cruza el delta bajo fuego y toma la sala de control en la cima de la torre petrolera.',tags:'Patrulleras · Torpedos · Abordaje',help:'J dispara. K lanza torpedos en el agua y granadas a pie. Usa ↑ para subir las escaleras de la torre.'},
    {n:10,href:'level-ten.html',art:'assets/thumbs/mision-10.webp',alt:'Interceptor sobre el archipiélago Cénit',title:'Último vector',text:'Vuela sobre el archipiélago, rompe la escolta y ataca la fortaleza Cénit sobre la caldera.',tags:'Combate cenital · Vuelo libre en 3D · Fortaleza aérea',help:'J dispara. Vigila los cazas que te adelantan. En la caldera, esquiva y mantén al Cénit en la mira para lanzar un misil con K.',final:true}
  ];
  const two=n=>String(n).padStart(2,'0');
  function card(m){
    const body='<img loading="lazy" decoding="async" src="'+m.art+'" alt="'+m.alt+'"><div><small>MISIÓN '+two(m.n)+(m.final?' · FINAL':'')+'</small><strong>'+m.title+'</strong><span>'+m.text+'</span><em>'+m.tags+'</em></div>';
    return m.n===1?'<button class="secondary mission-card" data-start-level="1">'+body+'</button>':'<a class="secondary mission-card" href="'+m.href+'?entry=select">'+body+'</a>';
  }
  function markup(mission){
    const here=missions.find(m=>m.n===mission)||missions[0];
    return '<div class="menu-art" aria-hidden="true"></div>'
      +'<div class="menu-content">'
      +'<div class="menu-brand"><span class="eyebrow">UNA CACERÍA. DIEZ MISIONES.</span><h1>CAP <span>DOLLAR</span></h1><p>THE HUNTER</p></div>'
      +'<section data-menu-page="home"><p id="menu-loading" class="menu-tagline" role="status">Preparando la misión…</p>'
      +'<nav class="menu-actions" aria-label="Menú">'
      +'<button id="menu-play" class="primary" disabled>Jugar</button>'
      +'<button class="secondary" data-open-menu="levels">Misiones</button>'
      +'<button id="menu-shop" class="secondary" data-open-menu="shop" hidden>Tienda del cazador</button>'
      +'<button class="secondary" data-open-menu="settings">Ajustes</button>'
      +'<button class="secondary" data-open-menu="help">Ayuda y controles</button>'
      +'<button id="menu-restart" class="secondary" type="button" hidden>Reiniciar misión</button>'
      +'<button id="menu-developer" class="secondary" type="button">Modo desarrollador temporal</button>'
      +'<button id="menu-exit" class="secondary">Salir</button>'
      +'</nav></section>'
      +'<section data-menu-page="levels" hidden><h2>Misiones</h2><div class="level-choices">'+missions.map(card).join('')+'</div></section>'
      +'<section data-menu-page="shop" hidden><h2>Tienda del cazador</h2><div id="menu-shop-host" class="menu-shop-host"></div></section>'
      +'<section data-menu-page="settings" hidden><h2>Ajustes</h2>'
      +'<fieldset class="difficulty-settings"><legend>Dificultad</legend><div id="difficulty-choices"></div><p id="difficulty-description" class="menu-tip"></p><p class="menu-tip">Se aplica al continuar y se conserva para las próximas partidas.</p></fieldset>'
      +'<fieldset class="tutorial-settings"><legend>Tutorial</legend><label><input id="tutorial-enabled" type="checkbox" checked> Ayudas durante la misión</label><p class="menu-tip">Aprende los controles a medida que avanzas. Las acciones especiales se explican cuando las necesitas.</p><button id="tutorial-reset" class="secondary" type="button">Repetir ayudas del tutorial</button></fieldset>'
      +'<div id="menu-sound"></div><small class="menu-tip">Disparos grabados por <a href="https://opengameart.org/content/gunshot-sounds" target="_blank" rel="noopener">Vincent Sevedge</a> · fragmentos editados bajo <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>.</small><button id="menu-fullscreen" class="secondary">Alternar pantalla completa</button><p id="settings-message" class="menu-tip" role="status"></p></section>'
      +'<section data-menu-page="help" hidden><h2>Ayuda y controles</h2><p class="menu-tagline">Misión '+two(here.n)+' · '+here.title+'. '+here.help+'</p><div id="menu-help" class="menu-help"></div></section>'
      +'<section data-menu-page="exit" hidden><h2>Hasta la próxima, cazador.</h2><p class="menu-tagline">El juego está detenido y tu partida queda guardada en este navegador. Puedes cerrar la pestaña o volver al menú.</p><button id="menu-return" class="primary">Volver al menú</button></section>'
      +'<button id="menu-back" class="menu-back" hidden>← Volver</button><p class="menu-signature">CAP DOLLAR, THE HUNTER</p>'
      +'</div>';
  }
  const api={missions,markup,card};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const layer=root.document.getElementById('main-menu');
  if(layer&&!layer.querySelector('[data-menu-page]')){
    layer.innerHTML=markup(Number(layer.dataset.mission)||1);
    layer.setAttribute('aria-label','Menú');
  }
  root.ArcadeMenuShell=api;
})(typeof window!=='undefined'?window:globalThis);

(function(root){
  'use strict';
  // Guion de la misión 03. Historia y radio reutilizan el sistema de la misión 01.
  // Cada página es el subtítulo de un plano (mission-one-scenes.js, conjunto 'three').
  const briefing=[
    {text:'El Consorcio no tiene bandera. Tiene un ejército, y sus órdenes salen de un portaaviones que no toca el agua.'},
    {text:'Vega conoce una sola forma de acercarse: por debajo de las nubes, y sin segunda pasada.'},
    {text:'Cap baja primero. Siempre baja primero.'},
    {text:''}
  ];
  // Tras la cinemática de cierre (mission-endings.js): la caída y los dos rastros.
  const outro=[
    {text:'Sin su guardián, el portaaviones del Consorcio pierde el rumbo. Y la altura.'},
    {text:'Lo que pudieron salvar huye por tierra. Lo que no, deja un rastro hasta la ciudad.'}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'¡Estás en cubierta! Yo me aparto antes de que me derriben. Avanza hacia proa y no mires abajo.',when:c=>c.landed},
    {id:'militia',who:VEGA,text:'Tripulación armada. Usa los contenedores como cobertura: aquí arriba no hay edificios donde esconderse.',when:c=>c.enemyAlert},
    {id:'jets',who:VEGA,text:'¡Soldados con mochila propulsora! Vienen por arriba: apunta en diagonal o sube a las pasarelas.',when:c=>c.jetSeen},
    {id:'hurt',who:VEGA,text:'Te han dado, Cap. Hay botiquines junto a las torres de control.',when:c=>c.hp<=3&&c.hp>0},
    {id:'mid',who:CAP,text:'Media cubierta. El viento casi me arranca del suelo… y la nave sigue acelerando.',when:c=>c.x>3600},
    {id:'bow',who:VEGA,text:'Proa a la vista. Los sensores marcan una firma enorme justo delante. Prepara lo más pesado que tengas.',when:c=>c.x>5900},
    {id:'mecha',who:VEGA,text:'¡El Centinela! Ráfagas, misiles marcados en el suelo y ondas al pisar: muévete siempre.',when:c=>c.mechaActive},
    {id:'half',who:CAP,text:'Echa humo por las juntas. Un poco más y cae.',when:c=>c.mechaHalf},
    {id:'robot',who:CAP,text:'El chasis sigue entero. Dos brazos, dos armas… puedo usar esto.',when:c=>c.mechaDown},
    {id:'exit',who:VEGA,text:'¡Centinela fuera de combate! Te recojo en la zona de extracción, a tu derecha. El Consorcio evacúa por carretera.',when:c=>c.mechaDown,after:'robot'}
  ];
  const config={briefing,outro,beats,eyebrow:'MISIÓN 03 · GUERRA EN EL AIRE',scenes:'three',startLabel:'Despegar',ambient:/^(militia|jets|hurt|mid|bow)/,series:/^(mid|bow)/};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionThreeStory=api;
})(typeof window!=='undefined'?window:globalThis);

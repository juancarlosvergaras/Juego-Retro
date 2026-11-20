(function(root){
  'use strict';
  // Guion de la misión 07. Informe y radio reutilizan el sistema de la misión 01.
  // Se llega desde el abismo. Vega usa la señal de los libros del Capitán para localizar la nave.
  // Cada página es el subtítulo de un plano (mission-late-scenes.js, conjunto 'seven').
  const briefing=[
    {text:'Los libros del Capitán identifican al proveedor: una nave nodriza en órbita.'},
    {text:'La mordida del lobo blanco, el rey que despertó, las máquinas de guerra… Todo bajó de ahí arriba, a cambio de la ciudad.'},
    {text:'Vega engancha el helicóptero al haz y sube a Cap hasta donde se acaba el aire. Al proveedor lo llaman el Soberano del Vacío.'},
    {text:''}
  ];
  // Tras la caída del Soberano (space-renderer.js): el apagón y el camino a Nueva York.
  const outro=[
    {text:'Sin su proveedor, el Consorcio se queda con lo que ya tiene. Que no es mucho.'},
    {text:'Su Comandante se atrinchera en Nueva York con su último prototipo. Vega ya conoce el camino.'}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Enlace por la antena, Cap. Te oigo con eco, pero te oigo. La esclusa está al final del casco.',when:c=>c.playing&&c.floor===0},
    {id:'crew',who:VEGA,text:'Tripulación armada. Sus láseres no avisan: no te quedes quieto.',when:c=>c.aliens>0},
    {id:'pilots',who:CAP,text:'Platillos de escolta por arriba. Apunto en diagonal.',when:c=>c.pilots>0},
    {id:'hurt',who:VEGA,text:'Tus constantes caen. Tiene que haber botiquines por el casco: búscalos.',when:c=>c.hp<=3&&c.hp>0},
    {id:'mid',who:CAP,text:'Medio casco. Desde aquí la ciudad cabe en la palma de una mano.',when:c=>c.floor===0&&c.x>4800},
    {id:'lock',who:VEGA,text:'Esclusa a la vista. Pulsa arriba frente a ella y entra antes de que te rodeen.',when:c=>c.airlockNear&&c.floor===0},
    {id:'inside',who:CAP,text:'Tanques con cosas dentro. Algunas se parecen a lo que cacé allá abajo.',when:c=>c.floor>=1},
    {id:'gallery',who:VEGA,text:'El enlace… se debilita ahí dentro. El núcleo está al final de la galería.',when:c=>c.floor===1&&c.x>3000},
    {id:'core',who:CAP,text:'El núcleo. Algo se mueve ahí dentro, y es todo tentáculos.',when:c=>c.floor>=2},
    {id:'boss',who:VEGA,text:'¡El Soberano del Vacío! Sal de las marcas, salta la onda y cambia de altura con el láser.',when:c=>c.bossActive},
    {id:'half',who:CAP,text:'Sangra. Si sangra, tiene precio.',when:c=>c.bossHalf},
    {id:'down',who:CAP,text:'Proveedor fuera del negocio. Me llevo lo que latía dentro.',when:c=>c.bossDown},
    {id:'home',who:VEGA,text:'El Consorcio se quedó sin suministro. Su Comandante se atrinchera en Nueva York.',when:c=>c.wrap,after:'down'}
  ];
  const config={briefing,outro,beats,eyebrow:'MISIÓN 07 · EL SOBERANO DEL VACÍO',scenes:'seven',startLabel:'Subir por el haz',ambient:/^(crew|pilots|hurt|mid|lock|gallery)/,series:/^(mid|gallery)/,
    epilogue:'El Soberano ha caído y el Consorcio se quedó sin proveedor. Lo que latía en su núcleo ahora late contigo: el Pulso del Vacío. Sin suministro, el Comandante se atrinchera en Nueva York con su último prototipo.'};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionSevenStory=api;
})(typeof window!=='undefined'?window:globalThis);

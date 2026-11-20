(function(root){
  'use strict';
  // Guion de la misión 07. Informe y radio reutilizan el sistema de la misión 01.
  // Siempre se llega desde la 06 (la antena de la azotea), pero no se da por
  // jugada ninguna de las misiones 03 a 05. Vega habla por el enlace de la antena.
  const briefing=[
    {title:'La señal',text:'La antena del centro comercial no hablaba con la ciudad. Hablaba con una nave nodriza en órbita, y la nave contestaba.\n\nEl Consorcio no fabrica sus monstruos: los compra. La mordida del Lobo Blanco, el rey que despertó, sus máquinas de guerra… todo bajó de ahí arriba, a cambio de la ciudad.'},
    {title:'El casco',text:'Vega engancha el helicóptero al haz de la antena y te sube hasta donde se acaba el aire. No puede seguirte: te hablará por ese mismo enlace, mientras dure.\n\nCaes sobre el casco exterior. Tripulación armada, platillos de escolta y una esclusa al final de cada sector.'},
    {title:'El Soberano del Vacío',text:'En el núcleo espera el proveedor. Los suyos lo llaman el Soberano del Vacío: tentáculos, un láser que barre la sala y cápsulas que caen del techo.\n\nNo negocia con cazadores. Si cae, el Consorcio se queda sin suministro.',objectives:['Cruza el casco exterior hasta la esclusa','Atraviesa la galería interior hasta el núcleo','Acaba con el Soberano del Vacío']}
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
  const config={briefing,beats,eyebrow:'MISIÓN 07 · EL SOBERANO DEL VACÍO',scenes:'seven',startLabel:'Subir por el haz',ambient:/^(crew|pilots|hurt|mid|lock|gallery)/,series:/^(mid|gallery)/,
    epilogue:'El Soberano ha caído y el Consorcio se quedó sin proveedor. Lo que latía en su núcleo ahora late contigo: el Pulso del Vacío. Sin suministro, el Comandante se atrinchera en Nueva York con su último prototipo.'};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionSevenStory=api;
})(typeof window!=='undefined'?window:globalThis);

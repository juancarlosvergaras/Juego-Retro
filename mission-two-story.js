(function(root){
  'use strict';
  // Guion de la misión 02. El informe y la radio usan el mismo sistema que la
  // misión 01 (mission-one-story.js); aquí solo vive el texto y sus disparadores.
  const briefing=[
    {title:'El salto',text:'El Capataz solo era un perro guardián. Antes de caer habló de un rey enterrado al otro lado de la ciudad.\n\nLa artillería no deja aterrizar a Vega: saltas en paracaídas sobre las ruinas, entre los que todavía huyen.'},
    {title:'Los caídos',text:'La milicia defiende la avenida con torretas, barricadas y un tanque de asedio. Más allá, donde empieza a llover, está el cementerio de los caídos.\n\nDicen que allí los muertos ya no descansan. Algo los despierta desde abajo.'},
    {title:'El umbral',text:'La puerta del mausoleo la guarda un heraldo que respira electricidad. Nadie ha entrado desde que apareció.\n\nDetrás espera el rey. Acaba con él y Vega te sacará de aquí.',objectives:['Cruza la ciudad en ruinas y destruye el tanque de asedio','Atraviesa el cementerio y derrota al Heraldo Eléctrico','Entra al mausoleo y da caza al rey']}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Buen aterrizaje, Cap. No puedo acercarme más: la artillería barre el cielo. Sigue la avenida hacia el este.',when:c=>c.landed},
    {id:'militia',who:VEGA,text:'Queda milicia entre las ruinas. Vigila las fachadas: disparan desde los pisos altos.',when:c=>c.enemyAlert&&c.x<8100},
    {id:'hurt',who:VEGA,text:'Estás perdiendo sangre. Busca un botiquín rojo entre los escombros.',when:c=>c.hp<=3&&c.hp>0},
    {id:'tank',who:VEGA,text:'¡Tanque de asedio cortando la avenida! Los explosivos le hacen daño de verdad; no te quedes delante del cañón.',when:c=>c.tankNear},
    {id:'tankDown',who:CAP,text:'Tanque fuera de combate. La avenida vuelve a ser mía.',when:c=>c.tankDown},
    {id:'giants',who:CAP,text:'Máquinas de guerra del tamaño de un edificio, apagadas en mitad de la calle. Mejor que sigan dormidas.',when:c=>c.x>4600&&!c.inside},
    {id:'avenue',who:VEGA,text:'Empieza a llover y pierdo tu señal. Lo que haya a partir de aquí no sale en ningún mapa.',when:c=>c.x>8150&&!c.inside},
    {id:'airship',who:VEGA,text:'Hay un dirigible de la milicia anclado sobre la avenida. Si consigues subir, quizá lleve algo que merezca la pena.',when:c=>c.x>8700&&!c.inside&&!c.mk2},
    {id:'mk2',who:VEGA,text:'¿Un jetpack de doble empuje? Con eso vuelas al doble de velocidad. Buen botín, Cap.',when:c=>c.mk2Now},
    {id:'cemetery',who:CAP,text:'Tumbas abiertas desde dentro. La tierra se mueve.',when:c=>c.x>9750&&!c.inside},
    {id:'zombies',who:VEGA,text:'¡Están saliendo del suelo! Unos escupen de lejos y otros se te echan encima: no dejes que te rodeen.',when:c=>c.zombieAwake},
    {id:'storm',who:VEGA,text:'¡Cuidado con los rayos! Avisan en el suelo antes de caer… y a los muertos también los fríen.',when:c=>c.strikes>0},
    {id:'pit',who:CAP,text:'Las rejas se han cerrado. Esto es una trampa: una fosa común que se vacía sola.',when:c=>c.pit==='fight'},
    {id:'pitDone',who:VEGA,text:'Las rejas bajan. Sigue, Cap: lo que los despierta está más adelante.',when:c=>c.pit==='done',after:'pit'},
    {id:'barricade',who:VEGA,text:'Última barricada de la milicia. Ellos tampoco pudieron pasar del cementerio.',when:c=>c.x>12700&&!c.inside},
    {id:'herald',who:VEGA,text:'Lectura eléctrica disparada. Ese es el Heraldo: salta sus descargas y castígalo cuando recarga.',when:c=>c.heraldNear},
    {id:'suit',who:CAP,text:'Su poder se me pega a la piel… otra forma más. La puerta del mausoleo se abre.',when:c=>c.heraldDown},
    {id:'inside',who:CAP,text:'Hace frío aquí dentro. Algo enorme respira bajo la piedra.',when:c=>c.inside},
    {id:'king',who:VEGA,text:'¡El Rey de Piedra! Su coraza aguanta las balas: busca el momento en que se agrieta.',when:c=>c.kingActive},
    {id:'rot',who:VEGA,text:'¡La coraza ha caído y lo de dentro sigue vivo! ¡No pares, Cap!',when:c=>c.kingStage===2},
    {id:'done',who:VEGA,text:'El rey ha caído. Sal por donde entraste: te recojo en la puerta. Hay un portaaviones volando hacia la costa y no es nuestro.',when:c=>c.kingDown}
  ];
  const config={briefing,beats,eyebrow:'MISIÓN 02 · EL UMBRAL DEL REY',scenes:'two',startLabel:'Saltar sobre la ciudad',ambient:/^(militia|hurt|giants|avenue|airship|cemetery|barricade|storm)/,series:/^(giants|avenue|cemetery|barricade)/};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionTwoStory=api;
})(typeof window!=='undefined'?window:globalThis);

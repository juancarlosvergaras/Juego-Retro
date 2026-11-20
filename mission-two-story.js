(function(root){
  'use strict';
  // Guion de la misión 02. La historia y la radio usan el mismo sistema que la
  // misión 01 (mission-one-story.js); aquí solo vive el texto y sus disparadores.
  // Cada página es el subtítulo de un plano (mission-one-scenes.js, conjunto 'two').
  const briefing=[
    {text:'El Capataz solo cuidaba una puerta. Al otro lado de la ciudad, alguien le pagaba.'},
    {text:'Vega no puede aterrizar donde todavía manda la artillería. Cap nunca le pidió que lo hiciera.'},
    {text:'Dicen que bajo el cementerio de los caídos despertó un rey. Y que el rey despertó a los demás.'},
    {text:''}
  ];
  // Tras la salida del mausoleo (mission-two-outro.js): lo que había en la cripta.
  const outro=[
    {text:'El rey cayó. En su cripta había cajas que no tenían siglos.'},
    {text:'Todas llevaban el mismo sello: el Consorcio, la empresa militar que compró la ciudad cuando acabó la guerra.'},
    {text:'Hay dos envíos en marcha: uno por aire y otro por carretera. Cap tendrá que elegir qué rastro sigue.'}
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
    {id:'done',who:VEGA,text:'El rey ha caído. Te recojo en la puerta. En su cripta hay cajas con un sello: el Consorcio. Veo dos rutas en los albaranes: aire y carretera.',when:c=>c.kingDown}
  ];
  const config={briefing,outro,beats,eyebrow:'MISIÓN 02 · EL UMBRAL DEL REY',scenes:'two',startLabel:'Saltar sobre la ciudad',ambient:/^(militia|hurt|giants|avenue|airship|cemetery|barricade|storm)/,series:/^(giants|avenue|cemetery|barricade)/};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionTwoStory=api;
})(typeof window!=='undefined'?window:globalThis);

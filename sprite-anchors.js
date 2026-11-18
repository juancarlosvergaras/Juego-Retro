(function(root){
  'use strict';
  // Anclas de cuerpo para cuadros que se recortaron centrados en su caja.
  // Un recorte que incluye el fogonazo o un brazo extendido desplaza el torso
  // al centrarlo; fijar el ancla sobre el torso evita el salto lateral entre
  // poses. Medidas con tests/sprite-audit.html (centro de masa de la mitad
  // superior del cuerpo). Solo se carga en la misión 01, cuyo dibujante admite
  // [sx,sy,sw,sh,contorno,ancla].
  function anchor(frames,row,list){for(const [frame,x] of list){const f=frames?.[row]?.[frame];if(f){if(f.length<5)f[4]=null;f[5]=x;}}}
  // Soldado enemigo: disparo (2 cuadros) y golpe comparten la cabeza del reposo.
  anchor(root.ENEMY_FRAMES,3,[[0,138.2],[1,106.8],[2,103.6]]);
  // Lobo: ascenso, caída y aterrizaje mantienen el torso sobre el mismo eje.
  const wolf=root.ACTION_FRAMES?.wolf;
  anchor(wolf,2,[[3,73.2],[4,57.7],[5,68.3]]);
  anchor(wolf,3,[[0,44.4],[1,44.5],[2,46.1],[5,69.4],[6,85],[7,64.7]]);
})(typeof window!=='undefined'?window:globalThis);

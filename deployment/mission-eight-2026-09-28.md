# Misión 8 · Nueva York · La última batalla

Implementación local del 28 de septiembre de 2026. Nueva York pasa a ser el cierre de la campaña después de la misión 7. Publicada posteriormente en el Mac mini como versión 20260928T145040Z.

## Recorrido y combate

- Manhattan (6000 unidades), Midtown (5400) y plaza final (960).
- Tres cruces por distrito con semáforos, aviso previo y taxis/sedanes que circulan en ambos sentidos. El atropello causa daño; saltar o pasar bajo tierra permite evitarlo.
- Tres puestos policiales por distrito, barricadas, vehículos policiales con luces alternas y policías reclutables por proximidad. Los aliados acompañan, saltan obstáculos y disparan a enemigos. Hasta dos reclutados llegan a la batalla final.
- Treinta soldados en los dos distritos: fusileros y torretas existentes, nuevo soldado de asalto con ráfaga y nuevo granadero con lanzamiento parabólico.
- Botiquines, combustible, armas/munición y cuatro estrellas con el renderer compartido de recogibles. Checkpoints dentro de los distritos y al entrar en cada zona.
- Jefe fase 1: comandante de 59 unidades de altura frente a las 46 del soldado jugador. Ráfagas, granadas y deslizamiento de ataque.
- Transición: retirada corriendo, salto a la escalera, ascenso, entrada a la cabina y cierre. No puede morir durante esta secuencia ni activar una victoria anticipada.
- Fase 2: robot de 238 unidades, ametralladora, misiles marcados, ondas de pisotón y barrido de puño. Sprites de ataque y cuatro estados de destrucción, seguidos del final de campaña.
- Continuidad 7 → 8, menú de misiones, perfiles independientes, modo desarrollador temporal, carga diferida, skins, armas, poderes y controles compartidos.

## Arte

Generado con la herramienta integrada de generación de imágenes, usando los sprites del soldado y el primer diseño de Nueva York como referencias. Transparencia real RGBA en los cuatro sprite sheets. Recortes y anclajes de dibujo en código; no se redimensionaron ni repintaron imágenes con Python.

Fondos finales completos:
- `assets/worlds/mission-08/manhattan-v1.png`
- `assets/worlds/mission-08/midtown-v1.png`
- `assets/worlds/mission-08/plaza-final-v1.png`

Sprite sheets finales:
- `assets/sprites/nueva-york-trafico-v1.png`: 12 celdas de tráfico, semáforos y barricadas.
- `assets/sprites/nueva-york-policias-soldados-v1.png`: 16 celdas de policías, asalto y granadero.
- `assets/sprites/comandante-nueva-york-v1.png`: 16 poses de combate, retirada, escalada y cabina.
- `assets/sprites/titan-nueva-york-v1.png`: 16 poses de montaje, marcha, ataque y destrucción.

Prompts completos: [sprites y primer concepto](mission-eight-art-prompts.json) y [fondos finales](mission-eight-background-prompts.json). El concepto de tres franjas `nueva-york-v1.png` se conserva como referencia local y no se incluye en el paquete público.

## Comprobaciones

- Suite completa: 640 pruebas aprobadas en 111 archivos, sin fallos. Resultado: `tests/mission-eight-suite-results.txt`.
- Quince pruebas nuevas de mundo/controlador: tráfico, salto/burrow, policías, checkpoints, fases de jefe, daño real de armas compartidas, ataques, guardado, reanudación, recompensa única y transferencia 7 → 8.
- Recorrida visual de Manhattan y plaza, transparencia y escala de sprites, transición a la cabina y segunda fase. Se corrigieron un corte del fondo y contaminación entre celdas del robot; los sprites de personajes usan un anclaje estable durante los ataques.
- Fixture local de QA: `http://localhost:4186/tests/new-york-preview.html`, aislado del origen de la partida del usuario en 4173. La invulnerabilidad y los saltos de zona pertenecen solo al fixture, no al juego publicado.
- Entrada real: `level-eight.html`; controlador: `level-eight-game.js`; mundo: `new-york-world.js`; render: `new-york-renderer.js`.

Paquete local final: **20260928T144854Z**, 246 archivos, 221113022 bytes. Dependencias resueltas, archivos privados excluidos y SHA256 de los 246 archivos verificados localmente. Publicación posterior confirmada: 20260928T145040Z. La pantalla «Nueva York está a salvo» apareció tras la derrota del robot; no se observaron errores ni advertencias de consola en la prueba del navegador. Las quince pruebas de la misión se repitieron tras los últimos ajustes y pasaron.

Publicación: [registro de 20260928T145040Z](releases/20260928T145040Z.md), con las ocho misiones y todos los cambios locales del juego verificados desde HTTPS.

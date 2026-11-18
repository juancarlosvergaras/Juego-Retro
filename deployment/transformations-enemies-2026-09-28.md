# Transformaciones y coherencia de enemigos

**Actualización:** publicado en Mac mini en `20260928T140348Z`. Las referencias de estado local que siguen corresponden al registro previo de preparación.

Versión local: **20260928T135558Z**, 235 archivos, 204632459 bytes. Pendiente de publicación en Mac mini.

## Cambios

- Los 30 cambios dirigidos entre soldado, lobo, zombi, robot, luchador y mini tanque usan las formas de origen y destino correctas. En moto y nadando conservan sus poses reales, orientación y punto de apoyo. La transición ya no se omite para robot, luchador o tanque en carretera ni muestra un cuerpo de pie en el agua.
- Sustituido el fundido de cuerpos transparentes por una sustitución de silueta con bandas de píxeles y un nuevo sprite sheet de energía de 12 fotogramas. Se conservan las secuencias dibujadas de soldado, lobo y zombi en tierra.
- Se mantienen salud, inventario y cinco segundos de espera entre transformaciones. El cambio de zona de misión 2 conserva las seis formas y el ancho correcto; la esclusa marina limpia inmediatamente el estado de nado.
- Nuevo atlas de enemigos con jetpack, guardias y buzos, y nuevo capitán del abismo con 16 poses. Proporciones compactas, contornos y sombreado acordes al soldado. Fusileros, cuchilleros, torretas, zombis y aliens conservan su identidad y arte compatible; se mantienen también los motorizados corregidos en la revisión anterior.
- Corregidos recortes que incorporaban pies ajenos al nado del luchador, fragmentos de arpón junto a los buzos y fogonazos del capitán en el fotograma vecino. Escala del soldado dentro del submarino igualada a la referencia compartida.

## Arte

Generado con la herramienta integrada imagegen y referencias del proyecto, sin cambios manuales de imagen fuera de ella. Los ajustes de recorte son coordenadas del renderer.

- `assets/sprites/transformacion-energia-v1.png`: 12 efectos. Prompt: `transformation-effects-prompt-2026-09-28.txt`.
- `assets/sprites/enemigos-estilo-soldado-v2.png`: 16 poses. Prompt: `enemy-style-prompt-2026-09-28.txt`.
- `assets/sprites/capitan-abismo-v2.png`: 16 poses. Prompt: `captain-style-prompt-2026-09-28.txt`.

## Validación

- Suite completa: **625 pruebas, 109 archivos, cero fallos** (`tests/transformation-review-results.txt`).
- Regresión nueva: 30 pares × tres contextos × dos direcciones × cinco instantes; estado original, opacidad, pose y anclaje. Transformaciones reales de los 30 pares conservan salud y munición en moto y agua.
- Repetidas las 12 pruebas marinas después del ajuste final, incluida la limpieza del estado de nado al entrar; comprobación de sintaxis del renderer.
- Inspección visual con `tests/all-transitions-preview.html`: tierra, moto, nado, ambos sentidos y comparación de enemigos. Prueba de las misiones 4 y 5 con `tests/context-game-preview.html`; sin errores de consola observados. Estos archivos son de desarrollo y no se incluyen en el paquete público.

# PCs de checkpoint · 27 de septiembre de 2026

Implementado localmente, pendiente de publicación en Mac mini junto con la revisión de jugabilidad del mismo día.

## Funcionamiento

- 21 PCs: ocho repartidas en la obra, once a lo largo de ciudad y cementerio y dos dentro del mausoleo.
- Al pasar caminando por una PC se enciende su monitor, aparece CHECK POINT, suena la confirmación y se guarda inmediatamente el punto de reaparición.
- El guardado pertenece al perfil seleccionado. Volver a otra PC cambia el punto activo; quedarse sobre ella no repite el aviso.
- Al morir se vuelve a la última PC con salud completa y tres segundos de protección. Se conservan armas, recursos y progreso; activar una PC no repone munición ni gasolina.
- Se conserva el contexto exterior/interior del mausoleo y la compatibilidad con partidas anteriores sin PCs. Una misión nueva reinicia sus checkpoints.
- Ubicaciones sobre superficies transitables, fuera de obstáculos, cráteres y barrera del tanque. No se activan desde el aire, una cuerda, una escalera o bajo tierra.

## Validación

492 pruebas aprobadas en 89 archivos. Incluyen activación única, recursos intactos, posiciones seguras, formas del jugador, guardados antiguos, reaparición exterior/interior y misiones nuevas. Resultado resumido en `tests/checkpoints-results.txt`.

Prueba en navegador sobre origen aislado, sin modificar perfiles de la partida habitual: encendido y guardado en ciudad, obra y mausoleo; muerte y reaparición en la PC en ambas misiones, conservando el interior del mausoleo. Fixture reproducible: `tests/checkpoints-preview.html`, servido únicamente en el puerto 4186.

## Sprite generado

Modo: herramienta integrada image_gen. Asset definitivo: `C:/Juego Arcade/assets/sprites/checkpoint-pc-v1.png`. Cuatro fotogramas: apagado, arranque y dos estados encendidos. Transparencia conservada y render con suavizado desactivado.

Prompt utilizado:

> Create a game-ready transparent pixel-art SPRITE SHEET: exactly FOUR versions of the SAME checkpoint computer workstation in one horizontal row, 1536x512 canvas, fixed four 384x512 cells, no text, no scenery. A rugged olive-drab military computer on a compact waist-high wheeled equipment trolley, CRT monitor, keyboard, small tower, metal legs, cables attached underneath, heavy brown feet. 1990s detailed side-scrolling military gothic action game art: hand-made sharp pixel clusters, black/dark outlines, weathered metal, subtle rust, strong readable silhouette. Side/front three-quarter view slightly facing right, identical geometry size and position in every cell. Workstation takes ~260px wide and 300px high, baseline y=425 in each cell, ample empty margins. Frame 1: monitor powered off dark navy glass and amber standby LED. Frame 2: starting up with a small thin cyan horizontal scan line in CRT. Frame 3: monitor activated showing bright green simple pixel cross/save icon, green LED, faint screen-light on keyboard. Frame 4: identical activated workstation, subtly brighter green screen with scanline shifted, no flare. All four machines must be exactly the same workstation, same scale, same feet/baseline. Transparent background and no drop shadow, no glow outside the sprite, NO written labels, no characters. Clean cutouts suited for rendering 45-50 pixels tall in the actual game.


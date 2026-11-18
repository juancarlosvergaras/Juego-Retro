# Transformaciones de las tres formas

Publicado en el Mac mini el 27 de septiembre de 2026, versión 20260927T065743Z. Ver releases/20260927T065743Z.md.

## Resultado

Seis direcciones: soldado ↔ zombi, zombi ↔ lobo y soldado ↔ lobo. Nuevo atlas con 18 poses intermedias, tres secuencias reversibles. Anticipación, cambio corporal y recuperación antes de regresar a la pose real de juego. Anclaje por los pies, escala progresiva, cuerpo opaco, partículas pequeñas y píxeles sin suavizado. El extremo lobo usa el sprite limpio de reposo actual.

El módulo compartido `form-transition.js` se carga y prepara en ambas misiones. Conserva la duración de 1,2 segundos y la espera de diez segundos entre cambios; no modifica salud, inventario ni movimiento. La interfaz de misión 1 identifica también la transformación hacia zombi.

## Arte

Archivo: `assets/sprites/transformaciones-jugador-v3.png`, 1536 × 1024, RGBA. Modo: image_gen integrado. Se conserva el archivo generado sin edición externa; la preparación de alfa y los recortes se realizan una vez al cargar, como los demás sprites del juego.

Referencias de identidad y estilo: `soldado-v2.png`, `zombi-soldado-v1.png` y `soldado-lobo-v1.png`. Prompt completo en `player-transformations-v3.prompt.txt`.

## Verificación

Pruebas de las seis rutas y su orden inverso, extremos reales, anclaje de pies y orientación, dibujo opaco sin interpolación, conservación de salud/munición/posición y espera entre transformaciones. Verificación de carga en ambas misiones. Galería visual: `tests/form-transition-preview.html`, con las seis direcciones animadas, secuencias estáticas, cámara lenta y orientación invertida.

463 pruebas aprobadas en 85 archivos. Revisión visual de las seis direcciones en ambos sentidos, secuencias completas y transición en una partida aislada de misión 2. Carga completada sin errores de consola observados.

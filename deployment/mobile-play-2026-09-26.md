# Experiencia móvil de ambas misiones

Publicado en el Mac mini el 27 de septiembre de 2026, versión 20260927T065743Z. Ver releases/20260927T065743Z.md.

## Distribución y controles

La partida ocupa la altura disponible del navegador, respetando las zonas seguras del teléfono. Vertical: controles en una franja inferior separada del lienzo. Horizontal: palanca y utilidades a la izquierda, ataques y salto a la derecha; lienzo central completo sin controles superpuestos. Indicadores compactos de salud, arma/munición, poder, saltos, gasolina, estrellas y puntuación. Se eliminan las cartas y la barra de nueve armas del escenario móvil; Arma ↻ recorre las armas recogidas y Poder ↻ cambia el poder. Se conservan las utilidades de forma, gancho y jetpack y el menú de pausa. Botón de pantalla completa cuando el navegador lo admite.

Palanca de ocho direcciones con zona muerta: movimiento y puntería diagonal. Al borde se activa correr/turbo. Atacar, Saltar y Patada/Plasma admiten contactos independientes y simultáneos. Cada dedo tiene su propia fuente en el mismo enrutador del teclado y mando; soltar uno no suelta los demás. Cancelación, pérdida de captura, pausa, cambio de orientación y pérdida de foco limpian los contactos. El tutorial de misión 1 explica las acciones táctiles.

CSS y módulo compartidos: mobile-play.css y mobile-play.js. En escritorio continúa la distribución anterior. La resolución interna mínima de misión 2 se adapta en móvil para que el personaje siga siendo legible. El HUD móvil reutiliza la cadencia existente y solo escribe texto que cambió.

## Verificación

467 pruebas aprobadas en 86 archivos. Pruebas nuevas: ocho direcciones de puntería, zona muerta, carrera/turbo, tres contactos simultáneos, convivencia con teclado, cancelación y limpieza idempotente.

Navegador con tamaños 390 × 844, 844 × 390 y 568 × 320. Escenario y controles sin intersecciones en los tamaños medidos. En horizontal de 844 × 390, el lienzo útil mide 580 × 310; en 568 × 320, 304 × 240. Sin desbordamiento de página en la comprobación pequeña. Verificados en partida: misión 2, cambiar de zombi a soldado y disparar (100 → 99); misión 1, disparar (36 → 35), cambiar poder y arrastrar palanca. Sin errores de consola observados.

Partidas de QA separadas en el puerto 4186, preparadas por tests/mobile-play-preview.html. La comprobación visual usa tamaños simulados en navegador; no equivale a una prueba con dedos en un teléfono físico.

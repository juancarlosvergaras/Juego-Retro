# Animaciones de reposo del zombi soldado

Publicado en el Mac mini el 27 de septiembre de 2026, versión 20260927T065743Z. Ver releases/20260927T065743Z.md.

## Comportamiento

Después de seis segundos sin actividad comienza el gesto de desprender la mano y usarla como un pequeño bate, durante 3,6 segundos. La recoloca y vuelve a su reposo habitual. A los 18 segundos empieza el giro completo de cabeza, de tres segundos. Los dos gestos se alternan cada doce segundos mientras continúa quieto.

Movimiento, salto, daño, ataques, poderes, escalada, agarre, transformación y entierro cancelan o impiden el gesto. La pausa congela su tiempo. Son animaciones cosméticas; no desplazan al personaje ni cambian las colisiones. El Heraldo no recibe estos gestos.

## Sprite y generación

Archivo final: `assets/sprites/zombi-soldado-reposo-v1.png`, 1536 × 1024, RGBA.

Modo: image_gen integrado (built-in), generación de un atlas suplementario con `assets/sprites/zombi-soldado-v1.png` como referencia. Se preserva el alfa y el archivo original. Herramienta usada sin CLI ni cambios manuales en la imagen.

Prompt de trabajo: exactamente seis columnas y cuatro filas, 24 poses de cuerpo completo del mismo zombi militar, casco oliva, piel gris verdosa, ojos cian, uniforme corto, botas, cinturón y mochila; pixel art detallado, fondo transparente, cuerpo orientado a la derecha, misma escala y pies anclados. Primeras dos filas: reposo, agarrar muñeca, desprender mano como una pieza de juguete sin sangre, levantarla como un bate, preparar y realizar el swing, mirarla, alinearla con la muñeca, colocarla y regresar a reposo. Últimas dos filas: cuerpo, hombros, brazos y pies quietos, cabeza y casco completan 360 grados alrededor del cuello pasando por perfil derecho, vista frontal, perfil izquierdo, parte posterior y regreso; recuperar reposo. Márgenes amplios, sin cuadrículas, texto, armas, sangre, anatomía expuesta ni solapamientos.

Los recortes usan espacios transparentes; el anclaje se calcula a partir de las botas para que el brazo extendido no desplace el cuerpo. Se omite la pose con rastros dibujados de la cabeza y se usa la recuperación limpia del atlas.

## Verificación

Revisión visual en navegador con ambas animaciones y ambos sentidos, más secuencia estática del giro. Pruebas de alternancia, pausas, cancelación por acciones, conservación de física y separación respecto al Heraldo. Pruebas relacionadas de controles, misión 2, zombi, lobo, reposo y combate.

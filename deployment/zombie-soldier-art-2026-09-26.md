# Traje de zombi soldado

Generación con image_gen integrado, modo built-in (sin CLI), dos atlas nuevos. Se mantienen los atlas originales para el Heraldo. Aplicación compartida a ambas misiones, incluido el retrato del selector y la extracción.

## Archivos y prompts

- `assets/sprites/zombi-soldado-v1.png`, 1254 × 1254, RGBA. Editado a partir de zombi-electrico-v1.png y soldado-v2.png. Prompt: transformar el primer atlas en un zombi soldado jugable con el estilo pixel art militar detallado del segundo; exactamente seis columnas y seis filas sobre fondo transparente, casco oliva, uniforme corto desgastado, correaje, bolsillos, pantalones, botas marrones y pequeña mochila constantes; cara y manos gris verdosas, ojos cian sutiles, sin abrigo largo ni armas. Filas: reposo, caminar, correr, lanzamiento eléctrico con la palma, lanzamiento de plasma y agacharse/enterrarse/salir. Mantener separación, anatomía, escala y línea de apoyo; sin bolas brillantes ni rayos integrados, texto, cuadrículas ni solapamientos. La quinta pose de entierro debía ser solamente tierra, sin cabeza.
- `assets/sprites/zombi-soldado-extra-v1.png`, 1536 × 1024, RGBA. Generado con el nuevo atlas y zombi-electrico-extra-v1.png como referencias. Prompt: el mismo zombi soldado con idéntico casco, mochila, uniforme y estilo, seis columnas por cuatro filas transparentes; filas de daño/caída, rugido eléctrico, salto y transformación; mantener anatomía y escala, separación amplia, orientación a la derecha; sin armas, orbes, neblina, texto ni fondo. La segunda referencia aporta únicamente la secuencia de poses.

## Integración y revisión

Los recortes se ajustaron a los espacios transparentes de cada atlas. El entierro usa desplazamiento progresivo y recorte contra el plano del suelo; después de medio segundo no dibuja el cuerpo. La inmunidad y desplazamiento subterráneo conservan los tres segundos existentes. El escudo tampoco queda flotando sobre la tierra.

El disparo se sincroniza con la palma extendida; el rayo tiene núcleo fino, ramas y chispas de impacto. El plasma tiene silueta líquida sombreada, estela acotada a nueve muestras, gotas e impacto con gravedad; conserva charcos temporales y daño adhesivo. No se modificaron daño, munición ni resistencia.

450 pruebas pasan en 82 archivos, incluida regresión de entierro completo, origen de ataques en ambos sentidos y límites de las estelas. Revisión visual del atlas animado a escala doble y de la forma/retrato dentro de una partida aislada. Los controles y guardados de las misiones conservan sus pruebas existentes.

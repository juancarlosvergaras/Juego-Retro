# Motos, obstáculos y recogibles — 28 de septiembre de 2026

**Actualización:** publicado en Mac mini en `20260928T140348Z`. Las referencias de estado local que siguen corresponden al registro previo de preparación.

Se corrigió la escala de los conductores y se estabilizó el tamaño entre poses. El robot y el luchador cuentan con una nueva hoja de ocho poses en moto, con proporciones cercanas al soldado. Los enemigos motorizados tienen una hoja nueva de seis poses sin fogonazos permanentes. Las armas dobles del robot y sus puntos de salida se ajustaron a las manos de la pose nueva.

Las rampas tienen 200 px de ancho y un área de contacto ampliada. Los baches son huecos de 116 px con tres fotogramas de agua. Asfalto, huecos y rampas avanzan con el mismo desplazamiento al acelerar y durante la recuperación de una caída. Minas, plasma en el suelo y suministros de carretera también siguen ese desplazamiento.

`pickup-renderer.js` reutiliza los dibujos originales de misión 1: las nueve armas numeradas, el botiquín rojo, el botiquín verde de curación total, el bidón amarillo y la estrella dorada. Las siete misiones lo utilizan; se conservaron las recompensas, ubicaciones y progreso de los suministros. Los paquetes de munición del centro comercial y del espacio muestran las armas que entregan. Los botiquines posteriores indican +3 vidas, de acuerdo con su efecto existente.

## Arte

Creado con la herramienta integrada de la habilidad imagegen, sin CLI. Los originales se conservaron y las nuevas imágenes se guardaron en el proyecto:

- [Rampas y huecos con agua](../assets/sprites/carretera-rampas-agua-v1.png), seis fotogramas. [Prompt](road-obstacles-prompt-2026-09-28.txt).
- [Robot y luchador en moto](../assets/sprites/motos-robot-luchador-v2.png), ocho poses. [Prompt](motorcycle-proportions-prompt-2026-09-28.txt).
- [Enemigos motorizados](../assets/sprites/enemigos-motorizados-v2.png), seis poses. [Prompt](enemy-motorcycle-prompt-2026-09-28.txt).

## Verificación

Comparación visual de las seis formas, enemigos, saltos, rampa, agua y todos los recogibles en `tests/road-art-review.html`. Revisión de los recogibles en las misiones 5–7 mediante `tests/expansion-preview.html`. Pruebas de desplazamiento coincidente entre asfalto y huecos, colisiones en el borde ampliado de la rampa, cambio de carril, salto y recogibles compartidos.

Suite completa: **622 pruebas aprobadas en 108 archivos**, registrada en `tests/road-pickups-final-results.txt`; cuatro comprobaciones adicionales del botín de misión 2 tras unificar los rótulos. Paquete **20260928T133222Z**, 233 archivos y 201948787 bytes.

Cambios locales; no se ha publicado esta revisión en el Mac mini.

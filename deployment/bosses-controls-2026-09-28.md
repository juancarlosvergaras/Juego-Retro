# Jefes, tanque y controles — 28 de septiembre de 2026

**Actualización:** publicado en Mac mini en `20260928T140348Z`. Las referencias de estado local que siguen corresponden al registro previo de preparación.

Cambios locales preparados en el paquete `20260928T130707Z` (230 archivos, 199.184.301 bytes). No publicado en el Mac mini durante esta revisión.

Los 230 archivos del paquete fueron verificados contra su SHA256. La sintaxis de todos los JavaScript raíz pasó la comprobación.

- Soberano: diseño de cráneo, mandíbula y tentáculos; 16 cuadros de aparición, reposo, dolor y destrucción, más 24 cuadros de ataques. Extracción de siluetas independiente para conservar los tentáculos completos sin incorporar partes del cuadro vecino. Escala fija por hoja, sin suavizado.
- Sus cuatro ataques tienen efectos propios: tentáculo, onda, láser y cápsulas. El láser parte de la boca y comparte trayectoria con su aviso y la detección de daño.
- Efectos compartidos para los jefes de las siete misiones: cortes, impactos, rocas, misiles, explosiones, rayos, plasma, charcos, minas, trazadoras, granadas y descarga eléctrica. Se conservan las hojas corporales anteriores de los demás jefes.
- Mini tanque: 12 cuadros de suspensión, impulso, ascenso, ápice, caída y compresión al aterrizar; integración también en las rampas de la carretera. El modo submarino conserva su animación.
- Gancho: autorización positiva únicamente para el soldado, limpieza de agarres antiguos en otros trajes y botones móviles coherentes.
- Controles: las teclas recibidas después de cerrar el menú ya no se borran en el siguiente cuadro. La repetición recupera movimiento y disparo mantenidos después de reiniciar la entrada sin repetir saltos o transformaciones. El estado de las acciones queda actualizado antes de emitir el evento canónico.

## Arte

Seis hojas generadas con imagegen, 116 cuadros nuevos. Prompts en `boss-art-prompts-2026-09-28.json` y `boss-ordnance-prompt-2026-09-28.txt`.

| Archivo final en assets/sprites | Cuadros |
| --- | --- |
| soberano-horror-v2.png | 16 |
| soberano-ataques-v2.png | 24 |
| soberano-efectos-v2.png | 16 |
| ataques-jefes-v1.png | 32 |
| armamento-jefes-v1.png | 16 |
| mini-tanque-salto-v1.png | 12 |

## Verificación

617 pruebas aprobadas en 107 archivos. Regresiones de cierre de menú, recuperación de teclas mantenidas, gancho en todos los trajes, secuencia del tanque, fases del alien, trayectoria del láser y siluetas de los 40 cuadros reales. Resultados completos: `tests/boss-review-final-results.txt`.

Revisión visual en navegador con `tests/boss-sheets-preview.html` y combate real de M7. Prueba aislada con HTML y controles actuales en `tests/current-input-preview.html?entry=resume`: M1 y M2 crean proyectiles diagonales y descuentan munición con los eventos ↑ + → + J y ↑ + ← + J; también se prueba reanudar y disparar inmediatamente.

La prueba envía eventos al navegador; no puede verificar la matriz del teclado físico. Si el dispositivo no envía un evento J al mantener las flechas, el navegador no puede reconstruir esa pulsación. Se conservan O para disparo diagonal derecho y los controles de ratón/mando.

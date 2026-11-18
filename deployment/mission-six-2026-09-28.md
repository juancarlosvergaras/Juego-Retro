# Misión 6 · El último centro

Versión local terminada el 28 de septiembre de 2026. Paquete `20260928T061153Z`: 212 archivos públicos, 177465723 bytes. No publicado en Mac mini. Incluye también los cambios locales de las misiones 4 y 5 pendientes de publicación.

## Recorrido

Tres plantas amplias de 3600, 3000 y 2800 unidades, seguidas de una azotea. Las escaleras mecánicas tienen sprites, peldaños animados, aproximación y ascenso del personaje. Se activan con ↑ o el botón contextual; cada llegada guarda un checkpoint. Si se cierra el juego durante el ascenso, continuar sitúa al personaje en la base de la escalera.

Hay 21 soldados repartidos entre las tres plantas, incluidas torretas y enemigos con cuchillo. Mostradores saltables, plantas, botiquines, combustible, munición y tres estrellas completan el recorrido. El combate reutiliza las armas, poderes, gancho, jetpack y animaciones compartidas de los personajes. Se conservan los seis trajes y las mejoras por perfil.

La pantalla final de misión 5 incluye el acceso a misión 6. El selector de todas las misiones, Continuar, perfiles y el aislamiento del modo desarrollador reconocen la nueva misión. Entrar desde campaña comienza con salud completa.

## Tienda Arcade

En la primera planta, cerca de x=980. El mundo se detiene al entrar y se recupera en el mismo punto al salir. Los récords pertenecen al perfil actual y cada reto concede 500 puntos una sola vez.

- **Circuito Fugitivo:** robot mensajero en un laberinto original, circuitos que recoger, centinelas, tres vidas y 150 segundos. No reutiliza personajes, nombres ni un tablero de Pac-Man.
- **Órbita de Acero:** pinball con lanzamiento, dos paletas independientes, tres bolas, rebotes, bumpers y objetivo de 1000 puntos.
- **Ruta Neón:** carretera con tráfico, dirección, acelerador, freno, tres vidas y meta a los 9 km.

Teclado, botones táctiles y acciones del mando comparten las asignaciones del juego. Las pulsaciones breves se conservan hasta el siguiente paso de simulación. Salir, reintentar y elegir otra máquina están disponibles sin recargar la misión; una pérdida de foco detiene el minijuego hasta recibir una dirección.

## Jefe

El Coloso aparece en la azotea después de que el jugador llegue a su zona. Solo se ve el torso y la cabeza por encima del borde; su cuerpo permanece fijo detrás del edificio. Tiene puñetazo con marca previa, barrido que se evita saltando y lluvia de escombros con posiciones señaladas. Puño e impactos utilizan sprites propios. El disparo, los golpes del luchador y la embestida del lobo pueden dañarlo sin desplazarlo.

Su derrota anima el dolor y la caída detrás del edificio, concede 8500 puntos una vez y guarda el final. No se añade un traje nuevo por esta misión.

## Arte

Cuatro imágenes finales generadas con `image_gen` integrado, sin CLI. Atlas transparentes recortados en tiempo de carga y renderizados sin suavizado. Prompts completos: [mission-six-art-prompts.json](mission-six-art-prompts.json).

- `assets/worlds/mission-06/centro-comercial-v1.png`: atrio, galería superior y azotea.
- `assets/sprites/centro-comercial-objetos-v1.png`: tres máquinas, letrero Arcade, escaleras, jardineras, mostrador, PC y puertas.
- `assets/sprites/gigante-azotea-v1.png`: reposo, rugido, ataques, dolor y caída del gigante.
- `assets/sprites/coloso-impactos-v1.png`: cuatro fases del puñetazo y cuatro poses de escombros.

Los elementos de los minijuegos se dibujan en canvas con diseños propios.

## Verificación

- Suite completa: **596 pruebas en 103 archivos**, todas aprobadas en procesos separados (`tests/mall-full-results.txt`).
- Comprobación posterior de módulos afectados: **58 pruebas aprobadas**, incluida la colisión real del torso con armas, combos y embestida (`tests/mall-final-results.txt`).
- Nuevas regresiones: ascenso de las tres escaleras, guardado durante el trayecto, checkpoints, recuperación tras morir, activación y ataques del jefe, recompensa única, final recuperable, continuidad de misión 5 a 6 y mecánicas de los tres minijuegos.
- Revisión visual en el origen aislado 4186: entrada a Arcade, las tres máquinas, persistencia de récord, escalera, planta superior, gigante y final. Vista móvil horizontal 844 × 390: controles fuera del escenario, selección de máquina, pinball y regreso a la misión. Sin errores de consola observados.
- Paquete verificado: incluye los cuatro assets finales y todos los módulos de misión 6; excluye los fixtures de pruebas.
- No se realizó una partida manual completa ni una prueba con mando Xbox físico. Las comprobaciones de controles usan las acciones compartidas y pruebas automatizadas de mando.

Fixture permanente: `tests/mission-six-preview.html`. Pruebas nuevas: `tests/mall-world.test.cjs` y `tests/mall-runtime.test.cjs`. Las partidas del servidor habitual en 4173 no fueron alteradas por las pruebas.

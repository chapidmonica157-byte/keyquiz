# keyQuiz · quiz de bases de datos clave-valor

Un solo juego, una sola página (`index.html`). En el inicio se elige:
- **Jugar solo:** practica sin necesitar a nadie más.
- **Unirme a una sala:** con el código que da el anfitrión.
- **Crear sala (anfitrión):** muestra el enlace, el código y los nombres que van entrando; pulsa "Empezar juego"
  y ve el ranking en vivo (de mayor a menor puntaje) y el podio final.

10 preguntas: 8 de selección múltiple y 2 de ordenar pasos. Cada pregunta dura 15 segundos, sin comodines. 3 vidas y puntos por rapidez y racha.
Al terminar, el anfitrión y cada jugador ven el ranking completo (del puesto 1 al último de todos los que entraron).

## Para tener un enlace que funcione en internet (publicar en Render, gratis)
El modo sala necesita un servidor para conectar a todos en tiempo real.
1. Sube esta carpeta a un repositorio nuevo de GitHub (Add file > Upload files; no subas `node_modules`).
2. En https://render.com: New > Web Service > elige el repositorio.
   Runtime Node, Build Command `npm install`, Start Command `npm start`, plan Free (con `render.yaml` ya viene configurado).
3. Render te da un enlace como `https://keyquiz.onrender.com`.
   Ese es el enlace para la docente y los compañeros. Tú, como anfitrión, abres ese mismo enlace y pulsas "Crear sala".
Nota: en el plan gratis el servidor se duerme si nadie lo usa; abre el enlace unos minutos antes de presentar.

## Probarlo en tu computador
1. Instala Node.js 18 o superior.
2. En la terminal de VS Code, dentro de esta carpeta: `npm install` y luego `npm start`.
3. Abre http://localhost:3000. Los celulares en la misma WiFi entran con la dirección que aparece al crear la sala.

## Archivos
- `server.js`: servidor y salas (WebSocket)
- `public/index.html`: la única página del juego
- `public/app.js`: lógica del juego (solo, jugador y anfitrión)
- `public/questions.js`: las preguntas (edítalas aquí)
- `public/style.css`: diseño

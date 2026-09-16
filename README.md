# OPEN LAB — Trivia Challenge

Trivia educativa para el ecosistema PVL.ONE de la Escola Europea – Intermodal Transport.

**Publicada en:** https://portvirtuallab.github.io/openlab/trivia/

Es un sitio **totalmente estático**: no hay backend, ni Google Apps Script, ni hoja
de cálculo. Todo vive en este repositorio y se ejecuta en el navegador del alumno.

```
openlab/
└── trivia/
    ├── index.html          Estructura de la página
    ├── css/
    │   └── styles.css      Estilos (paleta PVL.ONE)
    ├── data/
    │   └── questions.json  Las preguntas ← se edita aquí
    └── js/
        ├── config.js       Parámetros del juego
        ├── store.js        Preguntas + puntuaciones (localStorage)
        └── app.js          Lógica del juego
```

Todas las rutas son relativas, así que la carpeta se puede mover o renombrar
sin tocar el código.

## Cómo editar las preguntas

Abre `trivia/data/questions.json` en GitHub, edítalo y guarda. El cambio está
publicado en un par de minutos. No hay que desplegar nada.

Cada pregunta es un objeto con tres claves:

```json
{
  "question": "Which organization sets the Incoterms rules?",
  "options": ["United Nations", "International Chamber of Commerce (ICC)", "World Trade Organization (WTO)", "European Commission"],
  "correct": "International Chamber of Commerce (ICC)"
}
```

Reglas que aplica `store.js` al cargar el archivo:

- `question` no puede estar vacío.
- `options` necesita **al menos dos** opciones.
- `correct` debe coincidir **exactamente** con una de las opciones. Si no
  coincide, la pregunta se descarta en silencio (sería imposible de acertar).

Si el JSON está mal formado, el juego lo dice en pantalla en vez de fallar sin
explicación. Antes de guardar, un validador como jsonlint.com ahorra disgustos.

## Dónde se guardan las puntuaciones

En `localStorage`, es decir, **en el navegador de cada alumno**. Esto tiene una
consecuencia que conviene tener presente:

- Cada alumno ve **solo sus propias partidas**. No hay clasificación común.
- Borrar los datos de navegación borra las puntuaciones.
- En modo incógnito no se guarda nada; el juego avisa en pantalla.
- No se recoge ningún dato personal: no se pide email y nada sale del navegador.

Para un concurso con premios y ranking compartido hace falta un servicio que
pueda escribir datos (Supabase, Firebase o similar). El resto del proyecto
seguiría igual: solo cambiaría `store.js`.

## Parámetros de juego

En `trivia/js/config.js`:

| Clave | Descripción |
|-------|-------------|
| `QUESTIONS_URL` | Ruta al archivo de preguntas |
| `STORAGE_KEY` | Clave de `localStorage`. Cambiarla reinicia a todos |
| `QUESTION_TIME` | Segundos por pregunta (30) |
| `QUESTIONS_PER_ROUND` | Preguntas por partida; `0` usa todas |

## Colores

La paleta sale de la marca PVL.ONE y está en `:root`, al principio de
`css/styles.css`:

| Variable | Color | Uso |
|----------|-------|-----|
| `--pvl-navy` | `#0c4494` | Azul marino: fondo de la página |
| `--pvl-cyan` | `#049ce4` | Cian: botones, enlaces, elementos activos |
| `--pvl-amber` | `#fcb434` | Ámbar: acentos, avisos, primer puesto |

Cambiando esas tres variables se reviste toda la aplicación.

## Desarrollo en local

Las preguntas se cargan con `fetch()`, que no funciona abriendo el archivo con
doble clic (`file://`). Hace falta un servidor. Con Python:

```bash
cd trivia && python -m http.server 8000
```

Y abre http://localhost:8000

## Publicar

Cada `push` a `main` se despliega solo en GitHub Pages
(**Settings → Pages → Branch: `main` / `(root)`**).

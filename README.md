# OPEN LAB — Trivia Challenge

Trivia educativa para el ecosistema PVL.ONE de la Escola Europea – Intermodal Transport.
Frontend estático en GitHub Pages, backend en Google Apps Script sobre una hoja de cálculo.

**Publicada en:** https://portvirtuallab.github.io/openlab/trivia/

Este módulo vive dentro del repositorio `openlab`, como una carpeta más:

```
openlab/
└── trivia/
    ├── index.html          Estructura de la página
    ├── css/
    │   └── styles.css      Estilos (idénticos a la versión original)
    ├── js/
    │   ├── config.js       URL del backend y parámetros del juego
    │   ├── api.js          Comunicación con Apps Script
    │   └── app.js          Lógica del juego
    ├── apps-script/
    │   └── Code.gs         Backend (se pega en el editor de Apps Script)
    └── README.md
```

Todas las rutas del HTML son relativas, así que la carpeta se puede mover o renombrar sin tocar el código.

## Puesta en marcha

### 1. Preparar la hoja de cálculo

Crea (o reutiliza) una hoja de Google con dos pestañas:

**`Questions_OPENLAB`** — cabecera en la fila 1:

| Question | Option A | Option B | Option C | Option D | Correct Answer |
|----------|----------|----------|----------|----------|----------------|

La columna *Correct Answer* debe contener el **texto exacto** de una de las cuatro opciones.

**`Leaderboard`** — se crea sola la primera vez que alguien juega.

Copia el ID de la hoja desde su URL:
`https://docs.google.com/spreadsheets/d/`**`ESTO_ES_EL_ID`**`/edit`

### 2. Desplegar el backend

1. En la hoja: **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs` (sustituye lo que hubiera).
3. En `setupProperties()`, escribe tu ID de hoja y una contraseña de administrador.
4. Ejecuta `setupProperties()` una vez y acepta los permisos.
5. **Borra los valores** que escribiste en `setupProperties()` y guarda.
6. Ejecuta `testSetup()` y comprueba en el registro que todo es correcto.
7. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
8. Copia la URL que termina en `/exec`.

### 3. Conectar el frontend

Abre `js/config.js` y pega la URL en `API_URL`.

Comprueba que el backend responde abriendo en el navegador:
`TU_URL_EXEC?action=ping`

### 4. Publicar en GitHub Pages

Desde la raíz del repositorio `openlab`, con esta carpeta dentro como `trivia/`:

```bash
git init
git add .
git commit -m "OPEN LAB Trivia — versión estática"
git branch -M main
git remote add origin git@github.com:portvirtuallab/openlab.git
git push -u origin main
```

En el repositorio: **Settings → Pages → Branch: `main` / `(root)` → Save**.

La primera publicación tarda un par de minutos. Después, cada `push` a `main` se despliega solo.

## Cómo hablan frontend y backend

Apps Script no envía cabeceras CORS en las respuestas GET, así que:

- **Lecturas** (`getQuestions`, `getLeaderboard`): JSONP. `api.js` inyecta un `<script>` y el backend envuelve la respuesta en la función de callback.
- **Escrituras** (`saveScore`, `clearLeaderboard`): `fetch` POST con `Content-Type: text/plain`, que no dispara *preflight* y sí devuelve una respuesta legible.

Todas las respuestas tienen la misma forma:

```json
{ "success": true,  "data": ... }
{ "success": false, "error": "mensaje" }
```

## Seguridad

Este repositorio es público, así que:

- La contraseña de administrador vive **solo** en las propiedades del script. El cliente la envía y el servidor la valida; no hay ninguna copia en el JavaScript.
- El `SPREADSHEET_ID` tampoco está en el código: se lee de `PropertiesService`.
- El leaderboard público **no devuelve los emails**. Se guardan en la hoja para el control de duplicados, pero no viajan al navegador.
- `saveScore` rechaza un email que ya haya participado, con un bloqueo (`LockService`) que evita escrituras simultáneas.

Ten en cuenta que la puntuación se calcula en el cliente: alguien con conocimientos técnicos puede enviar un resultado falso. Para un concurso con premios, contrasta el leaderboard con las listas oficiales de estudiantes, tal como indican las reglas de la propia trivia.

## Parámetros de juego

En `js/config.js`:

| Clave | Descripción |
|-------|-------------|
| `API_URL` | URL `/exec` del Web App |
| `QUESTION_TIME` | Segundos por pregunta (30) |
| `QUESTIONS_PER_ROUND` | Preguntas por partida; `0` usa todas |
| `REQUEST_TIMEOUT` | Milisegundos antes de abandonar una petición |

## Después de cambiar el backend

Cada vez que edites `Code.gs` tienes que crear una **nueva versión** de la implementación (*Implementar → Gestionar implementaciones → editar → Versión: Nueva*). Si no, seguirás sirviendo el código antiguo con la misma URL.

# ActoVyn Backend

Agente de compromisos personales. El usuario escribe lo que piensa hacer en
lenguaje natural y el sistema responde con un **Commitment Score** de 0 a 100,
el riesgo de que no lo cumpla y una recomendación concreta.

La idea que sostiene el producto: **el score no lo calcula el LLM**. Sale de un
motor de reglas propio, determinista y testeado, alimentado por el historial
real del usuario. El modelo de lenguaje solo hace dos cosas, y ninguna decide
el número:

1. Convertir texto libre en estructura (objetivo, categoría, dificultad, hora).
2. Redactar la explicación con números que ya vienen calculados.

Si el LLM se cae, el sistema sigue funcionando: hay un extractor offline por
expresiones regulares y una explicación por reglas.

## Arranque

```bash
pnpm install
cp .env.template .env      # completa DATABASE_URL y JWT_SECRET
pnpm db:generate           # genera el cliente Prisma en generated/
pnpm db:migrate            # crea las tablas
pnpm db:seed               # crea la cuenta demo con su historial
pnpm start:dev
```

Sin `JWT_SECRET` la aplicación no arranca, a propósito: con un secreto vacío
cualquiera podría firmarse un token.

El seed deja una cuenta lista, `demo@hackedu.app` con contraseña `demo1234`, y
el historial diseñado que hace que la demo tenga contraste.

La API queda en `http://localhost:$PORT/api`, la documentación Swagger en
`/api/docs` y el contrato en JSON en `/api/docs-json`, que sirve para generar
los tipos del cliente en lugar de escribirlos a mano.

## Despliegue en Supabase y Koyeb

Supabase pone la base de datos y Koyeb el servidor. Van separados a propósito:
así puedes cambiar de host sin migrar datos.

**1. Supabase.** Crea el proyecto y copia dos cadenas de conexión distintas de
Project Settings, Database. La del **pooler**, puerto 6543, es `DATABASE_URL`,
la que usa la app en marcha. La **directa**, puerto 5432, es `DIRECT_URL` y
solo la usan las migraciones, porque `migrate` necesita bloqueos de sesión que
el pooler no conserva. A la del pooler añádele `?pgbouncer=true&connection_limit=1`.

**2. Migra y carga la demo**, desde tu máquina con el `.env` completo:

```bash
pnpm db:deploy   # crea las tablas en Supabase
pnpm db:seed     # cuenta demo con su historial
```

**3. Koyeb.** Crea un servicio desde el repositorio de Git y elige **Dockerfile**
como método de build. No hace falta configurar comandos: el Dockerfile ya
instala, genera el cliente de Prisma, compila, migra y arranca.

| Ajuste | Valor |
| --- | --- |
| Builder | Dockerfile |
| Puerto | 8000 |
| Health check | HTTP en `/api` |

El puerto lo inyecta Koyeb en `PORT` y la app escucha en `0.0.0.0`, que es lo
que espera su balanceador.

**4. Variables de entorno en Koyeb.** Todas las de la tabla de abajo. Marca
como secretas `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `AI_KEY` y
`MAINTENANCE_TOKEN`. Genera el secreto de firma con `openssl rand -base64 48`.

**5. El frontend.** Apúntalo a `https://TU-APP.koyeb.app/api` y pon ese mismo
origen en `CORS_ORIGINS`. Como estarán en dominios distintos, deja
`AUTH_COOKIE_CROSS_SITE=true`, que exige HTTPS en ambos lados. Si aun así la
cookie te da problemas, `AUTH_REFRESH_IN_BODY=true` devuelve el refresh en el
cuerpo y lo guarda el cliente.

### Si la instancia se duerme

En un plan gratuito la instancia puede suspenderse por inactividad, y un
proceso dormido no ejecuta su propio cron: los borradores caducados no se
limpiarían nunca.

Para eso está `POST /api/maintenance/purge-drafts`, que hace la misma limpieza
y se dispara desde fuera con la cabecera `x-maintenance-token`. Apúntale un cron
externo gratuito cada hora y de paso mantienes la instancia despierta:

```bash
curl -X POST https://TU-APP.koyeb.app/api/maintenance/purge-drafts \
  -H "x-maintenance-token: $MAINTENANCE_TOKEN"
```

Sin `MAINTENANCE_TOKEN` configurado el endpoint queda cerrado.

### Dos cosas que no puedes cambiar sin romper algo

**Node 22 o superior.** No es una preferencia: `uuid` v14 solo trae ESM y la
app compila a CommonJS, así que depende de poder requerir un módulo ESM. Con
Node 20 la app no arranca. Está fijado en `engines` y en el Dockerfile.

**Una sola instancia.** El limitador de peticiones cuenta en memoria. Si
escalas a varias réplicas, el cupo se multiplica por el número de réplicas.
Para escalar hay que mover ese contador a Redis primero.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Postgres en marcha. El pooler, puerto 6543 |
| `DIRECT_URL` | Solo migraciones. Conexión directa, puerto 5432 |
| `DATABASE_CA_CERT` | Opcional. Verifica la cadena TLS del proveedor |
| `MAINTENANCE_TOKEN` | Habilita la limpieza de borradores por HTTP |
| `JWT_SECRET` | Firma de los access token. Obligatorio |
| `JWT_EXPIRES_IN` | Vida del access token en segundos |
| `AUTH_REFRESH_DAYS` | Días que dura la sesión |
| `AUTH_REFRESH_IN_BODY` | Devuelve el refresh en el cuerpo, si no vale la cookie |
| `AUTH_COOKIE_CROSS_SITE` | La cookie viaja entre dominios. Exige HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos, separados por comas |
| `AI_PROVIDER` | `openai` usa la API, `fixture` usa el extractor offline |
| `AI_KEY` | Clave de OpenAI, solo si `AI_PROVIDER=openai` |
| `AI_MODEL` | Modelo a usar, por defecto `gpt-4o-mini` |
| `PORT` | Puerto del servidor |

`AI_PROVIDER=fixture` no necesita red ni clave y es determinista, así que sirve
para desarrollar y para que una demo no dependa del wifi.

## Endpoints

Todo pide `Authorization: Bearer <access_token>` salvo `/api` y `/api/auth/*`.
El usuario sale del token, nunca del cuerpo de la petición.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Crea la cuenta. Con token de invitado, la convierte |
| `POST` | `/api/auth/login` | Inicia sesión |
| `POST` | `/api/auth/guest` | Cuenta anónima para probar sin formulario |
| `POST` | `/api/auth/refresh` | Rota el refresh y renueva el access token |
| `POST` | `/api/auth/logout` | Invalida el refresh |
| `GET` | `/api/users/me` | La cuenta de la sesión |
| `PATCH` | `/api/users/me` | Nombre, apellido y zona horaria |
| `POST` | `/api/intentions/analyze` | Analiza y predice. Crea un **borrador** |
| `POST` | `/api/intentions/:id/commit` | Me comprometo: el borrador pasa a pendiente |
| `POST` | `/api/intentions/:id/reschedule` | Mueve la hora y vuelve a predecir |
| `DELETE` | `/api/intentions/:id` | Descarta un borrador |
| `GET` | `/api/intentions` | Historial filtrable y paginado |
| `GET` | `/api/intentions/:id` | Detalle con todas sus predicciones |
| `PATCH` | `/api/intentions/:id/close` | Cierra: cumplí, fallé, reprogramé |
| `GET` | `/api/stats` | Panel de patrones y calibración |
| `GET` | `/api` | Señal de vida |

Los cuerpos van en `snake_case`, petición y respuesta, porque es el contrato
que consume el frontend. Dentro del backend todo es `camelCase`; la traducción
ocurre en una sola capa, los mappers y DTOs de `adapter/in/rest`.

La cuenta guarda `name` y `lastname` por separado, así que el registro pide los
dos y no un `display_name`. La respuesta devuelve los tres: los dos campos
reales y `display_name` ya compuesto, para que el cliente no tenga que decidir
cómo unirlos.

### Códigos de error

Siempre con la forma de Nest, `{ statusCode, message, error }`.

| Código | Cuándo |
| --- | --- |
| 400 | Validación del cuerpo o de los parámetros |
| 401 | Sin token, token inválido, credenciales que no son |
| 403 | El recurso existe pero es de otra persona |
| 404 | No existe |
| 409 | Transición imposible: cerrar dos veces, asumir lo ya asumido |
| 429 | Demasiadas peticiones |

### Borrador y compromiso

Analizar crea una intención en estado `DRAFT`. Un borrador no aparece en el
historial, no cuenta en las estadísticas y, sobre todo, **no entra en el
histórico del que aprende el motor**. Así probar diez veces no cambia lo que el
sistema cree saber de ti.

De ahí sale por una de dos puertas: `commit` lo convierte en compromiso, o
`DELETE` lo descarta. Lo que nadie toca en 24 horas lo recoge un job que corre
cada hora.

### Historial

`GET /api/intentions` acepta `status` (repetible), `from`, `to`,
`scheduled_before`, `category`, `q`, `sort`, `order`, `limit` y `cursor`.
Devuelve `{ items, next_cursor, total }`.

La paginación es por cursor y no por desplazamiento: con scroll infinito, un
desplazamiento grande obliga a la base a recorrer todo lo anterior en cada
página, y si entra una fila nueva arriba se repiten o se saltan resultados.

La pantalla de check-in es una sola consulta:
`?status=PENDING&scheduled_before=<ahora>`.

### Reprogramar

`POST /api/intentions/:id/reschedule` recibe `{ scheduled_at }`, vuelve a
puntuar con la hora nueva y devuelve `{ intention, prediction, previous_score }`,
para que la pantalla pueda enseñar el salto del score.

Hace dos cosas distintas según el estado. Sobre un borrador cambia la hora en
el sitio, porque todavía no había compromiso que registrar. Sobre algo ya
asumido cierra la original como `RESCHEDULED` y crea otra que la apunta con
`rescheduled_from_id`: mover la fecha en el mismo registro borraría que a su
hora no se cumplió, y eso es justo la señal de fallo blando que el producto
detecta.

No vuelve a preguntarle al modelo por la convicción del mensaje: reutiliza la
`linguistic_confidence` de la predicción anterior. Mover la hora no cambia lo
convencido que sonaba el texto, y repreguntarlo haría que el score bailara por
motivos ajenos a la hora.

Si la hora elegida coincide con la que proponía la recomendación, esta queda
marcada como aceptada. Si el usuario se compromete sin moverla, queda marcada
como ignorada. Sin ese "no", la tasa de consejos seguidos saldría siempre del
100%.

### El panel

`GET /api/stats` acepta `from` y `to`, y por defecto cubre las últimas 12
semanas medidas por `created_at`. Excluye borradores.

Devuelve totales, racha de días con al menos una cumplida, cortes por franja,
día, categoría y dificultad, tendencia semanal, calibración, seguimiento de
recomendaciones y unas frases ya redactadas.

La calibración es la parte que responde "¿y esto funciona?": agrupa lo cerrado
por el tramo de score que se predijo y lo compara con lo que pasó de verdad.
Todo se agrega en el servidor porque hacerlo en el cliente obligaría a bajar el
historial entero en cada visita.

Se calcula en memoria a partir de las filas ya leídas, igual que el motor, así
que la agregación entera es dominio puro y se testea con un array. Cuando el
volumen lo pida, se sustituye por SQL sin tocar esa lógica.

Las tasas devuelven `null` en vez de cero cuando no hay nada cerrado con lo que
calcularlas. Un cero diría "fallas siempre", que no es lo mismo que "aún no
sé".

## Sesiones

Access token corto, de 15 minutos por defecto, y refresh token opaco guardado
como hash en la base de datos. El refresh se rota en cada uso: el token que
acaba de gastarse deja de servir.

Si uno ya revocado vuelve a aparecer, es que alguien se quedó con una copia. No
hay forma de saber cuál de los dos es el legítimo, así que se cortan todas las
sesiones de esa cuenta y ambos vuelven a entrar.

El refresh viaja en una cookie `httpOnly`, de modo que un XSS se lleva como
mucho un access token de 15 minutos y no la sesión entera. Cuando la web y el
API están en dominios distintos y la cookie no es viable,
`AUTH_REFRESH_IN_BODY=true` lo devuelve en la respuesta y el cliente lo guarda
por su cuenta.

## Arquitectura

Hexagonal por módulo, la misma forma en todos. Un módulo nuevo se crea copiando
esta estructura.

```
src/
  database/prisma/            Conexión, global
  shared/
    domain/{vo,exception}     Piezas base: ValueObject, Id, DomainException
    util/                     Zone, FixedZone, IanaZone, clamp
    infrastructure/           Filtro de errores y limitador por usuario
  modules/
    auth/                     Registro, login, invitado, refresh, logout
    user/                     Cuenta, perfil y zona horaria
    intention/                El producto
      domain/                 El motor. Sin Nest, sin Prisma, sin red
        entity/               Intention, BehaviorProfile, Prediction
        vo/                   ScoreFactors, ScoreWeights, FactorEvidence
        service/              CommitmentScoreService, reglas de redacción
        enum/ constant/       Vocabulario y políticas del producto
      application/            Orquestación. No calcula: pide, compone, guarda
        port/in/              Lo que la aplicación ofrece
        port/out/             Lo que necesita fuera (IA, repositorio, zona)
        service/ dto/ mapper/
      infrastructure/
        adapter/in/rest/      Controlador, DTOs y mappers del contrato HTTP
        adapter/out/ai/       OpenAI y el extractor offline
        adapter/out/persistence/  Repositorio Prisma y sus mappers
        scheduler/            El job que recoge borradores caducados
```

La regla del cableado: `application/port` declara símbolos e interfaces,
`infrastructure/adapter` tiene las clases concretas, y el `.module.ts` conecta
símbolo con clase. Nadie más sabe cuál es cuál. Cambiar OpenAI por otro
proveedor, o Prisma por otra cosa, es tocar solo ese archivo.

### La dirección de las dependencias

`infrastructure` → `application` → `domain`. Nunca al revés. Por eso el dominio
no importa nada de Nest: lanza sus propias excepciones y el filtro global las
convierte en respuestas HTTP.

## El motor de score

Cinco factores, cada uno de 0 a 100, combinados por media ponderada:

| Factor | Peso | De dónde sale |
| --- | --- | --- |
| `historical_adherence` | 0.35 | Cumplimiento en tareas de la misma categoría |
| `time_compatibility` | 0.25 | Cumplimiento en esa franja horaria |
| `difficulty_fit` | 0.20 | Cumplimiento en tareas de esa dificultad |
| `recent_consistency` | 0.10 | Los últimos 10 cierres |
| `linguistic_confidence` | 0.10 | Convicción del lenguaje. Lo único del LLM |

Tres decisiones que vale la pena conocer antes de tocar nada:

**Suavizado bayesiano.** Sin datos, un factor vale 50, no 0. Y un acierto de un
intento da 62.5, no 100. Un usuario nuevo no arranca condenado ni endiosado.

**Guard rail.** La media ponderada es compensatoria, y eso deja un hueco: sonar
muy convencido taparía haber fallado seis de ocho veces a esa hora. Si un
factor con peso 0.20 o más está por debajo de 30 y tiene al menos 3
observaciones reales, el score se topa en 39. Sin evidencia no acusa.

**Piso del prior.** Los sub-cortes heredan la adherencia global solo si hay al
menos 8 cierres. Con menos vuelven al neutro, para que tres fallos de gimnasio
no condenen "leer un libro".

La hora alternativa que se sugiere sale del historial, nunca del LLM, y solo si
mejora la franja actual en 15 puntos o más. Mover algo que ya funciona sería un
mal consejo.

## Tests

```bash
pnpm test        # motor de score y extractor offline, sin base de datos
pnpm test:e2e    # necesita base de datos alcanzable
```

Los unitarios corren en milisegundos porque el dominio no toca nada externo.
Cubren el caso de la demo: la misma tarea puntúa distinto según la hora, el
guard rail topa cuando hay evidencia y no topa cuando no la hay.

## Zona horaria

La base de datos guarda **siempre UTC**. La hora local existe solo en los
bordes y en las columnas `local_hour` y `weekday`, que quedan materializadas
porque el motor consulta por ellas en cada análisis.

Cada cuenta lleva su zona IANA y con ella se derivan esas columnas. Sin esto,
alguien fuera del Perú vería al motor aprender franjas que nunca vivió.

Hay dos implementaciones de la misma interfaz `Zone`. `FixedZone` sirve para un
offset constante, que es el caso de Lima, y `IanaZone` resuelve zonas reales
con horario de verano. Ahí `addDays` suma días de calendario, no 24 horas: al
cruzar un cambio de horario el instante se mueve 23 o 25, que es lo que espera
cualquiera que dijo "mañana a las 7".

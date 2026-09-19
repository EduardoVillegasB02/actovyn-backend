# Debian y no Alpine: argon2 es nativo y sus binarios son para glibc.
# Node 22 es un mínimo real: uuid v14 solo trae ESM y la app compila a
# CommonJS, así que depende de poder requerir un módulo ESM.
FROM node:22-slim AS builder

WORKDIR /app

# Las imágenes slim vienen sin OpenSSL y Prisma lo necesita para su motor de
# migraciones. Sin esto avisa de que no detecta libssl y puede fallar.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Sin esto corepack pregunta antes de descargar pnpm, y en un build sin
# terminal esa pregunta hace fallar el paso.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Se instala UNA vez, con todo, porque compilar necesita las dependencias de
# desarrollo. Después se podan. Instalar dos veces era frágil: la segunda
# vuelve a ejecutar el postinstall en un entorno recortado.
#
# El tsconfig VA EN ESTA LISTA y no es opcional: el postinstall lanza
# `prisma generate`, y Prisma mira el `module` del tsconfig para decidir si
# emite el cliente en CommonJS o en ESM. Sin él genera la variante ESM, con
# `import.meta.url` dentro, que luego revienta al requerirla desde CommonJS.
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY . .

# Se regenera con el proyecto entero delante. Es barato y garantiza que el
# cliente corresponde al estado final, no al recorte del paso anterior.
RUN pnpm prisma generate
RUN pnpm build

# Fija el formato de módulo de todo lo compilado.
#
# Sin esto, Node busca el package.json más cercano para decidir si un .js es
# CommonJS o ESM, y si queda ambiguo intenta adivinarlo por la sintaxis. El
# cliente de Prisma que tsc compila a CommonJS acababa cargándose como ESM y
# reventaba con "exports is not defined". Este archivo corta esa búsqueda aquí.
RUN printf '{"type":"commonjs"}' > dist/package.json

# Corta el despliegue aquí si el cliente salió en ESM. Es la comprobación que
# faltaba: este fallo no se ve al construir, solo al arrancar en producción.
RUN if grep -rq "import\.meta" dist/generated/prisma/; then \
      echo "ERROR: el cliente de Prisma se generó en ESM y no se puede requerir desde CommonJS"; \
      exit 1; \
    fi

# Quita las dependencias de desarrollo del node_modules que ya existe, sin
# reinstalar nada ni volver a lanzar scripts.
RUN pnpm prune --prod

# ---------------------------------------------------------------------------

FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Ya viene todo resuelto del builder: aquí no se instala nada.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./

# El proveedor inyecta PORT; este es solo el valor por defecto.
ENV PORT=10000
EXPOSE 10000

# Se llama al binario directamente para no depender de pnpm en esta imagen.
# Si prefieres migrar desde tu máquina, deja solo la parte del node.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]

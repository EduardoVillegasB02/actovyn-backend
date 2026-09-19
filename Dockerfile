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
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Fija el formato de módulo de todo lo compilado.
#
# Sin esto, Node busca el package.json más cercano para decidir si un .js es
# CommonJS o ESM, y si queda ambiguo intenta adivinarlo por la sintaxis. El
# cliente de Prisma que tsc compila a CommonJS acababa cargándose como ESM y
# reventaba con "exports is not defined". Este archivo corta esa búsqueda aquí.
RUN printf '{"type":"commonjs"}' > dist/package.json

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

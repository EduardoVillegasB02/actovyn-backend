/**
 * Seed DISEÑADO, no aleatorio. Los mismos 28 cierres que usa el test del
 * motor, para que la demo tenga contraste real:
 *
 *   - trabajo y estudio HIGH a las 22-23h: falla casi siempre  -> NOCTURNO bajo
 *   - lo mismo a las 18-21h: cumple casi siempre               -> NOCHE alto
 *   - gym a las 7am, constante                                 -> no hay que moverlo
 *
 * Con datos aleatorios el score saldría plano y la demo no mostraría nada.
 *
 * Es idempotente: el usuario demo tiene id fijo, se borran sus intenciones y
 * se recrean. Correr con `pnpm db:seed`.
 */
import {
  Difficulty,
  EventType,
  IntentionStatus,
  PrismaClient,
} from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { LIMA_ZONE } from '../src/shared/util/zone.util';

/** Fijo a propósito: DEMO_USER_ID estable entre re-seeds. */
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@hackedu.app';
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234';

type Row = [
  category: string,
  difficulty: Difficulty,
  localHour: number,
  completed: boolean,
  daysAgo: number,
];

// Copia exacta del historial del test. No cambiar sin cambiar el test.
const ROWS: Row[] = [
  ['trabajo', 'HIGH', 23, false, 2],
  ['trabajo', 'HIGH', 22, false, 6],
  ['trabajo', 'HIGH', 23, false, 11],
  ['trabajo', 'HIGH', 22, false, 16],
  ['trabajo', 'HIGH', 23, true, 24],
  ['estudio', 'HIGH', 23, false, 9],
  ['estudio', 'HIGH', 22, false, 19],
  ['trabajo', 'MEDIUM', 23, false, 13],
  ['trabajo', 'MEDIUM', 19, true, 3],
  ['trabajo', 'MEDIUM', 19, true, 8],
  ['trabajo', 'MEDIUM', 20, true, 12],
  ['trabajo', 'HIGH', 19, true, 15],
  ['trabajo', 'HIGH', 18, true, 22],
  ['trabajo', 'LOW', 20, true, 5],
  ['estudio', 'MEDIUM', 19, true, 7],
  ['estudio', 'MEDIUM', 20, true, 14],
  ['estudio', 'HIGH', 19, false, 20],
  ['gym', 'MEDIUM', 7, true, 1],
  ['gym', 'MEDIUM', 7, true, 4],
  ['gym', 'MEDIUM', 7, true, 10],
  ['gym', 'MEDIUM', 7, true, 17],
  ['gym', 'MEDIUM', 7, false, 23],
  ['gym', 'LOW', 7, true, 26],
  ['trabajo', 'MEDIUM', 15, true, 18],
  ['trabajo', 'MEDIUM', 14, false, 21],
  ['personal', 'LOW', 16, true, 25],
  ['personal', 'LOW', 17, true, 27],
  ['estudio', 'HIGH', 15, false, 28],
];

const OBJECTIVES: Record<string, Record<Difficulty, string[]>> = {
  trabajo: {
    HIGH: [
      'Terminar el informe mensual',
      'Preparar la presentación para el cliente',
      'Cerrar la propuesta del proyecto',
    ],
    MEDIUM: [
      'Responder los correos pendientes',
      'Revisar el reporte del equipo',
      'Actualizar el tablero del sprint',
    ],
    LOW: [
      'Enviar el resumen de la reunión',
      'Agendar la reunión de seguimiento',
    ],
  },
  estudio: {
    HIGH: [
      'Estudiar para el parcial',
      'Avanzar el capítulo de la tesis',
      'Repasar todo el curso',
    ],
    MEDIUM: ['Hacer la tarea del curso', 'Leer los apuntes de la clase'],
    LOW: ['Leer un artículo corto'],
  },
  gym: {
    HIGH: ['Entrenar piernas'],
    MEDIUM: ['Ir al gym', 'Entrenar en el gimnasio', 'Salir a correr'],
    LOW: ['Caminar 30 minutos'],
  },
  personal: {
    HIGH: ['Ordenar todo el cuarto'],
    MEDIUM: ['Hacer las compras de la semana'],
    LOW: ['Llamar a mamá', 'Pagar el recibo de luz'],
  },
};

const pad = (n: number) => String(n).padStart(2, '0');
const hour12 = (h: number) =>
  `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const now = new Date();

  // Cuenta real, con credenciales: así la demo se puede iniciar sesión en vez
  // de depender de un usuario suelto en el entorno.
  const password_hash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const account = {
    email: DEMO_EMAIL,
    password_hash,
    name: 'Usuario',
    lastname: 'Demo',
    is_guest: false,
    timezone: LIMA_ZONE.name,
  };

  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: account,
    create: { id: DEMO_USER_ID, ...account },
  });

  // La cascada del schema se lleva predicciones, eventos y recomendaciones.
  const removed = await prisma.intention.deleteMany({
    where: { user_id: user.id },
  });

  const counters: Record<string, number> = {};

  for (const [category, difficulty, localHour, completed, daysAgo] of ROWS) {
    const day = LIMA_ZONE.dateIso(LIMA_ZONE.addDays(now, -daysAgo));
    const scheduledAt = LIMA_ZONE.toUtc(`${day}T${pad(localHour)}:00:00`);
    const closedAt = new Date(scheduledAt.getTime() + 45 * 60_000);
    const status: IntentionStatus = completed ? 'COMPLETED' : 'FAILED';
    const createdAt = LIMA_ZONE.addDays(scheduledAt, -1);

    const key = `${category}:${difficulty}`;
    const pool = OBJECTIVES[category][difficulty];
    counters[key] = (counters[key] ?? 0) + 1;
    const objective = pool[counters[key] % pool.length];

    await prisma.intention.create({
      data: {
        user_id: user.id,
        objective,
        category,
        raw_message: `${objective} a las ${hour12(localHour)}`,
        scheduled_at: scheduledAt,
        local_hour: localHour,
        weekday: LIMA_ZONE.weekday(scheduledAt),
        difficulty,
        status,
        closed_at: closedAt,
        created_at: createdAt,
        events: {
          create: [
            {
              type: EventType.CREATED,
              occurred_at: createdAt,
              metadata: { source: 'seed' },
            },
            {
              // COMPLETED y FAILED existen igual en EventType.
              type: status,
              occurred_at: closedAt,
              metadata: { source: 'seed' },
            },
          ],
        },
      },
    });
  }

  await report(user.id, removed.count);
}

/** Verifica el patrón: NOCTURNO debe salir muy bajo y NOCHE muy alto. */
async function report(userId: string, removed: number): Promise<void> {
  const rows = await prisma.intention.findMany({
    where: {
      user_id: userId,
      status: { in: ['COMPLETED', 'FAILED', 'RESCHEDULED'] },
    },
    select: { local_hour: true, status: true },
  });

  const band = (h: number) =>
    h >= 22
      ? 'NOCTURNO'
      : h >= 18
        ? 'NOCHE'
        : h >= 12
          ? 'TARDE'
          : h >= 6
            ? 'MANANA'
            : 'MADRUGADA';

  const stats: Record<string, { n: number; ok: number }> = {};
  for (const row of rows) {
    const key = band(row.local_hour!);
    stats[key] = stats[key] ?? { n: 0, ok: 0 };
    stats[key].n += 1;
    if (row.status === 'COMPLETED') stats[key].ok += 1;
  }

  console.log(
    `Seed OK: ${ROWS.length} intenciones (${removed} previas borradas)`,
  );
  for (const [key, { n, ok }] of Object.entries(stats).sort())
    console.log(
      `  ${key.padEnd(9)} ${ok}/${n} cumplidas (${Math.round((ok / n) * 100)}%)`,
    );
  console.log(`\nDEMO_USER_ID=${DEMO_USER_ID}`);
  console.log(`Entra con ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

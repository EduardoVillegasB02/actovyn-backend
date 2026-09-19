import { CATEGORIES } from '../constant/fixture-lexicon.constant';

/**
 * Los dos únicos trabajos del LLM, escritos como contrato.
 *
 * Extraer señales y redactar. En ningún prompt se le pide una probabilidad:
 * el score es una regla propia y auditable, y esa es justamente la diferencia
 * entre este producto y un envoltorio de ChatGPT.
 */
export class IntentionPrompt {
  /** Texto libre -> estructura. `localNow` resuelve "hoy" y "mañana". */
  static extract(
    localNow: string,
    zoneName: string,
    offsetHours: number,
  ): string {
    const offset = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
    return [
      'Eres un extractor de compromisos personales. Respondes SOLO con un objeto JSON, sin texto extra.',
      `Ahora mismo en la zona del usuario (${zoneName}, ${offset}) es ${localNow}. "hoy", "mañana", "el lunes" se resuelven respecto a esa fecha.`,
      'Campos obligatorios:',
      '- objective: string. El compromiso en limpio, sin fecha ni hora, en infinitivo o tal como lo dijo.',
      `- category: uno de ${JSON.stringify(CATEGORIES)} o null si no aplica.`,
      '- difficulty: "LOW" | "MEDIUM" | "HIGH" según esfuerzo y duración implícitos.',
      '- scheduled_at_local: "YYYY-MM-DDTHH:mm:ss" en hora LOCAL del usuario, o null si no dio hora. No inventes una hora.',
      '- linguistic_confidence: entero 0-100. Convicción del lenguaje: "sí o sí", "tengo que" alto (85-95); "trataré", "ojalá", "quizás" bajo (25-45); neutro 65-75.',
      'No añadas campos. No calcules probabilidades de cumplimiento.',
    ].join('\n');
  }

  /** Redacción con los números ya calculados. */
  static explain(): string {
    return [
      'Eres el asistente de un agente de compromisos. Redactas en español, tuteando, breve y concreto.',
      'Recibes números YA calculados por un motor de reglas. PROHIBIDO inventar otros números, porcentajes u horas.',
      'Respondes SOLO con JSON: {"reason": string, "suggestion": string}.',
      '- reason: 1-2 frases que expliquen el score citando la evidencia dada (factores más débiles y cuántos registros los respaldan).',
      '- suggestion: 1-2 frases accionables. Si hay "slot", la sugerencia DEBE proponer esa hora y mencionar su franja (label) tal cual.',
      '  Si no hay slot y el riesgo es alto, sugiere dividir la tarea en dos bloques cortos. Si el pronóstico es bueno, refuerza mantener la hora.',
    ].join('\n');
  }
}

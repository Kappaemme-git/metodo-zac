export const QUESTIONNAIRE_VERSION = 'zac-2026-08-v1';
export const PRIVACY_VERSION = 'privacy-2026-07-v1';

const OPTIONS = {
  obiettivo: [
    ['Perdere grasso', 0],
    ['Aumentare massa muscolare', 0],
    ['Ricomposizione corporea', 0],
    ['Migliorare la forma fisica generale', 0],
    ['Preparazione specifica', 0],
  ],
  esperienza: [
    ['Mai', 0],
    ['Meno di 6 mesi', 5],
    ['6 mesi - 2 anni', 10],
    ['2 - 5 anni', 15],
    ['Più di 5 anni', 20],
  ],
  frequenza: [['0', 0], ['1-2', 5], ['3-4', 12], ['5+', 15]],
  alimentazione: [['No', 0], ['Più o meno', 5], ['Sì', 10]],
  costanza: [['Mai', 10], ['1 volta', 7], ['2-3 volte', 3], ['Più di 3 volte', 0]],
  consapevolezza: [['Quasi mai', 0], ['A volte', 5], ['Spesso', 10], ['Sempre', 15]],
  tecnica: [['Scarsa', 0], ['Sufficiente', 5], ['Buona', 10], ['Ottima', 15]],
  ostacolo: [
    ['Mancanza di costanza', 0],
    ['Alimentazione', 0],
    ['Motivazione', 0],
    ['Tempo', 0],
    ['Programmazione', 0],
    ['Recupero', 0],
    ['Altro', 0],
  ],
};

const GENDERS = new Set(['Uomo', 'Donna', 'Preferisco non dirlo']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

function cleanText(value, field, { min = 1, max = 160 } = {}) {
  if (typeof value !== 'string') throw new ValidationError('Valore non valido.', field);
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new ValidationError(`Il campo deve contenere tra ${min} e ${max} caratteri.`, field);
  }
  return cleaned;
}

function optionalText(value, max = 160) {
  if (value == null || value === '') return null;
  return cleanText(value, 'optional', { min: 1, max });
}

function optionFor(questionId, label) {
  const option = OPTIONS[questionId]?.find(([allowed]) => allowed === label);
  if (!option) throw new ValidationError('Risposta non riconosciuta.', `answers.${questionId}`);
  return { label: option[0], points: option[1] };
}

export function levelFor(score) {
  if (score >= 70) return 'Avanzato';
  if (score >= 40) return 'Intermedio';
  return 'Principiante';
}

export function profileFor(level) {
  if (level === 'Avanzato') {
    return {
      code: 'performance',
      title: 'Profilo Performance',
      message: 'Hai già basi solide. Il prossimo salto dipende dalla precisione con cui gestisci volume, intensità e recupero.',
    };
  }
  if (level === 'Intermedio') {
    return {
      code: 'costruzione',
      title: 'Profilo Costruzione',
      message: 'La costanza c’è. Ora serve trasformarla in una progressione leggibile, misurabile e sostenibile.',
    };
  }
  return {
    code: 'fondamenta',
    title: 'Profilo Fondamenta',
    message: 'Il risultato più importante adesso è costruire tecnica, continuità e un metodo che puoi davvero mantenere.',
  };
}

export function validateWaitlist(input) {
  if (input?.website) throw new ValidationError('Richiesta non valida.');
  const email = cleanText(input?.email, 'email', { min: 5, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError('Inserisci un’email valida.', 'email');
  if (input?.privacyAccepted !== true || input?.privacyVersion !== PRIVACY_VERSION) {
    throw new ValidationError('Devi accettare l’informativa privacy.', 'privacyAccepted');
  }
  return {
    name: cleanText(input?.name, 'name', { min: 2, max: 100 }),
    email,
    goal: optionalText(input?.goal, 120),
    marketingConsent: input?.marketingConsent === true,
    privacyVersion: PRIVACY_VERSION,
    source: optionalText(input?.source, 80) || 'landing',
    utm: sanitizeUtm(input?.utm),
  };
}

export function validateQuestionnaire(input) {
  if (!input || typeof input !== 'object') throw new ValidationError('Richiesta non valida.');
  if (input.website) throw new ValidationError('Richiesta non valida.');
  if (input.questionnaireVersion !== QUESTIONNAIRE_VERSION) {
    throw new ValidationError('Il questionario è stato aggiornato. Ricarica la pagina.');
  }
  if (input.privacyAccepted !== true || input.privacyVersion !== PRIVACY_VERSION) {
    throw new ValidationError('Devi accettare l’informativa privacy.', 'privacyAccepted');
  }
  const startedAt = Number(input.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 5_000) {
    throw new ValidationError('Compilazione troppo rapida. Riprova tra qualche secondo.');
  }

  const email = cleanText(input.email, 'email', { min: 5, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError('Inserisci un’email valida.', 'email');
  const age = Number(input.age);
  if (!Number.isInteger(age) || age < 18 || age > 99) {
    throw new ValidationError('Il questionario è disponibile dai 18 anni.', 'age');
  }
  if (!GENDERS.has(input.gender)) throw new ValidationError('Seleziona un’opzione valida.', 'gender');
  if (!input.answers || typeof input.answers !== 'object') {
    throw new ValidationError('Risposte mancanti.', 'answers');
  }

  const answers = {};
  let score = 0;
  for (const id of Object.keys(OPTIONS)) {
    const selected = optionFor(id, input.answers[id]);
    answers[id] = selected.label;
    score += selected.points;
  }
  const discipline = Number(input.answers.disciplina);
  if (!Number.isInteger(discipline) || discipline < 1 || discipline > 10) {
    throw new ValidationError('Seleziona un valore da 1 a 10.', 'answers.disciplina');
  }
  answers.disciplina = String(discipline);
  score += Math.round((discipline / 10) * 15);

  const level = levelFor(score);
  return {
    firstName: cleanText(input.firstName, 'firstName', { min: 1, max: 80 }),
    lastName: cleanText(input.lastName, 'lastName', { min: 1, max: 80 }),
    email,
    age,
    gender: input.gender,
    answers,
    improvementGoal: cleanText(input.improvementGoal, 'improvementGoal', { min: 8, max: 1200 }),
    motivation: cleanText(input.motivation, 'motivation', { min: 8, max: 1200 }),
    score,
    level,
    profile: profileFor(level),
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    privacyVersion: PRIVACY_VERSION,
    marketingConsent: input.marketingConsent === true,
    source: optionalText(input.source, 80) || 'questionario',
    utm: sanitizeUtm(input.utm),
  };
}

function sanitizeUtm(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    ['source', 'medium', 'campaign', 'content', 'term']
      .map((key) => [key, optionalText(value[key], 120)])
      .filter(([, item]) => item),
  );
}

export function publicQuestionnaireConfig() {
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    privacyVersion: PRIVACY_VERSION,
  };
}

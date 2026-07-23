import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIVACY_VERSION, QUESTIONNAIRE_VERSION, ValidationError, validateQuestionnaire, validateWaitlist } from '../server/questionnaire.mjs';

function validPayload(overrides = {}) {
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    privacyVersion: PRIVACY_VERSION,
    privacyAccepted: true,
    marketingConsent: false,
    startedAt: Date.now() - 10_000,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'MARIO@EXAMPLE.COM',
    age: 32,
    gender: 'Uomo',
    answers: {
      obiettivo: 'Aumentare massa muscolare', esperienza: 'Più di 5 anni', frequenza: '5+',
      alimentazione: 'Sì', disciplina: '10', costanza: 'Mai', consapevolezza: 'Sempre',
      tecnica: 'Ottima', ostacolo: 'Programmazione',
    },
    improvementGoal: 'Migliorare la qualità muscolare e la simmetria.',
    motivation: 'Voglio portare il mio percorso a un livello superiore.',
    ...overrides,
  };
}

test('ricalcola sul server punteggio e profilo avanzato', () => {
  const result = validateQuestionnaire({ ...validPayload(), score: 0, level: 'Principiante' });
  assert.equal(result.email, 'mario@example.com');
  assert.equal(result.score, 100);
  assert.equal(result.level, 'Avanzato');
  assert.equal(result.profile.code, 'performance');
});

test('rifiuta risposte alterate dal browser', () => {
  assert.throws(
    () => validateQuestionnaire(validPayload({ answers: { ...validPayload().answers, tecnica: 'Leggendaria' } })),
    (error) => error instanceof ValidationError && error.field === 'answers.tecnica',
  );
});

test('limita il questionario agli adulti e richiede privacy', () => {
  assert.throws(() => validateQuestionnaire(validPayload({ age: 17 })), /18 anni/);
  assert.throws(() => validateQuestionnaire(validPayload({ privacyAccepted: false })), /informativa privacy/);
});

test('valida e normalizza la lista attesa', () => {
  const item = validateWaitlist({
    name: '  Mario   Rossi ', email: 'MARIO@EXAMPLE.COM', goal: 'Massa',
    privacyAccepted: true, privacyVersion: PRIVACY_VERSION,
  });
  assert.equal(item.name, 'Mario Rossi');
  assert.equal(item.email, 'mario@example.com');
  assert.equal(item.marketingConsent, false);
});

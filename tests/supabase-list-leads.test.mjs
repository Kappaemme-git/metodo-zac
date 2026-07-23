import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseRepository } from '../server/repository.mjs';

function submission({ id, createdAt, score, level }) {
  return {
    id,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@example.com',
    age: 32,
    gender: 'Uomo',
    answers: { obiettivo: 'Aumentare massa muscolare' },
    improvementGoal: 'Migliorare la qualità muscolare.',
    motivation: 'Allenarmi con un criterio misurabile.',
    score,
    level,
    profile: { code: level.toLowerCase() },
    questionnaireVersion: 'v1',
    privacyVersion: 'v1',
    marketingConsent: false,
    source: 'questionario',
    utm: {},
    idempotencyKey: `key-${id}`,
    deliveryTokenHash: `token-${id}`,
    ipHash: 'ip-hash',
    consentAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

test('Supabase lead listing keeps the newest submission for a repeated email', async () => {
  const repository = new SupabaseRepository('http://127.0.0.1:54321', 'test-key');
  const newest = submission({
    id: 'newest',
    createdAt: '2026-07-14T12:00:00.000Z',
    score: 82,
    level: 'Avanzato',
  });
  const oldest = submission({
    id: 'oldest',
    createdAt: '2026-06-14T12:00:00.000Z',
    score: 45,
    level: 'Intermedio',
  });

  repository.rawData = async () => ({
    waitlist: [],
    submissions: [newest, oldest],
    program: null,
  });

  const leads = await repository.listLeads({});

  assert.equal(leads.length, 1);
  assert.equal(leads[0].id, newest.id);
  assert.equal(leads[0].score, newest.score);
  assert.equal(leads[0].level, newest.level);
});

test('Supabase consumes a download token with an atomic conditional update', async () => {
  const repository = new SupabaseRepository('http://127.0.0.1:54321', 'test-key');
  const expected = submission({
    id: 'download',
    createdAt: '2026-07-23T12:00:00.000Z',
    score: 82,
    level: 'Avanzato',
  });
  let updatePayload;
  repository.supabase = {
    from(table) {
      assert.equal(table, 'questionnaire_submissions');
      return {
        update(payload) {
          updatePayload = payload;
          return {
            eq(column, value) {
              assert.equal(column, 'delivery_token_hash');
              assert.equal(value, 'original-token-hash');
              return {
                select(columns) {
                  assert.equal(columns, '*');
                  return {
                    async maybeSingle() {
                      return { data: dbSubmission(expected), error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const consumed = await repository.consumeDownloadTokenHash('original-token-hash');

  assert.equal(consumed.id, expected.id);
  assert.match(updatePayload.delivery_token_hash, /^used:/);
  assert.match(updatePayload.updated_at, /^\d{4}-\d{2}-\d{2}T/);
});

function dbSubmission(item) {
  return {
    id: item.id,
    first_name: item.firstName,
    last_name: item.lastName,
    email: item.email,
    age: item.age,
    gender: item.gender,
    answers: item.answers,
    improvement_goal: item.improvementGoal,
    motivation: item.motivation,
    score: item.score,
    level: item.level,
    profile: item.profile,
    questionnaire_version: item.questionnaireVersion,
    privacy_version: item.privacyVersion,
    marketing_consent: item.marketingConsent,
    source: item.source,
    utm: item.utm,
    idempotency_key: item.idempotencyKey,
    delivery_token_hash: item.deliveryTokenHash,
    ip_hash: item.ipHash,
    consent_at: item.consentAt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../questionario.html', import.meta.url), 'utf8');

function tagWithId(id) {
  const match = html.match(new RegExp(`<(?:input|select|textarea)[^>]*id="${id}"[^>]*>`, 'i'));
  assert.ok(match, `Campo ${id} non trovato`);
  return match[0];
}

test('i dati personali obbligatori espongono il vincolo nel markup', () => {
  for (const id of ['f-nome', 'f-cognome', 'f-email', 'f-eta', 'f-sesso', 'f-privacy']) {
    assert.match(tagWithId(id), /\brequired\b/i, `${id} deve essere obbligatorio`);
  }
});

test('le risposte aperte richiedono tra 8 e 1200 caratteri', () => {
  for (const id of ['f-chiave', 'f-perche']) {
    const tag = tagWithId(id);
    assert.match(tag, /\brequired\b/i);
    assert.match(tag, /\bminlength="8"/i);
    assert.match(tag, /\bmaxlength="1200"/i);
  }
});

test('gli errori del backend riportano alla domanda corretta', () => {
  assert.match(html, /improvementGoal\s*:\s*['"]open1['"]/);
  assert.match(html, /motivation\s*:\s*['"]open2['"]/);
  assert.match(html, /showServerValidation\(error\.field,\s*error\.message\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAnswers, saveAnswer } from '../src/storage.mjs';
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
test('text and checkmarks are restored from storage after reopening', () => {
  const disk = storage();
  saveAnswer(disk, 'reason', 'Хочу создавать сайты');
  saveAnswer(disk, 'programRead', true);
  assert.deepEqual(loadAnswers(disk), { reason: 'Хочу создавать сайты', programRead: true });
});
test('independent fields, clearing a field and unchecking are preserved', () => {
  const disk = storage();
  saveAnswer(disk, 'reason', 'Текст');
  saveAnswer(disk, 'courseGoal', 'Свой сайт');
  saveAnswer(disk, 'programRead', true);
  saveAnswer(disk, 'reason', '');
  saveAnswer(disk, 'programRead', false);
  assert.deepEqual(loadAnswers(disk), { reason: '', courseGoal: 'Свой сайт', programRead: false });
});
test('blocked browser storage reports a failure instead of pretending to save', () => {
  assert.throws(() => saveAnswer({setItem() { throw new Error('Storage disabled'); }}, 'reason', 'Текст'), /Storage disabled/);
});
test('invalid field types are rejected before writing', () => {
  const disk = storage();
  assert.throws(() => saveAnswer(disk, 'programRead', 'yes'));
  assert.throws(() => saveAnswer(disk, 'unknown', 'value'));
  assert.deepEqual(loadAnswers(disk), {});
});

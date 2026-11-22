// General checks of the model engine (no instruction needed). Tests of a single instruction belong next to it
// (e.g. instructions/<id>/…) and are added to `npm test` together with that instruction.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUnits, countPartsByStep, ModelError, validateModel } from '../src/ts/model.ts';

test('an empty model is valid and has no scroll segments', () => {
  const model = validateModel([]);
  assert.deepEqual(model, []);
  assert.deepEqual(buildUnits(model), []);
  assert.deepEqual(countPartsByStep(model), {});
});

test('the top level must be an array', () => {
  assert.throws(() => validateModel({}), ModelError);
});

test('unknown parts are rejected', () => {
  const el = { id: 'a', step: 1, order: 1, part: 'no_such_part', color: 'red', pos: [0, 0, 0], rot: 0, group: 'main' };
  assert.throws(() => validateModel([el]), ModelError);
});

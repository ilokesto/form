import { test, expect } from 'vitest';

import { FormArrayRebaser } from '../../src/core/array/FormArrayRebaser';
import { FormArrayMutationPlanner } from '../../src/core/array/FormArrayMutationPlanner';
import { FormStateReader } from '../../src/core/state/FormStateReader';
import { FormStateStore } from '../../src/core/state/FormStateStore';
import { FormPath } from '../../src/core/path/FormPath';

test('rebase preserves non-array fields', () => {
  const store = new FormStateStore({ email: 'a@example.com', items: [{ name: 'x' }] });
  const mutation = FormArrayMutationPlanner.push([{ name: 'x' }], ['k0'], { name: 'y' }, 'k1');

  const nextState = FormArrayRebaser.rebase(store.getState(), ['items'], mutation);

  expect(nextState.fields[FormPath.pathToKey(['email'])]).toMatchObject({ value: 'a@example.com' });
});

test('rebase moves child metadata to new index', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }, { name: 'b' }] });
  const previousKey = FormPath.pathToKey(['items', 1, 'name']);
  store.focusField(previousKey);
  store.touchField(previousKey);
  store.setErrorsByKey(previousKey, [{ message: 'Keep me' }]);

  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = FormArrayMutationPlanner.move(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], 1, 0);
  if (mutation === undefined) throw new TypeError('Expected move mutation');

  const nextState = FormArrayRebaser.rebase(store.getState(), ['items'], mutation);

  const movedField = nextState.fields[FormPath.pathToKey(['items', 0, 'name'])];
  expect(movedField.touched).toBe(true);
  expect(movedField.errors).toEqual([{ message: 'Keep me' }]);
  expect(movedField.isFocused).toBe(true);
});

test('rebase drops metadata for removed items', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }, { name: 'b' }] });
  const previousKey = FormPath.pathToKey(['items', 1, 'name']);
  store.setErrorsByKey(previousKey, [{ message: 'Drop me' }]);

  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = FormArrayMutationPlanner.remove(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], 1);
  if (mutation === undefined) throw new TypeError('Expected remove mutation');

  const nextState = FormArrayRebaser.rebase(store.getState(), ['items'], mutation);

  expect(nextState.fields[FormPath.pathToKey(['items', 0, 'name'])]).toBeDefined();
  expect(nextState.fields[FormPath.pathToKey(['items', 1, 'name'])]).toBeUndefined();
});

test('rebase updates arrayKeys', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }] });
  const mutation = FormArrayMutationPlanner.replace([{ name: 'x' }, { name: 'y' }], ['new0', 'new1']);

  const nextState = FormArrayRebaser.rebase(store.getState(), ['items'], mutation);

  expect(nextState.arrayKeys[FormPath.pathToKey(['items'])]).toEqual(['new0', 'new1']);
});

test('rebase preserves submit state from the original state', () => {
  const store = new FormStateStore({ items: [{ name: 'a' }] });
  store.beginSubmit();
  store.completeSubmit(true);

  const items = store.getValueAtPath(['items']);
  if (!Array.isArray(items)) throw new TypeError('Expected items to be an array');
  const mutation = FormArrayMutationPlanner.push(items, store.getState().arrayKeys[FormPath.pathToKey(['items'])], { name: 'b' }, 'new');

  const nextState = FormArrayRebaser.rebase(store.getState(), ['items'], mutation);

  expect(nextState.submitCount).toBe(1);
  expect(nextState.isSubmitted).toBe(true);
  expect(nextState.isSubmitSuccessful).toBe(true);
});

test('rebase with an earlier snapshot remains repeatable without changing its inputs or the live store', () => {
  const store = new FormStateStore({
    email: 'initial@example.com',
    items: [{ name: 'a' }, { name: 'b' }],
  });
  store.setValue(['email'], 'snapshot@example.com');
  store.setValue(['items', 1, 'name'], 'B', { source: 'user' });
  store.setErrorsByKey(FormPath.pathToKey(['items', 1, 'name']), [{ message: 'Keep me' }]);
  const previousState = store.getState();
  const originalSnapshot = structuredClone(previousState);
  const values = FormStateReader.getValues(previousState);
  const mutation = FormArrayMutationPlanner.move(values.items, previousState.arrayKeys[FormPath.pathToKey(['items'])], 1, 0);
  if (mutation === undefined) throw new TypeError('Expected move mutation');
  Object.freeze(mutation.values);
  Object.freeze(mutation.keys);
  store.reset({ email: 'live@example.com', items: [] });
  const liveState = store.getState();

  const nextState = FormArrayRebaser.rebase(previousState, ['items'], mutation);
  const repeatedState = FormArrayRebaser.rebase(previousState, ['items'], mutation);

  expect(repeatedState).toEqual(nextState);
  expect(previousState).toEqual(originalSnapshot);
  expect(store.getState()).toBe(liveState);
  expect(mutation.values).toEqual([{ name: 'B' }, { name: 'a' }]);
  expect(mutation.keys).toEqual(['initial-1', 'initial-0']);
  expect(FormStateReader.getValues(nextState)).toEqual({
    email: 'snapshot@example.com',
    items: [{ name: 'B' }, { name: 'a' }],
  });
  expect(nextState.defaultValues).toEqual(FormStateReader.getValues(nextState));
  expect(nextState.fields[FormPath.pathToKey(['items', 0, 'name'])]).toMatchObject({
    value: 'B',
    errors: [{ message: 'Keep me' }],
    dirty: true,
    modified: true,
  });
});

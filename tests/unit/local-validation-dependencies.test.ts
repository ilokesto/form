import { expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import type { FieldPathInput } from '../../src/core/index';
import { createControlledSchema } from '../fixtures/helpers/controlledValidation';

const defaults = () => ({
  email: 'bad',
  name: '',
  profile: { name: 'Ada', members: ['same', 'same'] },
  items: [{ name: 'same' }, { name: 'same' }, { name: 'same' }],
  tags: [] as string[],
});
type Values = ReturnType<typeof defaults>;
type Change = { label: string; mutate: (form: CreateForm<Values>) => void };

async function pendingLocal(path: FieldPathInput = 'email') {
  const controlled = createControlledSchema<unknown>();
  const form = new CreateForm({ defaultValues: defaults() });
  form.registerFieldSchema(path, { schema: controlled.schema });
  const started = controlled.nextValidation();
  const validation = form.trigger(path);
  const result = await started;
  return { form, controlled, validation, result };
}

const unrelatedChanges: Change[] = [
  { label: 'sibling value', mutate: form => form.setValue('name', 'Ada') },
  { label: 'new value path', mutate: form => form.setValue('extra', undefined) },
  { label: 'new metadata path', mutate: form => form.focus('missing') },
  { label: 'unrelated array', mutate: form => form.array('tags').push('tag') },
];

test.each(unrelatedChanges)('local validation: unrelated $label -> pending errors are applied', async ({ mutate }) => {
  const { form, validation, result } = await pendingLocal();

  mutate(form);
  result.resolve({ issues: [{ message: 'Email error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Email error']);
});

const unrelatedItems: Change[] = [
  { label: 'another item value', mutate: form => form.setValue(['items', 1, 'name'], 'changed') },
  { label: 'append', mutate: form => form.array('items').push({ name: 'new' }) },
  { label: 'remove another item', mutate: form => form.array('items').remove(2) },
  { label: 'swap other items', mutate: form => form.array('items').swap(1, 2) },
  { label: 'sibling array rebase', mutate: form => form.array('tags').push('tag') },
];

test.each(unrelatedItems)('local item validation: $label leaves the target key unchanged -> errors survive', async ({ mutate }) => {
  const path = ['items', 0, 'name'];
  const { form, validation, result } = await pendingLocal(path);

  mutate(form);
  result.resolve({ issues: [{ message: 'Item error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState(path).errors.map(error => error.message)).toEqual(['Item error']);
});

test.each(['profile', 'items'])('local %s container: sibling array rebase copies key lists -> unchanged item identities still match', async path => {
  const { form, validation, result } = await pendingLocal(path);

  form.array('tags').push('tag');
  result.resolve({ issues: [{ message: 'Container error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState(path).errors.map(error => error.message)).toEqual(['Container error']);
});

const relevantChanges: (Change & { path: FieldPathInput })[] = [
  { label: 'target value', path: 'email', mutate: form => form.setValue('email', 'changed') },
  { label: 'owned ancestor', path: ['profile', 'name'], mutate: form => form.setValue('profile', undefined) },
  { label: 'container child', path: 'profile', mutate: form => form.setValue(['profile', 'name'], 'Grace') },
  { label: 'array child', path: 'items', mutate: form => form.setValue(['items', 0, 'name'], 'changed') },
  { label: 'array append', path: 'items', mutate: form => form.array('items').push({ name: 'new' }) },
  { label: 'array length property', path: ['items', 'length'], mutate: form => form.array('items').push({ name: 'new' }) },
  { label: 'moved equal-valued item', path: ['items', 0, 'name'], mutate: form => form.array('items').move(0, 1) },
  { label: 'removed equal-valued item', path: ['items', 0, 'name'], mutate: form => form.array('items').remove(0) },
  { label: 'replaced equal-valued items', path: ['items', 0, 'name'], mutate: form => form.array('items').replace(defaults().items) },
  { label: 'nested equal-valued array order', path: 'profile', mutate: form => form.array(['profile', 'members']).swap(0, 1) },
  { label: 'whole equal-valued array order', path: 'items', mutate: form => form.array('items').swap(0, 1) },
  { label: 'numeric string array index', path: ['items', '0', 'name'], mutate: form => form.array('items').move(0, 1) },
];

test.each(relevantChanges)('local validation: relevant $label -> stale results cannot write errors', async ({ path, mutate }) => {
  const { form, validation, result } = await pendingLocal(path);
  mutate(form);
  const notifications: unknown[] = [];
  const unsubscribe = form.subscribe(() => notifications.push(form.getState()));

  result.resolve({ issues: [{ message: 'Stale error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState(path).errors).toEqual([]);
  expect(notifications).toHaveLength(0);
  unsubscribe();
});

test('local validation: form schema exists but is not used -> unrelated edits do not discard local errors', async () => {
  const global = createControlledSchema<Values>();
  const local = createControlledSchema<string>();
  const form = new CreateForm({ defaultValues: defaults(), schema: global.schema });
  form.registerFieldSchema('email', { schema: local.schema });
  const started = local.nextValidation();
  const validation = form.trigger('email');
  const result = await started;

  form.setValue('name', 'Ada');
  result.resolve({ issues: [{ message: 'Local error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Local error']);
  expect(global.validations).toHaveLength(0);
});

test.each(['local phase', 'form phase'] as const)('mixed validation: unrelated edits during %s -> whole-form dependencies still reject stale work', async phase => {
  const global = createControlledSchema<Values>();
  const local = createControlledSchema<string>();
  const form = new CreateForm({ defaultValues: defaults(), schema: global.schema });
  form.registerFieldSchema('email', { schema: local.schema });
  const localStarted = local.nextValidation();
  const globalStarted = phase === 'form phase' ? global.nextValidation() : undefined;
  const validation = form.trigger('email', 'name');
  const localResult = await localStarted;

  if (globalStarted) {
    localResult.resolve({ value: 'bad' });
    const globalResult = await globalStarted;
    form.setValue('extra', undefined);
    globalResult.resolve({ issues: [{ message: 'Stale form error', path: ['name'] }] });
  } else {
    form.setValue('extra', undefined);
    localResult.resolve({ issues: [{ message: 'Stale local error' }] });
  }

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([]);
  expect(form.getFieldState('name').errors).toEqual([]);
  expect(global.validations).toHaveLength(globalStarted ? 1 : 0);
});

test('field form fallback: a sibling value changes -> cross-field schema results remain stale', async () => {
  const global = createControlledSchema<Values>();
  const form = new CreateForm({ defaultValues: defaults(), schema: global.schema });
  const started = global.nextValidation();
  const validation = form.trigger('email');
  const result = await started;

  form.setValue('name', 'Ada');
  result.resolve({ issues: [{ message: 'Stale fallback error', path: ['email'] }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([]);
});

test.each(['same defaults', 'new defaults', 'keep dirty values'] as const)('local validation: reset with %s -> pending errors cannot reappear', async mode => {
  const controlled = createControlledSchema<string>();
  const form = new CreateForm({ defaultValues: { email: 'same', name: '' } });
  form.registerFieldSchema('email', { schema: controlled.schema });
  if (mode === 'keep dirty values') {
    form.setValue('name', 'Ada', { source: 'user' });
  }
  const started = controlled.nextValidation();
  const validation = form.trigger('email');
  const result = await started;

  form.reset(mode === 'new defaults' ? { email: 'same', name: 'new' } : undefined, {
    keepDirtyValues: mode === 'keep dirty values',
  });
  result.resolve({ issues: [{ message: 'Pre-reset error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([]);
});

test('local validation: a newer run supersedes an older run after unrelated edits -> only the newer errors apply', async () => {
  const { form, controlled, validation: older, result: olderResult } = await pendingLocal();
  form.setValue('name', 'Ada');
  const started = controlled.nextValidation();
  const newer = form.trigger('email');
  const newerResult = await started;

  newerResult.resolve({ issues: [{ message: 'Newer error' }] });
  expect(await newer).toBe(false);
  olderResult.resolve({ issues: [{ message: 'Older error' }] });

  expect(await older).toBe(false);
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Newer error']);
});

test.each(['full', 'submit'] as const)('local validation: %s validation supersedes it -> late local errors remain rejected', async scope => {
  const { form, controlled, validation, result } = await pendingLocal();
  const started = controlled.nextValidation();
  const authoritative = scope === 'full' ? form.trigger() : form.submit(() => 'saved');
  const currentResult = await started;

  currentResult.resolve({ value: 'bad' });
  expect(await authoritative).toBe(scope === 'full' ? true : 'saved');
  result.resolve({ issues: [{ message: 'Late local error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([]);
});

test('submit validation: only local schemas exist and an unrelated value changes -> retry validates the latest form before submission', async () => {
  const controlled = createControlledSchema<string>();
  const form = new CreateForm({ defaultValues: defaults() });
  form.registerFieldSchema('email', { schema: controlled.schema });
  let submitted: Values | undefined;
  const started = controlled.nextValidation();
  const submission = form.submit(values => {
    submitted = values;
    return 'saved';
  });
  const firstResult = await started;

  form.setValue('name', 'Ada');
  const retryStarted = controlled.nextValidation();
  firstResult.resolve({ value: 'bad' });
  const retryResult = await retryStarted;
  expect(submitted).toBeUndefined();
  retryResult.resolve({ value: 'bad' });

  expect(await submission).toBe('saved');
  expect(submitted).toEqual({ ...defaults(), name: 'Ada' });
});

test('local root validation: metadata-only paths are added -> unchanged reconstructed root still accepts errors', async () => {
  const { form, validation, result } = await pendingLocal([]);

  form.focus('missing');
  form.setErrors('profile', [{ message: 'Metadata error' }]);
  result.resolve({ issues: [{ message: 'Root error' }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState([]).errors.map(error => error.message)).toEqual(['Root error']);
  expect(form.getValues()).toStrictEqual(defaults());
});

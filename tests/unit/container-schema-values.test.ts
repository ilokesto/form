import { expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import type { StandardSchemaV1 } from '../../src/index';
import type { FieldPathInput } from '../../src/core/index';

function recordSchema(inputs: unknown[]): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(value) {
        inputs.push(value);
        return { value };
      },
    },
  };
}

test.each(['field', 'full', 'submit'] as const)(
  'local %s validation: array, object and root schemas -> reconstructed values override form errors',
  async scope => {
    const defaults = { topics: ['state'], profile: { name: 'Ada' } };
    const form = new CreateForm({
      defaultValues: defaults,
      schema: {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: () => ({
            issues: [
              { message: 'Form array error', path: ['topics'] },
              { message: 'Form object error', path: ['profile'] },
              { message: 'Form root error' },
            ],
          }),
        },
      },
    });
    const arrays: unknown[] = [];
    const objects: unknown[] = [];
    const roots: unknown[] = [];
    form.registerFieldSchema('topics', { schema: recordSchema(arrays) });
    form.registerFieldSchema('profile', { schema: recordSchema(objects) });
    form.registerFieldSchema([], { schema: recordSchema(roots) });

    const result = scope === 'field'
      ? await form.trigger('topics', 'profile', [])
      : scope === 'full'
        ? await form.trigger()
        : await form.submit(() => true);

    expect(result).toBe(true);
    expect(arrays).toEqual([['state']]);
    expect(objects).toEqual([{ name: 'Ada' }]);
    expect(roots).toEqual([defaults]);
    expect(form.getValues()).toEqual(defaults);
    expect(form.getFieldState('topics').errors).toEqual([]);
    expect(form.getFieldState('profile').errors).toEqual([]);
    expect(form.getFieldState([]).errors).toEqual([]);
  },
);

const specialCases: { label: string; defaults: unknown; path: FieldPathInput; expected: unknown }[] = [
  { label: 'root array', defaults: ['state'], path: [], expected: ['state'] },
  { label: 'empty array', defaults: { topics: [] }, path: 'topics', expected: [] },
  { label: 'empty object', defaults: { profile: {} }, path: 'profile', expected: {} },
  { label: 'undefined root', defaults: undefined, path: [], expected: undefined },
  { label: 'undefined leaf', defaults: { optional: undefined }, path: 'optional', expected: undefined },
  { label: 'missing path', defaults: { email: '' }, path: 'missing', expected: undefined },
  { label: 'null leaf', defaults: { profile: null }, path: 'profile', expected: null },
  {
    label: 'literal dotted name',
    defaults: { 'profile.name': ['literal'], profile: { name: ['nested'] } },
    path: 'profile.name',
    expected: ['literal'],
  },
  {
    label: 'nested tuple path',
    defaults: { 'profile.name': ['literal'], profile: { name: ['nested'] } },
    path: ['profile', 'name'],
    expected: ['nested'],
  },
];

test.each(specialCases)('local validation: $label -> current value is passed without a default fallback', async ({ defaults, path, expected }) => {
  const form = new CreateForm({ defaultValues: defaults });
  const inputs: unknown[] = [];
  form.registerFieldSchema(path, { schema: recordSchema(inputs) });
  form.focus(path);

  expect(await form.trigger(path)).toBe(true);

  expect(inputs).toStrictEqual([expected]);
  expect(form.getValues()).toStrictEqual(defaults);
});

test('local schemas: child edits and array mutations after metadata writes -> each validation reads latest containers', async () => {
  const form = new CreateForm({
    defaultValues: { items: [{ name: 'a' }, { name: 'b' }], profile: { name: 'Ada' } },
  });
  const arrays: unknown[] = [];
  const objects: unknown[] = [];
  const roots: unknown[] = [];
  form.registerFieldSchema('items', { schema: recordSchema(arrays) });
  form.registerFieldSchema('profile', { schema: recordSchema(objects) });
  form.registerFieldSchema([], { schema: recordSchema(roots) });
  form.focus('items');
  form.setErrors('profile', [{ message: 'Old error' }]);
  form.setErrors([], [{ message: 'Old root error' }]);
  form.setValue(['items', 1, 'name'], 'B');
  form.setValue(['profile', 'name'], 'Grace');
  form.array('items').push({ name: 'c' });
  form.array('items').move(1, 0);

  expect(await form.trigger('items', 'profile', [])).toBe(true);
  form.array('items').remove(2);
  form.setValue(['profile', 'name'], 'Lin');
  expect(await form.trigger()).toBe(true);

  const firstItems = [{ name: 'B' }, { name: 'a' }, { name: 'c' }];
  const secondItems = [{ name: 'B' }, { name: 'a' }];
  expect(arrays).toEqual([firstItems, secondItems]);
  expect(objects).toEqual([{ name: 'Grace' }, { name: 'Lin' }]);
  expect(roots).toEqual([
    { items: firstItems, profile: { name: 'Grace' } },
    { items: secondItems, profile: { name: 'Lin' } },
  ]);
  expect(form.getValues()).toEqual(roots[1]);
  expect(form.getFieldState('items').isFocused).toBe(true);
  expect(form.getFieldState('profile').errors).toEqual([]);
  expect(form.getFieldState([]).errors).toEqual([]);
});

test('local schemas: explicit undefined replaces containers -> undefined is validated and value ownership survives errors', async () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'], profile: { name: 'Ada' } } });
  const arrays: unknown[] = [];
  const objects: unknown[] = [];
  const roots: unknown[] = [];
  form.registerFieldSchema('topics', { schema: recordSchema(arrays) });
  form.registerFieldSchema('profile', { schema: recordSchema(objects) });
  form.registerFieldSchema([], { schema: recordSchema(roots) });
  form.focus('topics');
  form.setErrors('profile', [{ message: 'Old error' }]);
  form.setValue('topics', undefined);
  form.setValue('profile', undefined);

  expect(await form.trigger()).toBe(true);

  expect(arrays).toStrictEqual([undefined]);
  expect(objects).toStrictEqual([undefined]);
  expect(roots).toStrictEqual([{ topics: undefined, profile: undefined }]);
  expect(form.getValues()).toStrictEqual({ topics: undefined, profile: undefined });
});

test('local schemas: invalid containers become valid -> errors apply and clear without changing values', async () => {
  const form = new CreateForm({ defaultValues: { topics: [] as string[], profile: { name: '' } } });
  const schemaFor = (check: (value: unknown) => boolean, message: string): StandardSchemaV1 => ({
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: value => check(value) ? { value } : { issues: [{ message }] },
    },
  });
  form.registerFieldSchema('topics', {
    schema: schemaFor(value => Array.isArray(value) && value.length > 0, 'Choose a topic'),
  });
  form.registerFieldSchema('profile', {
    schema: schemaFor(value => typeof value === 'object' && value !== null && 'name' in value && value.name === 'Grace', 'Enter Grace'),
  });
  form.registerFieldSchema([], {
    schema: schemaFor(value => typeof value === 'object' && value !== null && 'topics' in value && Array.isArray(value.topics) && value.topics.length > 0, 'Root needs topics'),
  });

  expect(await form.trigger()).toBe(false);
  expect(form.getFieldState('topics').errors.map(error => error.message)).toEqual(['Choose a topic']);
  expect(form.getFieldState('profile').errors.map(error => error.message)).toEqual(['Enter Grace']);
  expect(form.getFieldState([]).errors.map(error => error.message)).toEqual(['Root needs topics']);
  expect(form.getValues()).toEqual({ topics: [], profile: { name: '' } });
  form.array('topics').push('state');
  form.setValue(['profile', 'name'], 'Grace');
  expect(await form.trigger('topics', 'profile', [])).toBe(true);

  expect(form.getValues()).toEqual({ topics: ['state'], profile: { name: 'Grace' } });
  expect(form.getFieldState('topics').errors).toEqual([]);
  expect(form.getFieldState('profile').errors).toEqual([]);
  expect(form.getFieldState([]).errors).toEqual([]);
});

test('local async container validation: child changes while pending -> stale errors are rejected and next run reads current values', async () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'] } });
  const inputs: unknown[] = [];
  const pending = Promise.withResolvers<StandardSchemaV1.Result<unknown>>();
  form.registerFieldSchema('topics', {
    schema: {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate(value) {
          inputs.push(value);
          return inputs.length === 1 ? pending.promise : { value };
        },
      },
    },
  });

  const validation = form.trigger('topics');
  form.setValue(['topics', 0], 'react');
  pending.resolve({ issues: [{ message: 'Stale container error' }] });
  expect(await validation).toBe(false);
  expect(form.getFieldState('topics').errors).toEqual([]);
  expect(await form.trigger('topics')).toBe(true);

  expect(inputs).toEqual([['state'], ['react']]);
  expect(form.getValues()).toEqual({ topics: ['react'] });
});

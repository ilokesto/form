import { expect, test } from 'vitest';

import { createControlledForm, createControlledSchema } from './helpers/controlledValidation';

test('Given independent field validations, when they resolve out of order, then both apply their own errors', async () => {
  const { form, nextValidation } = createControlledForm();

  const emailStarted = nextValidation();
  const emailValidation = form.trigger('email');
  const emailResult = await emailStarted;
  const nameStarted = nextValidation();
  const nameValidation = form.trigger('name');
  const nameResult = await nameStarted;
  nameResult.resolve({
    issues: [{ message: 'Name is invalid', path: ['name'] }],
  });
  emailResult.resolve({
    issues: [{ message: 'Email is invalid', path: ['email'] }],
  });

  expect(await emailValidation).toBe(false);
  expect(await nameValidation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Email is invalid', type: 'standard_schema' },
  ]);
  expect(form.getFieldState('name').errors).toEqual([
    { message: 'Name is invalid', type: 'standard_schema' },
  ]);
});

test('Given two validations for one field, when the older resolves last, then it cannot overwrite the newer result', async () => {
  const { form, nextValidation } = createControlledForm();

  const olderStarted = nextValidation();
  const older = form.trigger('email');
  const olderResult = await olderStarted;
  const newerStarted = nextValidation();
  const newer = form.trigger('email');
  const newerResult = await newerStarted;
  newerResult.resolve({
    issues: [{ message: 'Current error', path: ['email'] }],
  });
  expect(await newer).toBe(false);
  olderResult.resolve({ value: { email: '', name: '' } });

  expect(await older).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Current error', type: 'standard_schema' },
  ]);
});

test('Given pending field validation, when full validation starts, then only the full result applies', async () => {
  const { form, nextValidation } = createControlledForm();
  const fieldStarted = nextValidation();
  const fieldValidation = form.trigger('email');
  const fieldResult = await fieldStarted;
  const fullStarted = nextValidation();
  const fullValidation = form.trigger();
  const fullResult = await fullStarted;

  fullResult.resolve({
    issues: [{ message: 'Full error', path: ['email'] }],
  });
  expect(await fullValidation).toBe(false);
  fieldResult.resolve({ value: { email: '', name: '' } });

  expect(await fieldValidation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Full error', type: 'standard_schema' },
  ]);
});

test('Given a replaced field schema, when its old cleanup runs, then current validation remains authoritative', async () => {
  const { form, validations } = createControlledForm();
  const olderSchema = createControlledSchema<string>();
  const newerSchema = createControlledSchema<string>();
  const cleanupOlder = form.registerFieldSchema('email', { schema: olderSchema.schema });
  const olderStarted = olderSchema.nextValidation();
  const older = form.trigger('email');
  const olderResult = await olderStarted;

  form.registerFieldSchema('email', { schema: newerSchema.schema });
  const newerStarted = newerSchema.nextValidation();
  const newer = form.trigger('email');
  const newerResult = await newerStarted;
  cleanupOlder();
  newerResult.resolve({ issues: [{ message: 'New registration error' }] });
  expect(await newer).toBe(false);
  olderResult.resolve({ value: '' });

  expect(await older).toBe(false);
  expect(validations).toHaveLength(0);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'New registration error', type: 'standard_schema' },
  ]);
});

test.each(['field', 'full'] as const)(
  'Given pending %s validation, when the active local schema is removed, then its result cannot write errors',
  async (scope) => {
    const { form, nextValidation } = createControlledForm();
    const localSchema = createControlledSchema<string>();
    const cleanup = form.registerFieldSchema('email', { schema: localSchema.schema });
    const localStarted = localSchema.nextValidation();
    const formStarted = scope === 'full' ? nextValidation() : undefined;
    const validation = scope === 'full' ? form.trigger() : form.trigger('email');
    if (formStarted) {
      (await formStarted).resolve({ value: { email: '', name: '' } });
    }
    const localResult = await localStarted;
    const notifications: unknown[] = [];
    const unsubscribe = form.subscribe(() => notifications.push(form.getState()));

    cleanup();
    localResult.resolve({ issues: [{ message: 'Removed schema error' }] });

    expect(await validation).toBe(false);
    expect(notifications).toHaveLength(0);
    expect(form.getFieldState('email').errors).toEqual([]);
    unsubscribe();

    const fallbackStarted = nextValidation();
    const fallback = form.trigger('email');
    (await fallbackStarted).resolve({
      issues: [{ message: 'Form fallback error', path: ['email'] }],
    });
    expect(await fallback).toBe(false);
    expect(form.getFieldState('email').errors).toEqual([
      { message: 'Form fallback error', type: 'standard_schema' },
    ]);
  },
);

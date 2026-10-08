import { expect, test } from 'vitest';

import {
  createControlledForm,
  createDeferred,
} from './helpers/controlledValidation';
import type { Values } from './helpers/controlledValidation';

test('Given submit validation made stale by change validation, when the old result is valid, then submit waits for authoritative invalid validation', async () => {
  const { form, nextValidation } = createControlledForm();
  let validCalls = 0;
  let invalidCalls = 0;

  const submitStarted = nextValidation();
  const submission = form.submit(
    () => {
      validCalls += 1;
      return 'submitted';
    },
    () => {
      invalidCalls += 1;
    },
  );
  const submitResult = await submitStarted;
  const changeStarted = nextValidation();
  form.setValue('email', 'invalid', { validate: true });
  const changeResult = await changeStarted;
  const retryStarted = nextValidation();
  submitResult.resolve({ value: { email: '', name: '' } });
  const retryResult = await retryStarted;

  expect(validCalls).toBe(0);
  changeResult.resolve({ value: { email: 'invalid', name: '' } });
  retryResult.resolve({
    issues: [{ message: 'Current email is invalid', path: ['email'] }],
  });

  expect(await submission).toBeUndefined();
  expect(validCalls).toBe(0);
  expect(invalidCalls).toBe(1);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Current email is invalid', type: 'standard_schema' },
  ]);
});

test('Given values change without automatic validation, when pending submit validation resolves, then submit revalidates current values', async () => {
  const { form, nextValidation } = createControlledForm();
  let submittedValues: Values | undefined;

  const submitStarted = nextValidation();
  const submission = form.submit((values) => {
    submittedValues = values;
    return 'submitted';
  });
  const submitResult = await submitStarted;
  form.setValue('email', 'latest');
  const retryStarted = nextValidation();
  submitResult.resolve({ value: { email: '', name: '' } });
  const retryResult = await retryStarted;

  expect(submittedValues).toBeUndefined();
  retryResult.resolve({ value: { email: 'latest', name: '' } });

  expect(await submission).toBe('submitted');
  expect(submittedValues).toEqual({ email: 'latest', name: '' });
});

test('Given concurrent submits with deferred callbacks, when each callback completes, then both submissions settle in sequence', async () => {
  const { form, nextValidation, validations } = createControlledForm();
  const callbackOrder: string[] = [];
  const firstCallbackStarted = createDeferred<void>();
  const secondCallbackStarted = createDeferred<void>();
  const firstCallback = createDeferred<void>();
  const secondCallback = createDeferred<void>();

  const firstStarted = nextValidation();
  const firstSubmission = form.submit(async () => {
    callbackOrder.push('first');
    firstCallbackStarted.resolve();
    await firstCallback.promise;
    return 'first result';
  });
  const secondSubmission = form.submit(async () => {
    callbackOrder.push('second');
    secondCallbackStarted.resolve();
    await secondCallback.promise;
    return 'second result';
  });

  const firstResult = await firstStarted;
  expect(form.getState().submitCount).toBe(2);
  expect(form.getState().isSubmitting).toBe(true);

  firstResult.resolve({ value: { email: '', name: '' } });
  await firstCallbackStarted.promise;

  expect(callbackOrder).toEqual(['first']);
  expect(validations).toHaveLength(1);
  expect(form.getState().isSubmitting).toBe(true);

  const secondStarted = nextValidation();
  firstCallback.resolve();
  const secondResult = await secondStarted;
  secondResult.resolve({ value: { email: '', name: '' } });
  await secondCallbackStarted.promise;

  expect(callbackOrder).toEqual(['first', 'second']);
  expect(form.getState().isSubmitting).toBe(true);

  secondCallback.resolve();
  expect(await Promise.all([firstSubmission, secondSubmission])).toEqual([
    'first result',
    'second result',
  ]);
  expect(form.getState().isSubmitting).toBe(false);
  expect(form.getState().isSubmitted).toBe(true);
  expect(form.getState().isSubmitSuccessful).toBe(true);
});

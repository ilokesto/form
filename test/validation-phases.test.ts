import { expect, test } from 'vitest';

import { createControlledForm, createControlledSchema } from './helpers/controlledValidation';

test.each(['field', 'full'] as const)(
  'Given %s validation with local overrides, when schemas settle, then execution and per-field notifications retain their order',
  async (scope) => {
    const { form, nextValidation, validations } = createControlledForm();
    const localSchema = createControlledSchema<string>();
    form.registerFieldSchema('email', { schema: localSchema.schema });
    form.setErrors('email', [{ message: 'Previous error' }]);
    const notifications: string[][][] = [];
    const unsubscribe = form.subscribe(() => {
      notifications.push([
        form.getFieldState('email').errors.map(error => error.message),
        form.getFieldState('name').errors.map(error => error.message),
      ]);
    });
    const formStarted = nextValidation();
    const localStarted = localSchema.nextValidation();
    const formResult = {
      issues: [
        { message: 'Overridden email error', path: ['email'] },
        { message: 'Name error', path: ['name'] },
      ],
    };

    const validation = scope === 'full' ? form.trigger() : form.trigger('email', 'name');
    if (scope === 'field') {
      const localResult = await localStarted;
      expect(validations).toHaveLength(0);
      localResult.resolve({ value: '' });
      (await formStarted).resolve(formResult);
    } else {
      const result = await formStarted;
      expect(localSchema.validations).toHaveLength(0);
      result.resolve(formResult);
      (await localStarted).resolve({ value: '' });
    }

    expect(await validation).toBe(false);
    expect(form.getFieldState('email').errors).toEqual([]);
    expect(form.getFieldState('name').errors).toEqual([
      { message: 'Name error', type: 'standard_schema' },
    ]);
    expect(notifications).toEqual(scope === 'field'
      ? [[['Previous error'], ['Name error']], [[], ['Name error']]]
      : [[[], []], [[], ['Name error']]]);
    unsubscribe();
  },
);

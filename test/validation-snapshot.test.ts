import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import { createControlledForm, createControlledSchema } from './helpers/controlledValidation';

test.each(['value', 'field count', 'array identity', 'array count'] as const)(
  'Given pending validation, when %s changes, then the captured result cannot write errors',
  async (change) => {
    const defaultValues = { email: '', items: ['', ''] };
    const controlled = createControlledSchema<typeof defaultValues>();
    const form = new CreateForm({ defaultValues, schema: controlled.schema });
    const started = controlled.nextValidation();
    const validation = form.trigger();
    const result = await started;

    switch (change) {
      case 'value':
        form.setValue('email', 'changed');
        break;
      case 'field count':
        form.setValue('extra', undefined);
        break;
      case 'array identity':
        form.array('items').swap(0, 1);
        expect(form.getValues()).toEqual(defaultValues);
        break;
      case 'array count':
        form.array('extra').replace([]);
        break;
    }
    const notifications: unknown[] = [];
    const unsubscribe = form.subscribe(() => notifications.push(form.getState()));
    result.resolve({ issues: [{ message: 'Stale error', path: ['email'] }] });

    expect(await validation).toBe(false);
    expect(notifications).toHaveLength(0);
    expect(form.getFieldState('email').errors).toEqual([]);
    unsubscribe();
  },
);

test('Given pending validation, when existing field metadata changes, then the unchanged value snapshot still accepts errors', async () => {
  const { form, nextValidation } = createControlledForm();
  const started = nextValidation();
  const validation = form.trigger();
  const result = await started;

  form.focus('email');
  await form.blur('email');
  result.resolve({ issues: [{ message: 'Current error', path: ['email'] }] });

  expect(await validation).toBe(false);
  expect(form.getFieldState('email').errors).toEqual([
    { message: 'Current error', type: 'standard_schema' },
  ]);
  expect(form.getFieldState('email').touched).toBe(true);
});

import { expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import type { FieldPathInput } from '../../src/core/index';

const paths: FieldPathInput[] = ['topics', 'profile', [], 'missing'];

test.each(paths.map(path => ({ path })))('metadata writes: path $path -> current values survive each notification', async ({ path }) => {
  const defaults = { topics: ['state'], profile: { name: 'Ada' }, optional: undefined };
  const form = new CreateForm({ defaultValues: defaults });
  const observed: unknown[] = [];
  const unsubscribe = form.subscribe(() => observed.push(form.getValues()));

  form.focus(path);
  await form.blur(path);
  form.setErrors(path, [{ message: 'Server error' }]);
  expect(form.getFieldState(path).errors).toEqual([{ message: 'Server error' }]);
  form.clearErrors(path);

  expect(observed).toHaveLength(5);
  observed.forEach(values => expect(values).toStrictEqual(defaults));
  expect(form.getFieldState(path)).toMatchObject({
    isFocused: false,
    touched: true,
    errors: [],
  });
  unsubscribe();
});

test('full validation: root and container issues -> errors never replace values', async () => {
  const defaults = { topics: ['state'], profile: { name: 'Ada' } };
  const inputs: unknown[] = [];
  const form = new CreateForm({
    defaultValues: defaults,
    schema: {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate(value) {
          inputs.push(value);
          return {
            issues: [
              { message: 'Form error' },
              { message: 'Array error', path: ['topics'] },
              { message: 'Object error', path: ['profile'] },
            ],
          };
        },
      },
    },
  });

  expect(await form.trigger()).toBe(false);
  expect(form.getFieldState([]).errors).toEqual([{ type: 'standard_schema', message: 'Form error' }]);
  expect(form.getFieldState('topics').errors).toEqual([{ type: 'standard_schema', message: 'Array error' }]);
  expect(await form.submit(() => 'unexpected')).toBeUndefined();
  form.clearErrors();

  expect(inputs).toEqual([defaults, defaults]);
  expect(form.getValues()).toEqual(defaults);
  expect(form.getFieldState([]).errors).toEqual([]);
  expect(form.getState().isSubmitSuccessful).toBe(false);
});

test('container metadata: later child writes and array mutations -> latest values remain authoritative', () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'], profile: { name: 'Ada' } } });
  form.focus('topics');
  form.setErrors('profile', [{ message: 'Profile error' }]);
  form.setErrors([], [{ message: 'Form error' }]);

  form.setValue(['profile', 'name'], 'Grace');
  form.setValue(['topics', 0], 'react');
  form.array('topics').push('vue');

  expect(form.getValues()).toEqual({ topics: ['react', 'vue'], profile: { name: 'Grace' } });
  expect(form.getFieldState('topics').isFocused).toBe(true);
  expect(form.getFieldState('profile').errors).toEqual([{ message: 'Profile error' }]);
  expect(form.getFieldState([]).errors).toEqual([{ message: 'Form error' }]);
});

test('setValue: metadata-only field receives explicit undefined -> write and metadata are preserved', async () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'] } });
  form.focus('topics');
  await form.blur('topics');
  form.setErrors('topics', [{ message: 'Keep error' }]);

  form.setValue('topics', undefined);
  form.clearErrors();

  expect(form.getValues()).toEqual({ topics: undefined });
  expect(form.getFieldState('topics')).toMatchObject({
    value: undefined,
    touched: true,
    errors: [],
    dirty: true,
    modified: false,
  });
});

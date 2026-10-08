import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';

test('blur: focused field -> subscribers observe unfocus before touch', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  form.focus('email');
  const observed: { focused: boolean; touched: boolean }[] = [];
  const unsubscribe = form.subscribe(() => {
    const field = form.getFieldState('email');
    observed.push({ focused: field.isFocused, touched: field.touched });
  });

  await form.blur('email');

  expect(observed).toEqual([
    { focused: false, touched: false },
    { focused: false, touched: true },
  ]);
  unsubscribe();
});

test('setValue: user write -> subscribers receive the value and metadata synchronously', () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  const observed: unknown[] = [];
  const unsubscribe = form.subscribe(() => {
    const field = form.getFieldState('email');
    observed.push({ value: field.value, dirty: field.dirty, modified: field.modified });
  });

  form.setValue('email', 'edited', { source: 'user' });

  expect(observed).toEqual([{ value: 'edited', dirty: true, modified: true }]);
  unsubscribe();
});

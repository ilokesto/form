// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import type { Form, StandardSchemaV1 } from '../../src/index';
import { useForm } from '../../src/react/index';
import type { RegisterOptions } from '../../src/react/index';
import { createControlledSchema } from '../fixtures/helpers/controlledValidation';

afterEach(cleanup);

test.each(['single', 'array', 'rest', 'field'] as const)(
  '%s registration: equivalent tuple paths and ordinary rerenders -> pending change errors survive',
  async mode => {
    const controlled = createControlledSchema<string>();
    const schemaOptions = { libraryOptions: { mode: 'stable' } };
    const form = new CreateForm({
      defaultValues: { user: { email: '' }, name: '' },
      validateOn: ['change'],
    });
    function Example({ tick }: { tick: number }) {
      const api = useForm(form);
      const options = { name: ['user', 'email'], schema: controlled.schema, schemaOptions };
      const binding = mode === 'field'
        ? api.useField(options).props
        : mode === 'single'
          ? api.useRegister(options)
          : mode === 'array'
            ? api.useRegister([options, { name: 'name' }])[0]
            : api.useRegister(options, { name: 'name' })[0];
      const state = api.useFormState();
      return (
        <>
          <input aria-label="email" {...binding} />
          <output>{Object.values(state.errors).flat().map(error => error.message).join(',')}</output>
          <span>{tick}</span>
        </>
      );
    }
    const view = render(<Example tick={0} />);
    const started = controlled.nextValidation();

    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'invalid' } });
    const result = await started;
    view.rerender(<Example tick={1} />);
    await act(async () => result.resolve({ issues: [{ message: 'Current error' }] }));

    expect(form.getFieldState(['user', 'email']).errors.map(error => error.message)).toEqual(['Current error']);
    expect(screen.getByText('Current error')).toBeTruthy();
    expect(controlled.validations).toHaveLength(1);
  },
);

test('registration: schema replacement during validation -> only the replacement result applies', async () => {
  const oldSchema = createControlledSchema<string>();
  const newSchema = createControlledSchema<string>();
  const form = new CreateForm({ defaultValues: { email: '' } });
  function Example({ schema }: { schema: StandardSchemaV1 }) {
    useForm(form).useRegister({ name: 'email', schema });
    return null;
  }
  const view = render(<Example schema={oldSchema.schema} />);
  const oldStarted = oldSchema.nextValidation();
  const oldValidation = form.trigger('email');
  const oldResult = await oldStarted;

  view.rerender(<Example schema={newSchema.schema} />);
  const newStarted = newSchema.nextValidation();
  const newValidation = form.trigger('email');
  const newResult = await newStarted;
  await act(async () => {
    newResult.resolve({ issues: [{ message: 'Replacement error' }] });
    await newValidation;
    oldResult.resolve({ issues: [{ message: 'Obsolete error' }] });
    await oldValidation;
  });

  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Replacement error']);
});

test('registration: schema options change -> subsequent validation receives the new options', async () => {
  const form = new CreateForm({ defaultValues: { email: '' } });
  const schema: StandardSchemaV1 = {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(_value, options) {
        return { issues: [{ message: String(options?.libraryOptions?.mode) }] };
      },
    },
  };
  function Example({ schemaOptions }: { schemaOptions: StandardSchemaV1.Options }) {
    useForm(form).useRegister({ name: 'email', schema, schemaOptions });
    return null;
  }
  const view = render(<Example schemaOptions={{ libraryOptions: { mode: 'first' } }} />);
  await act(async () => { await form.trigger('email'); });
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['first']);

  view.rerender(<Example schemaOptions={{ libraryOptions: { mode: 'second' } }} />);
  await act(async () => { await form.trigger('email'); });

  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['second']);
});

test('registration: path changes and schema removal -> old paths return to form validation', async () => {
  const form = new CreateForm({ defaultValues: { email: '', name: '' } });
  const schema: StandardSchemaV1 = {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: () => ({ issues: [{ message: 'Local error' }] }),
    },
  };
  function Example({ options }: { options: RegisterOptions }) {
    useForm(form).useField(options);
    return null;
  }
  const view = render(<Example options={{ name: 'email', schema }} />);
  await act(async () => { await form.trigger('email'); });

  view.rerender(<Example options={{ name: 'name', schema }} />);
  await act(async () => { await form.trigger('email', 'name'); });
  expect(form.getFieldState('email').errors).toEqual([]);
  expect(form.getFieldState('name').errors.map(error => error.message)).toEqual(['Local error']);
  view.rerender(<Example options={{ name: 'name' }} />);
  await act(async () => { await form.trigger('name'); });

  expect(form.getFieldState('name').errors).toEqual([]);
});

test('registration list: additions and reordering -> unchanged pending validation survives, removals clean up', async () => {
  const controlled = createControlledSchema<string>();
  const nameSchema: StandardSchemaV1 = {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: () => ({ issues: [{ message: 'Name error' }] }),
    },
  };
  const form = new CreateForm({ defaultValues: { email: '', name: '' } });
  function Example({ expanded }: { expanded: boolean }) {
    useForm(form).useRegister(expanded
      ? [{ name: 'name', schema: nameSchema }, { name: ['email'], schema: controlled.schema }]
      : [{ name: 'email', schema: controlled.schema }]);
    return null;
  }
  const view = render(<Example expanded={false} />);
  const started = controlled.nextValidation();
  const validation = form.trigger('email');
  const result = await started;

  view.rerender(<Example expanded />);
  await act(async () => {
    result.resolve({ issues: [{ message: 'Email error' }] });
    await validation;
    await form.trigger('name');
  });
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Email error']);
  expect(form.getFieldState('name').errors.map(error => error.message)).toEqual(['Name error']);
  view.rerender(<Example expanded={false} />);
  await act(async () => { await form.trigger('name'); });

  expect(form.getFieldState('name').errors).toEqual([]);
});

test('registration list: duplicate paths change -> last schema wins and an earlier schema can resume', async () => {
  const makeSchema = (message: string): StandardSchemaV1 => ({
    '~standard': { version: 1, vendor: 'test', validate: () => ({ issues: [{ message }] }) },
  });
  const first = makeSchema('First');
  const last = makeSchema('Last');
  const form = new CreateForm({ defaultValues: { email: '' } });
  function Example({ both }: { both: boolean }) {
    useForm(form).useRegister(both
      ? [{ name: 'email', schema: first }, { name: ['email'], schema: last }]
      : [{ name: 'email', schema: first }]);
    return null;
  }
  const view = render(<Example both />);
  await act(async () => { await form.trigger('email'); });
  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['Last']);

  view.rerender(<Example both={false} />);
  await act(async () => { await form.trigger('email'); });

  expect(form.getFieldState('email').errors.map(error => error.message)).toEqual(['First']);
});

test('registration: StrictMode, form replacement and unmount -> only the mounted form retains its schema', async () => {
  const firstForm = new CreateForm({ defaultValues: { email: '' } });
  const secondForm = new CreateForm({ defaultValues: { email: '' } });
  const schema: StandardSchemaV1 = {
    '~standard': { version: 1, vendor: 'test', validate: () => ({ issues: [{ message: 'Local error' }] }) },
  };
  function Example({ form }: { form: Form<{ email: string }> }) {
    useForm(form).useRegister({ name: 'email', schema });
    return null;
  }
  const view = render(<StrictMode><Example form={firstForm} /></StrictMode>);
  await act(async () => { await firstForm.trigger('email'); });
  expect(firstForm.getFieldState('email').errors.map(error => error.message)).toEqual(['Local error']);

  view.rerender(<StrictMode><Example form={secondForm} /></StrictMode>);
  await act(async () => {
    await firstForm.trigger('email');
    await secondForm.trigger('email');
  });
  expect(firstForm.getFieldState('email').errors).toEqual([]);
  expect(secondForm.getFieldState('email').errors.map(error => error.message)).toEqual(['Local error']);
  view.unmount();
  await secondForm.trigger('email');

  expect(secondForm.getFieldState('email').errors).toEqual([]);
});

// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import { useForm } from '../../src/react/index';

afterEach(cleanup);

test('multiple select: focus and blur before selection -> selected values remain available', () => {
  const form = new CreateForm({ defaultValues: { topics: ['state'] } });
  function Example() {
    const { useField } = useForm(form);
    const topics = useField<HTMLSelectElement>({ name: 'topics' });
    return (
      <select aria-label="topics" multiple {...topics.props}>
        <option value="state">State</option>
        <option value="react">React</option>
      </select>
    );
  }
  render(<Example />);
  const select = screen.getByLabelText('topics') as HTMLSelectElement;

  fireEvent.focus(select);
  fireEvent.blur(select);

  expect(form.getValues()).toEqual({ topics: ['state'] });
  expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['state']);
  expect(form.getFieldState('topics').touched).toBe(true);
});

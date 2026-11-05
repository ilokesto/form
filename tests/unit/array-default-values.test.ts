import { expect, test } from 'vitest';

import { CreateForm } from '../../src/index';
import type { FormArray } from '../../src/core/types';

test.each<[string, (array: FormArray) => void, string[], string[]]>([
  ['insert', array => array.insert(1, 'x'), ['a', 'x', 'B'], ['initial-0', 'item-1', 'initial-1']],
  ['push', array => array.push('x'), ['a', 'B', 'x'], ['initial-0', 'initial-1', 'item-1']],
  ['remove', array => array.remove(0), ['B'], ['initial-1']],
  ['move', array => array.move(1, 0), ['B', 'a'], ['initial-1', 'initial-0']],
  ['swap', array => array.swap(0, 1), ['B', 'a'], ['initial-1', 'initial-0']],
  ['replace', array => array.replace(['x']), ['x'], ['item-1']],
])('array %s: unrelated dirty edits -> original defaults, dirty baseline and reset keys survive', (_name, mutate, expectedItems, expectedKeys) => {
  const defaults = { email: 'old', items: ['a', 'b'], tags: ['tag'] };
  const form = new CreateForm({ defaultValues: defaults });
  const items = form.array('items');
  const initialKeys = [...items.keys()];
  form.setValue('email', 'edit', { source: 'user' });
  form.setValue(['items', 1], 'B', { source: 'user' });
  const editedEmail = form.getFieldState('email');
  const observedDefaults: unknown[] = [];
  const unsubscribe = form.subscribe(() => observedDefaults.push(form.getState().defaultValues));

  mutate(items);
  unsubscribe();

  expect(observedDefaults).toHaveLength(1);
  expect(observedDefaults[0]).toBe(defaults);
  expect(form.getState().defaultValues.items).toBe(defaults.items);
  expect(defaults).toEqual({ email: 'old', items: ['a', 'b'], tags: ['tag'] });
  expect(form.getValues()).toEqual({ email: 'edit', items: expectedItems, tags: ['tag'] });
  expect(items.keys()).toEqual(expectedKeys);
  expect(form.getFieldState('email')).toBe(editedEmail);
  expect(form.getFieldState('email')).toMatchObject({ dirty: true, modified: true });

  form.setValue('email', 'old', { source: 'user' });

  expect(form.getFieldState('email')).toMatchObject({ dirty: false, modified: true });

  form.reset();

  expect(form.getValues()).toEqual(defaults);
  expect(form.getState().defaultValues).toBe(defaults);
  expect(items.keys()).toEqual(initialKeys);
  Object.values(form.getState().fields).forEach(field => {
    expect(field).toMatchObject({ dirty: false, modified: false, touched: false, errors: [] });
  });
});

test('nested array mutations: moved edited item -> metadata and render keys survive while reset restores defaults', () => {
  const defaults = {
    email: 'old',
    groups: [{ members: [{ name: 'a' }] }, { members: [{ name: 'b' }] }],
    tags: ['tag'],
  };
  const form = new CreateForm({ defaultValues: defaults });
  const groups = form.array('groups');
  const initialGroupKeys = [...groups.keys()];
  form.setValue('email', 'edit', { source: 'user' });
  form.setValue(['groups', 1, 'members', 0, 'name'], 'B', { source: 'user' });
  form.setErrors(['groups', 1, 'members', 0, 'name'], [{ message: 'Keep error' }]);
  form.focus(['groups', 1, 'members', 0, 'name']);
  const members = form.array(['groups', 1, 'members']);
  members.push({ name: 'c' });
  const memberKeys = [...members.keys()];

  groups.move(1, 0);
  form.array('tags').push('other');

  expect(form.getState().defaultValues).toBe(defaults);
  expect(form.getState().defaultValues.groups).toBe(defaults.groups);
  expect(form.getValues()).toEqual({
    email: 'edit',
    groups: [{ members: [{ name: 'B' }, { name: 'c' }] }, { members: [{ name: 'a' }] }],
    tags: ['tag', 'other'],
  });
  expect(groups.keys()).toEqual([initialGroupKeys[1], initialGroupKeys[0]]);
  expect(form.array(['groups', 0, 'members']).keys()).toEqual(memberKeys);
  expect(form.getFieldState(['groups', 0, 'members', 0, 'name'])).toMatchObject({
    dirty: true,
    modified: true,
    isFocused: true,
    errors: [{ message: 'Keep error' }],
  });
  expect(form.getFieldState('email')).toMatchObject({ dirty: true, modified: true });

  form.reset();

  expect(form.getValues()).toEqual(defaults);
  expect(groups.keys()).toEqual(initialGroupKeys);
  expect(form.array(['groups', 1, 'members']).keys()).toEqual(['initial-0']);
  expect(form.array('tags').keys()).toEqual(['initial-0']);
  expect(form.getFieldState(['groups', 1, 'members', 0, 'name'])).toMatchObject({
    value: 'b',
    dirty: false,
    modified: false,
    isFocused: false,
    errors: [],
  });
});

test('root array mutations: move and push -> reset restores the configured root array', () => {
  const defaults = ['a', 'b'];
  const form = new CreateForm({ defaultValues: defaults });
  const array = form.array([]);

  array.move(1, 0);
  array.push('c');

  expect(form.getValues()).toEqual(['b', 'a', 'c']);
  expect(form.getState().defaultValues).toBe(defaults);
  expect(array.keys()).toEqual(['initial-1', 'initial-0', 'item-1']);

  form.reset();

  expect(form.getValues()).toEqual(['a', 'b']);
  expect(array.keys()).toEqual(['initial-0', 'initial-1']);
});

test('array replace: explicitly reset defaults -> later edits keep the new configured baseline', () => {
  const form = new CreateForm({ defaultValues: { email: 'old', items: ['a'] } });
  const configured = { email: 'server', items: ['server-item'] };
  form.reset(configured);
  form.setValue('email', 'edit', { source: 'user' });

  form.array('items').replace(['replacement']);

  expect(form.getState().defaultValues).toBe(configured);
  expect(form.getFieldState('email')).toMatchObject({ value: 'edit', dirty: true, modified: true });

  form.reset();

  expect(form.getValues()).toEqual(configured);
  expect(form.array('items').keys()).toEqual(['initial-0']);
  expect(form.getFieldState('email')).toMatchObject({ value: 'server', dirty: false, modified: false });
});

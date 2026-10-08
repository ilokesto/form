import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';
import type { FormArray } from '../src/core/types';

test('preserves runtime keys for a sibling array when another array is mutated', () => {
  const form = new CreateForm({
    defaultValues: {
      items: [{ name: 'item-a' }],
      tags: [{ name: 'tag-a' }],
    },
  });
  const tags = form.array('tags');
  tags.push({ name: 'tag-b' });
  const siblingKeys = [...tags.keys()];

  form.array('items').push({ name: 'item-b' });

  expect(tags.keys()).toEqual(siblingKeys);
});

test('preserves runtime keys for a structurally surviving nested array when its parent moves', () => {
  const form = new CreateForm({
    defaultValues: {
      groups: [
        { members: [{ name: 'member-a' }] },
        { members: [{ name: 'member-b' }] },
      ],
    },
  });
  const movedMembers = form.array(['groups', 1, 'members']);
  movedMembers.push({ name: 'member-c' });
  const nestedKeys = [...movedMembers.keys()];

  form.array('groups').move(1, 0);

  expect(form.array(['groups', 0, 'members']).keys()).toEqual(nestedKeys);
});

test('updates keys for the mutated array in a single-array form', () => {
  const form = new CreateForm({
    defaultValues: {
      items: [{ name: 'item-a' }],
    },
  });
  const items = form.array('items');

  items.push({ name: 'item-b' });

  expect(items.keys()).toEqual(['initial-0', 'item-1']);
});

test('array controllers share runtime keys across paths and resets within one form', () => {
  const form = new CreateForm<{ items: string[]; tags: string[] }>({
    defaultValues: { items: [], tags: [] },
  });
  const items = form.array('items');
  const otherForm = new CreateForm<{ items: string[] }>({ defaultValues: { items: [] } });

  items.push('a');
  form.array('tags').push('tag');
  form.array('items').push('b');

  expect(items.keys()).toEqual(['item-1', 'item-3']);
  expect(form.array('tags').keys()).toEqual(['item-2']);

  form.reset({ items: [], tags: [] });
  form.array('items').push('after-reset');
  otherForm.array('items').push('independent');

  expect(items.keys()).toEqual(['item-4']);
  expect(otherForm.array('items').keys()).toEqual(['item-1']);
});

test.each<[string, (array: FormArray) => void, string[]]>([
  ['insert', array => array.insert(1, 'x'), ['a', 'x', 'b']],
  ['push', array => array.push('x'), ['a', 'b', 'x']],
  ['remove', array => array.remove(0), ['b']],
  ['move', array => array.move(1, 0), ['b', 'a']],
  ['swap', array => array.swap(0, 1), ['b', 'a']],
  ['replace', array => array.replace(['x']), ['x']],
])('array %s publishes the complete mutation in one synchronous notification', (_, mutate, expectedItems) => {
  const form = new CreateForm({ defaultValues: { items: ['a', 'b'] } });
  const observedValues: string[][] = [];
  const unsubscribe = form.subscribe(() => {
    observedValues.push(form.getValues().items);
    expect(form.array('items').keys()).toHaveLength(form.getValues().items.length);
  });

  mutate(form.array('items'));

  expect(observedValues).toEqual([expectedItems]);
  unsubscribe();
});

test('array invalid and same-index mutations preserve the snapshot without notifying', () => {
  const form = new CreateForm({ defaultValues: { items: ['a', 'b'] } });
  const items = form.array('items');
  const previousState = form.getState();
  let notifications = 0;
  const unsubscribe = form.subscribe(() => {
    notifications += 1;
  });

  items.remove(-1);
  items.remove(2);
  items.move(0, 0);
  items.move(0, 2);
  items.swap(1, 1);
  items.swap(-1, 1);

  expect(form.getState()).toBe(previousState);
  expect(notifications).toBe(0);
  unsubscribe();
});

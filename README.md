# @ilokesto/form

**English** | [한국어](./README.ko.md)

`@ilokesto/form` is a framework-agnostic form state core. It keeps form values, field metadata, validation errors, submit attempts, and array item keys in one normalized store, while leaving rendering and event binding to framework adapters.

The package is designed around five ideas:

1. **Framework independence**: the core exposes a plain TypeScript class, `CreateForm`, and does not import React, Vue, Svelte, Solid, or DOM APIs.
2. **Tuple paths, not dot paths**: a string such as `"user.name"` is a literal field name; nested paths are expressed as tuples such as `["user", "name"]`.
3. **Normalized field state**: nested values are split into leaf `FieldState` records and reconstructed when `getValues()` is called.
4. **Standard Schema validation**: the core depends only on the Standard Schema v1 `~standard.validate` contract, not on a specific schema library.
5. **Array rebasing**: when array items move, swap, insert, or disappear, child field metadata such as `errors`, `touched`, `dirty`, and `modified` is moved with the item.

## Documentation

- Full docs: [English](https://ilokesto.ayden94.com/en/form) · [한국어](https://ilokesto.ayden94.com/ko/form)
- Source: [packages/form](https://github.com/ilokesto/ilokesto/tree/main/packages/form)
- npm: [@ilokesto/form](https://www.npmjs.com/package/@ilokesto/form)

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [React adapter](#react-adapter)
- [Vue adapter](#vue-adapter)
- [Solid adapter](#solid-adapter)
- [Svelte adapter](#svelte-adapter)
- [Core concepts](#core-concepts)
- [API guide](#api-guide)
- [Runtime flows](#runtime-flows)
- [Internal architecture](#internal-architecture)
- [Core walkthrough](#core-walkthrough)
- [Design decisions](#design-decisions)
- [Testing and development](#testing-and-development)

## Installation

This package is published to npm under the `@ilokesto/form` name with public access. In a workspace, add it through your package manager or workspace protocol. When the package is published or linked, the import surface is:

```ts
import { CreateForm } from '@ilokesto/form';
```

Local development commands:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

The package emits ESM JavaScript and TypeScript declarations to `dist/`.

> **ESM-only.** This package ships `"type": "module"` with ESM-only `exports`. CommonJS `require()` is not supported. Use a modern bundler (Vite, webpack 5+, esbuild, tsup) or Node.js ESM (`import`). If you need CJS compatibility, use dynamic `import()` or configure your bundler to transpile `@ilokesto/form`.

## Quick start

```ts
import { CreateForm } from '@ilokesto/form';

type LoginValues = {
  email: string;
  profile: {
    name: string;
  };
};

const form = new CreateForm<LoginValues>({
  defaultValues: {
    email: '',
    profile: {
      name: 'Ada',
    },
  },
});

form.setValue('email', 'ada@example.com', { source: 'user' });
form.setValue(['profile', 'name'], 'Grace', { source: 'user' });

console.log(form.getFieldState('email'));
console.log(form.getValues());
```

Important path rule:

```ts
form.setValue(['profile', 'name'], 'Grace');
form.setValue('profile.name', 'literal field');
```

These are different fields. `['profile', 'name']` means the nested `profile.name` value. `'profile.name'` means a top-level field whose actual key contains a dot.

## React adapter

React bindings are exposed through the `./react` subpath so the root package stays framework-agnostic.

```tsx
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/react';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
  },
  validateOn: ['blur', 'submit'],
});

function LoginForm() {
  const {
    useRegister,
    useField,
    useFormState,
  } = useForm(form);

  const email = useField({ name: 'email', schema: emailSchema });
  const remember = useRegister({ name: 'remember', type: 'checkbox' });
  const [role] = useRegister<HTMLSelectElement>([{ name: 'role' }]);
  const state = useFormState();

  return (
    <form>
      <input {...email.props} />
      {email.errors.map(error => <p key={error.message}>{error.message}</p>)}

      <label>
        <input type="checkbox" {...remember} />
        Remember me
      </label>

      <select {...role}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>

      <button disabled={!state.isDirty || !state.isValid}>
        Submit
      </button>
    </form>
  );
}
```

For component-owned forms, the React adapter can also create the form from options directly:

```tsx
const { form, useRegister, handleSubmit } = useForm({
  defaultValues: {
    email: '',
    remember: false,
  },
});
```

`defaultValues` and the other `CreateForm` options create the component-owned form once. `ReactFormOptions` also accepts the current render `values` and plain `resetOptions`. The first defined value and each later value with a different `Object.is` identity call `form.reset(values, resetOptions)`. `undefined` pauses synchronization without resetting; passing the last defined object again remains a no-op. Changing only `resetOptions` is also a no-op because it applies only when a new `values` reference drives a reset.

```tsx
const { useRegister } = useForm({
  defaultValues: emptyUser,
  values: query.data,
  resetOptions: {
    keepDirtyValues: true,
    keepErrors: true,
  },
});
```

The values effect ends on component unmount. `useForm(existingForm)` keeps its existing overload behavior and does not install external-value synchronization.

The React adapter has three first-version hooks. `useRegister` is overloaded for single, array, and rest-argument registration:

| Hook | Purpose |
| --- | --- |
| `useRegister(options)` | Returns input binding props for one field: `name`, `type`, `value`, `checked`, `onChange`, `onBlur`, `onFocus`. Default input `type` is `text`. |
| `useRegister<TElement>(options[])` | Returns multiple binding props in input order for map-friendly rendering. Use `HTMLSelectElement` or `HTMLTextAreaElement` as the generic when spreading into select/textarea. |
| `useRegister(optionA, optionB)` | Rest-argument form for multiple bindings; internally handled like an options array. |
| `useField(options)` | Returns `{ props, value, setValue, errors, dirty, touched }` for one field. It intentionally does not expose `field.register`. |
| `useFormState()` | Returns whole-form aggregate state such as `errors`, `dirtyFields`, `touchedFields`, `isDirty`, `isValid`, and `submitCount`. |

Field-local schemas can be passed to `useRegister` or `useField`. For that field, the field-local schema takes precedence over the form-level schema.

```tsx
const email = useField({
  name: 'email',
  schema: emailSchema,
});
```

The event model is DOM-event centered. Custom components can use `useRegister` when they pass through DOM-compatible `value`, `checked`, `onChange`, `onBlur`, and `onFocus` props.


## Vue adapter

Vue bindings are exposed through the `./vue` subpath. They use the same `useForm(form)` shape as the React adapter, but return Vue-friendly `v-bind` props with `onInput`, `onChange`, `onBlur`, and `onFocus` handlers.

`useForm` also accepts `VueFormOptions`. Its `values` source is `MaybeRefOrGetter<TValues | undefined>` and `resetOptions` stays plain. The first defined value and each later value with a different `Object.is` identity call `form.reset(values, resetOptions)`. `undefined` pauses synchronization without resetting, and re-emitting the last defined object remains a no-op. Pass `ref`, `computed`, or a getter to track changes; a plain value is evaluated once. Reactive values require an active Vue effect scope; the adapter fails before creating a form when none exists. The watcher stops with that scope, and `useForm(existingForm)` does not install it.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from '@ilokesto/form/vue';

const serverValues = ref({ email: 'initial@example.com' });
const { form, useRegister } = useForm({
  defaultValues: { email: '' },
  values: serverValues,
});
</script>
```

```vue
<script setup lang="ts">
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/vue';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
    role: 'user',
  },
  validateOn: ['blur', 'submit'],
});

const {
  useRegister,
  useField,
  useFormState,
} = useForm(form);

const email = useField({ name: 'email', schema: emailSchema });
const remember = useRegister({ name: 'remember', type: 'checkbox' });
const [role] = useRegister<HTMLSelectElement>([{ name: 'role' }]);
const state = useFormState();
</script>

<template>
  <form>
    <input v-bind="email.props" />
    <p v-for="error in email.errors" :key="error.message">
      {{ error.message }}
    </p>

    <label>
      <input type="checkbox" v-bind="remember" />
      Remember me
    </label>

    <select v-bind="role">
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>

    <button :disabled="!state.isDirty || !state.isValid">
      Submit
    </button>
  </form>
</template>
```

The Vue adapter exposes the same three concepts:

| Composable | Purpose |
| --- | --- |
| `useRegister(options)` | Returns one input-oriented `v-bind` binding object. It includes `type` and defaults to `text`; text inputs update on `input`; checkbox/radio update on `change`. Use a generic for select/textarea binding types. |
| `useRegister(options[])` / `useRegister(optionA, optionB)` | Returns multiple binding objects for map-friendly rendering. |
| `useField(options)` | Returns `{ props, value, setValue, errors, dirty, touched }` with getter-backed reactive reads. |
| `useFormState()` | Returns form-wide aggregate getters such as `errors`, `dirtyFields`, `touchedFields`, `focusedField`, `isDirty`, `isValid`, and `submitCount`. |

Field-local schemas work the same way as React and are cleaned up with the current Vue effect scope.

## Solid adapter

Solid bindings are exposed through the `./solid` subpath. They keep the same `useForm(form)` shape as React and Vue, but use Solid owner cleanup and getter-backed props.

```tsx
import { CreateForm } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/solid';

const form = new CreateForm({
  defaultValues: {
    email: '',
    remember: false,
    role: 'user',
  },
  validateOn: ['blur', 'submit'],
});

function LoginForm() {
  const { useRegister, useField, useFormState } = useForm(form);
  const email = useField({ name: 'email', schema: emailSchema });
  const remember = useRegister({ name: 'remember', type: 'checkbox' });
  const role = useRegister<HTMLSelectElement>({ name: 'role' });
  const state = useFormState();

  return (
    <form>
      <input {...email.props} />
      {email.errors.map(error => <p>{error.message}</p>)}

      <input type="checkbox" {...remember} />

      <select {...role}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>

      <button disabled={!state.isDirty || !state.isValid}>Submit</button>
    </form>
  );
}
```

The Solid adapter exposes `useRegister`, `useField`, and `useFormState` with the same semantics as Vue: text inputs update on `input`, checkbox/radio/multiple select update on `change`, and field-local schemas are disposed with the current Solid owner.

For component-owned forms, `SolidFormOptions` accepts `values` as `Accessor<TValues | undefined>` and plain `resetOptions`:

```tsx
const [serverValues, setServerValues] = createSignal<User | undefined>();
const { form } = useForm({
  defaultValues: emptyUser,
  values: serverValues,
  resetOptions: { keepDirtyValues: true },
});
```

The first defined accessor value and each later value with a different `Object.is` identity reset the form. `undefined` pauses without resetting, re-emitting the last defined object is a no-op, and `resetOptions` applies only to value-driven resets. Reactive values require an active Solid owner; the adapter fails before creating a form when none exists. Tracking is disposed with that owner. `useForm(existingForm)` does not install it.

## Svelte adapter

Svelte bindings are exposed through the `./svelte` subpath. The adapter exposes register actions plus readable stores for both form-wide and field-local state.

```svelte
<script lang="ts">
  import { CreateForm } from '@ilokesto/form';
  import { useForm } from '@ilokesto/form/svelte';

  const form = new CreateForm({
    defaultValues: {
      email: '',
      remember: false,
      role: 'user',
    },
    validateOn: ['blur', 'submit'],
  });

  const { register, useField, useFormState } = useForm(form);
  const email = useField({ name: 'email', schema: emailSchema });
  const emailProps = email.props;
  const state = useFormState();
</script>

<form>
  <input use:emailProps />
  {#each $email.errors as error}
    <p>{error.message}</p>
  {/each}
  <input type="checkbox" use:register={{ name: 'remember', type: 'checkbox' }} />

  <select use:register={{ name: 'role' }}>
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>

  <button disabled={!$state.isDirty || !$state.isValid}>Submit</button>
</form>
```

The Svelte action owns DOM synchronization directly. `useField` is a `Readable<SvelteFieldSnapshot>` consumed as `$email`; it emits current `value`, `errors`, `dirty`, and `touched` state and releases its core subscription when the last subscriber leaves.

For component-owned forms, `SvelteFormOptions` accepts `values` as `Readable<TValues | undefined>` and plain `resetOptions`:

```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import { useForm } from '@ilokesto/form/svelte';

  const serverValues = writable<User | undefined>(undefined);
  const { form } = useForm({
    defaultValues: emptyUser,
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
</script>
```

The first defined emission and each later emission with a different `Object.is` identity reset the form. `undefined` pauses without resetting, re-emitting the last defined object is a no-op, and `resetOptions` applies only to value-driven resets. Call this overload during component initialization; its subscription ends on unmount. `useForm(existingForm)` does not subscribe.

## Core concepts

### `FieldPathSegment`

A single path segment is either a string object key or a numeric array index.

```ts
type FieldPathSegment = string | number;
```

Examples:

```ts
'user'
'name'
0
1
```

### `FieldPath`

A `FieldPath` is the internal tuple representation of a form field path.

```ts
type FieldPath = readonly FieldPathSegment[];
```

Examples:

```ts
['email']
['user', 'name']
['items', 0, 'title']
[] // root value
```

The root path is useful for primitive root values or root-level schema errors.

### `FieldPathInput`

Public APIs accept either a string field name or a tuple path.

```ts
type FieldPathInput = string | FieldPath;
```

A string is not parsed as a dot path. This prevents collisions between a nested path and an actual object key containing `.`.

### `PathKey`

`FormState.fields` and `FormState.arrayKeys` need string keys. `FormPath` converts tuple paths to stable string keys.

| FieldPath | PathKey |
| --- | --- |
| `[]` | `$` |
| `['email']` | `["email"]` |
| `['user', 'name']` | `["user","name"]` |
| `['items', 0, 'title']` | `["items",0,"title"]` |

The implementation uses JSON array strings instead of separator-based strings, so literal field names such as `"user.name"` are safe.

### `FieldState`

A `FieldState` stores the value and metadata for one leaf field.

```ts
type FieldState<TValue = unknown> = {
  value: TValue;
  errors: FormError[];
  touched: boolean;
  dirty: boolean;
  modified: boolean;
  isFocused: boolean;
};
```

The flags mean:

- `touched`: the field was blurred at least once.
- `dirty`: the current value is not `Object.is`-equal to the initial value at the same path.
- `modified`: the field was changed by a user-sourced write, `source: 'user'`.
- `isFocused`: the field currently has focus. Set to `true` by `focus()` and cleared by `blur()` (always, regardless of `validateOn`).
- `errors`: validation or manually assigned field errors.

### `FormState`

The internal snapshot is normalized.

```ts
type FormState<TValues> = {
  defaultValues: TValues;
  fields: Record<PathKey, FieldState>;
  submitCount: number;
  arrayKeys: Record<PathKey, string[]>;
};
```

For this input:

```ts
const form = new CreateForm({
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
});
```

The core stores leaf field states and array container keys separately:

```ts
{
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
  fields: {
    '["user","name"]': { value: 'Ada', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
    '["items",0,"title"]': { value: 'A', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
    '["items",1,"title"]': { value: 'B', errors: [], touched: false, dirty: false, modified: false, isFocused: false },
  },
  submitCount: 0,
  arrayKeys: {
    '["items"]': ['initial-0', 'initial-1'],
  },
}
```

`getValues()` reconstructs the nested object from `fields` and `arrayKeys`.

### `FormError`

```ts
type FormError = {
  type?: string;
  message: string;
};
```

Schema errors use `type: 'standard_schema'`. You can also set errors manually with `setErrors()`.

### `ValidationTrigger`

```ts
type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';
```

`validateOn` controls automatic validation. If omitted, the default is `['submit']`. Manual validation is always available through `trigger()`.

### `StandardSchemaV1`

The core accepts a Standard Schema compatible object:

```ts
const schema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value) {
      return { value };
    },
  },
};
```

On failure, `validate()` returns `issues`. Each issue path is converted into a `FieldPath`, then into a `PathKey`, then written to the corresponding `FieldState.errors`.

### Field-local schemas

Framework adapters can register a schema for a single field.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});
```

When a field-local schema exists, that field uses it instead of the form-level schema:

```txt
field-local schema > form-level schema
```

The cleanup function removes the schema registration if it is still the latest registration for that field.

### `ArrayKeys`

Array item identity is stored separately from array values.

- Items from `defaultValues` get deterministic keys: `initial-0`, `initial-1`, ...
- Runtime insertions get generated keys: `item-1`, `item-2`, ...
- `move()` and `swap()` move keys with values.
- `replace()` creates a new key for every new item and does not preserve old child metadata.

These keys are intended for framework list rendering.

## API guide

### `new CreateForm(options)`

```ts
const form = new CreateForm({
  defaultValues,
  schema,
  schemaOptions,
  validateOn,
});
```

Options:

- `defaultValues`: required default value tree. This is also the reset/dirty baseline.
- `schema`: optional Standard Schema v1 compatible schema.
- `schemaOptions`: optional Standard Schema validation options.
- `validateOn`: optional automatic validation triggers. Defaults to `['submit']`.

### `getState()`

Returns the current `FormState` snapshot.

```ts
const state = form.getState();
console.log(state.submitCount);
```

Treat the returned object as read-only.

### `subscribe(listener)`

Subscribes to store changes and returns an unsubscribe function.

```ts
const unsubscribe = form.subscribe(() => {
  console.log(form.getValues());
});

unsubscribe();
```

Framework adapters use this method to connect the core store to reactive rendering.

### `registerFieldSchema(path, options)`

Registers a field-local schema and returns a cleanup function.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});

cleanup();
```

This is mostly intended for framework adapters. A field-local schema overrides the form-level schema for that field during `blur()`, `trigger()`, and `submit()`.

### `getFieldState(path)`

Returns the `FieldState` for a path. If the field does not exist yet, the method returns a default field state instead of `undefined`.

```ts
const email = form.getFieldState('email');
```

### `getValue(path)`

Returns only the current field value.

```ts
const email = form.getValue('email');
```

### `getValues()`

Reconstructs and returns the full nested values object.

```ts
const values = form.getValues();
```

### `setValue(path, value, options?)`

Writes one field value.

```ts
form.setValue(['user', 'name'], 'Grace', {
  source: 'user',
  validate: true,
});
```

Effects:

1. Converts the public path input to an internal tuple path.
2. Writes the new value to the corresponding `FieldState`.
3. Recomputes `dirty` by comparing with `defaultValues` at the same path.
4. Sets `modified` to `true` only when `source === 'user'`.
5. Starts change validation if `options.validate` is true or `validateOn` contains `'change'`.

`setValue()` returns `void`; change validation is started asynchronously and is not awaited by the method.

Async validation is target-aware. New validation supersedes only overlapping fields, while independent field validations may complete concurrently. Full-form submit validation also verifies the value snapshot it validated; stale submit attempts retry until they obtain an authoritative result and never call `onValid` by default.

### `blur(path)`

Marks the field as touched and optionally validates it.

```ts
const valid = await form.blur('email');
```

If `validateOn` does not contain `'blur'`, it returns `true` after touching the field.

### `focus(path)`

Sets `isFocused: true` on the field at `path`. Other fields are not touched — DOM naturally fires a `blur` event on the previously focused element, which clears `isFocused` via `blur()`. Array rebasing preserves `isFocused` across `move`/`swap`/`insert`/`remove`.

The core is DOM-independent, so calling `focus()` on multiple fields can leave more than one field with `isFocused: true`. In DOM adapters this is naturally bounded to one by the browser; in direct core usage it is the caller's responsibility to `blur()` the previous field. The `useFormState().focusedField` aggregate returns the **first** focused field found in `Object.entries` order, not the most recently focused one — to enumerate all focused fields, iterate `state.fields` directly.

### `setErrors(path, errors)`

Replaces the error list for one field.

```ts
form.setErrors('email', [{ message: 'Email is required' }]);
```

### `clearErrors(...paths)`

Clears errors for specific fields, or all existing fields when no path is passed.

```ts
form.clearErrors('email');
form.clearErrors();
```

### `trigger(...paths)`

Runs manual validation.

```ts
await form.trigger('email');
await form.trigger();
```

With paths, only those fields' errors are updated from the full schema result. Without paths, all registered fields and all schema error keys are updated.

### `array(path)`

Returns a `FormArray` controller for an array field.

```ts
const items = form.array('items');

items.push({ title: 'C' });
items.move(2, 0);
console.log(items.keys());
```

The array controller reads the latest values and keys from the store each time a command runs.

### `reset(values?, options?)`

Resets the form to initial state.

```ts
form.reset();
form.reset({ email: 'new@example.com' });
form.reset({ email: 'new@example.com' }, { keepDirtyValues: true });
```

Without an argument, it reuses the current `defaultValues`. With an argument, the argument becomes the new `defaultValues`.

Reset options can preserve selected state for fields that still exist in the new normalized value shape:

| Option | Behavior |
| --- | --- |
| `keepDirtyValues` | Keeps current values for dirty fields and recomputes dirty against the new `defaultValues`. |
| `keepErrors` | Keeps existing errors for surviving field paths. |
| `keepTouched` | Keeps touched flags for surviving field paths. |
| `keepSubmitState` | Keeps `submitCount`, `isSubmitting`, `isSubmitted`, and `isSubmitSuccessful`. |

### `submit(onValid, onInvalid?)`

Increments `submitCount`, validates the form, and calls the matching callback.

```ts
const result = await form.submit(
  values => values,
  fields => {
    console.log(fields);
  },
);
```

If validation fails, `onInvalid` receives the current `fields` object and `submit()` returns `undefined`. If validation succeeds, `onValid` receives reconstructed values.

### `FormArray.keys()`

Returns stable keys for rendering the current array items.

```ts
const keys = form.array('items').keys();
```

### `FormArray.insert(index, value)`

Inserts an item. Out-of-range indexes are bounded to `0...length`.

### `FormArray.push(value)`

Appends an item.

### `FormArray.remove(index)`

Removes an item. Invalid indexes are ignored.

### `FormArray.move(fromIndex, toIndex)`

Moves one item. Invalid indexes or a no-op move are ignored.

### `FormArray.swap(leftIndex, rightIndex)`

Swaps two items. Invalid indexes or identical indexes are ignored.

### `FormArray.replace(values)`

Replaces the whole array. Existing item links are intentionally broken, so child field metadata is not preserved.

## Runtime flows

### Field commands

Start with `src/core/form/CreateForm.ts`. It shows the complete orchestration:

```txt
setValue -> normalize path -> store.setValue -> optional change validation
blur     -> normalize path -> unfocus -> touch -> optional blur validation
trigger  -> normalize paths -> selected-field or full validation
array    -> create controller with the form's shared key generator
submit   -> submit queue -> validation -> callback -> completion
```

Writes notify synchronously. Blur retains separate unfocus and touch notifications.
`dirty` compares against the default value with `Object.is`; `modified` records
user-originated writes. These flags have different meanings.

### Validation and submission

Selected-field validation runs local schemas first, then the form schema for
remaining targets. Full validation runs the form schema first, then registered
local schemas. A local result, including an empty error list, takes precedence.
Without a local schema, selected-field validation executes the whole form schema
but writes only the selected errors.

Every asynchronous phase checks both its validation revision and captured values
before writing errors. Independent field validations may finish in either order;
overlapping work must not overwrite newer results. Errors are applied through the
existing per-field write boundaries, not a new batch update.

`FormSubmitter` queues concurrent submissions. It increments the attempt count
immediately, retries stale validation, calls `onInvalid` for invalid results or
`onValid` with current values, and completes submit state when the queue drains.

### Array mutations

```txt
controller reads values and keys
  -> static planner computes { values, keys, mapPreviousIndex }
  -> store.replaceState(previousState => rebase(previousState, path, mutation))
  -> one next snapshot
```

Rebasing reconstructs values from the supplied snapshot, initializes the next
state, and moves surviving child metadata and nested array keys to their new
paths. Errors, touched, dirty, modified and focus follow the item. Unrelated
fields and submit state are preserved. Replace intentionally drops old child
metadata and creates fresh keys. The existing defaultValues behavior is retained.

## Internal architecture

```txt
CreateForm                         public command order and shared array keys
  FormStateStore                   state ownership and writes
    FormStateInitializer           nested defaults -> normalized snapshot
    FormStateReader                snapshot -> fields and nested values
  ValidationEngine                 schema registration and validation phases
    StandardSchemaValidator        schema results -> field errors
    ValidationSequencer            overlapping validation revisions
    ValidationSnapshot             captured values and array-key comparison
  FormSubmitter                    submit queue and callback lifecycle
  FormArrayController              array reads and state application
    FormArrayMutationPlanner       pure array mutation calculation
    FormArrayRebaser                previous snapshot + mutation -> next snapshot
```

React, Vue, Solid and Svelte adapters depend on the public `Form` contract.
`adapters/` shares DOM value/binding and aggregate-state logic; subscriptions and
component lifecycle ownership remain in each framework directory.

## Core walkthrough

Read in this order rather than following every import:

| Question | File under `src/core/` | Responsibility |
| --- | --- | --- |
| What happens after a public command? | `form/CreateForm.ts` | Normalize paths, write state, request validation. |
| Where does state change? | `state/FormStateStore.ts` | Own the store and apply writes with immer, including reset and submit flags. |
| How are values reconstructed? | `state/FormStateReader.ts` | Static calculations over an explicit snapshot; no store or getter ownership. |
| How is initial state built? | `state/FormStateInitializer.ts` | Traverse arrays/plain objects; keep empty objects, non-plain objects and primitive values as leaves. |
| What is an absent field? | `state/FieldStateFactory.ts` | Fresh metadata with undefined value, empty errors and false flags, including isFocused. |
| How do paths work? | `path/FormPath.ts` | Literal strings become one segment; tuple paths encode as JSON keys, with root key `$`. |
| How are nested values changed? | `value/ValueHelper.ts` | Immutable nested get/set and reconstruction from fields and array containers. |
| When may validation apply? | `validation/ValidationEngine.ts` | Local-schema precedence, selected/full execution and stale-result checks. |
| Which validation supersedes which? | `validation/ValidationSequencer.ts` | Full and per-field revisions, including schema registration invalidation. |
| Did values change during validation? | `validation/ValidationSnapshot.ts` | Capture and compare field values and array-key identities. |
| How are schema issues converted? | `validation/StandardSchemaValidator.ts` | Normalize Standard Schema issues; missing/unsupported paths become root errors. |
| How are submissions serialized? | `form/FormSubmitter.ts` | Queue submissions, retry stale validation and settle lifecycle state. |
| What is the next array order? | `array/FormArrayMutationPlanner.ts` | Static insert/push/remove/move/swap/replace calculations; no instance or store. |
| How does metadata follow items? | `array/FormArrayRebaser.ts` | Pure snapshot transformation with no store access or notifications. |
| Who applies an array mutation? | `array/FormArrayController.ts` | Read current array state and pass the updater snapshot to the rebaser. |
| Where do array keys come from? | `array/ArrayKeyGenerator.ts` | One generator per CreateForm, shared across newly created controllers. |
| How are indexes and paths mapped? | `array/ArrayItemReorder.ts`, `array/FormArrayPath.ts` | Pure ordering/index mapping and child-path replacement. |

`src/index.ts` and the framework entry points define the published surface.
`core/types.ts` describes the existing path, state, schema and command contracts.
Internal modules are implementation details, not additional package exports.

## Design decisions

### Strings are literal paths

Dot-path parsing is convenient but ambiguous. This core chooses unambiguous tuple paths instead.

```ts
'user.name'        // one field named "user.name"
['user', 'name']   // nested user.name field
```

### State is normalized

Normalized fields make it easy to update individual metadata without mutating the whole nested value object. `ValueHelper` reconstructs the public value shape when needed.

### Validation is schema-library independent

The core only knows Standard Schema. This keeps validation compatible with multiple libraries and avoids importing a specific validator.

### Array mutation is split into planning and rebasing

`FormArrayMutationPlanner` decides what the next array looks like. `FormArrayRebaser` decides how the whole form state should follow. This separation keeps mutation math pure and store updates centralized.

### `dirty` and `modified` are different

`dirty` compares current value with the initial value. `modified` tracks user-originated writes. A programmatic update can be dirty without being modified by the user.

## Testing and development

### Commands

```sh
pnpm build
pnpm typecheck
pnpm test
```

`pnpm build` uses tsup to bundle ESM JavaScript and declaration files for the core and four framework entry points. `pnpm test:pack` checks the packed package's runtime imports and TypeScript contracts in a separate consumer.

`pnpm test` runs the Vitest suite.

### Current test coverage themes

The existing tests cover:

1. Tuple paths versus literal string names.
2. Standard Schema validation on blur, manual trigger, and submit.
3. Array value/key/metadata rebasing when moving and removing items.
4. React adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema precedence.
5. Vue adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema cleanup.
6. Solid adapter bindings for text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, and field-local schema cleanup.
7. Svelte register action bindings for text input, checkbox, radio, select, multiple select, readable `useFormState`, and field-local schema cleanup.

### Suggested future documentation/tests

Good additions would be:

- A test for `insert()` index bounding.
- A test for `replace()` intentionally dropping child metadata.
- A test for root-level schema errors.
- More adapter examples for custom DOM-event-compatible components.

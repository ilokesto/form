# @ilokesto/form

[English](./README.md) | **한국어**

`@ilokesto/form`은 프레임워크에 의존하지 않는 form state core다. 렌더링과 이벤트 바인딩은 framework adapter에 맡기고, core는 form values, field metadata, validation errors, submit attempts, array item keys를 하나의 정규화된 store 안에서 관리한다.

이 패키지는 다섯 가지 아이디어를 중심으로 설계되어 있다.

1. **프레임워크 독립성**: core는 plain TypeScript class인 `CreateForm`을 노출하고 React, Vue, Svelte, Solid, DOM API를 import하지 않는다.
2. **dot path가 아닌 tuple path**: `"user.name"` 같은 문자열은 literal field name이고, nested path는 `["user", "name"]` 같은 tuple로 표현한다.
3. **정규화된 field state**: nested values는 leaf `FieldState` record로 분리되어 저장되고, `getValues()`를 호출할 때 다시 복원된다.
4. **Standard Schema validation**: core는 특정 schema library가 아니라 Standard Schema v1의 `~standard.validate` 계약에만 의존한다.
5. **Array rebasing**: array item이 move, swap, insert, remove될 때 `errors`, `touched`, `dirty`, `modified` 같은 child field metadata가 item과 함께 이동한다.

## 문서

- 전체 문서: [English](https://ilokesto.ayden94.com/en/form) · [한국어](https://ilokesto.ayden94.com/ko/form)
- 소스: [packages/form](https://github.com/ilokesto/ilokesto/tree/main/packages/form)
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

이 패키지는 `@ilokesto/form` 이름으로 npm에 public access로 게시된다. workspace에서는 package manager 또는 workspace protocol을 통해 추가하면 된다. package가 publish되거나 link된 상태에서 import surface는 다음과 같다.

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

이 package는 ESM JavaScript와 TypeScript declaration을 `dist/`로 emit한다.

> **ESM-only.** 이 package는 `"type": "module"`과 ESM-only `exports`를 제공한다. CommonJS `require()`는 지원하지 않는다. Vite, webpack 5+, esbuild, tsup 같은 현대 번들러 또는 Node.js ESM(`import`)을 사용하라. CJS 호환이 필요하면 dynamic `import()` 또는 번들러에서 `@ilokesto/form`을 transpile하도록 설정하라.

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

중요한 path rule:

```ts
form.setValue(['profile', 'name'], 'Grace');
form.setValue('profile.name', 'literal field');
```

이 둘은 서로 다른 field다. `['profile', 'name']`은 nested `profile.name` value를 의미한다. `'profile.name'`은 실제 key에 dot이 들어간 top-level field를 의미한다.

## React adapter

React binding은 `./react` subpath로 노출된다. 그래서 package root는 framework-agnostic core만 유지한다.

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

Component가 form을 소유하는 경우 React adapter는 options로 form을 직접 만들 수도 있다.

```tsx
const { form, useRegister, handleSubmit } = useForm({
  defaultValues: {
    email: '',
    remember: false,
  },
});
```

`defaultValues`와 다른 `CreateForm` options는 component-owned form을 한 번만 생성한다. `ReactFormOptions`는 현재 render의 `values`와 plain `resetOptions`도 받는다. 처음 정의된 값과 이후 `Object.is` identity가 달라진 값마다 `form.reset(values, resetOptions)`를 호출한다. `undefined`는 reset 없이 동기화를 중단하고, 마지막으로 정의되었던 같은 object를 다시 전달해도 no-op이다. `resetOptions`만 바꾸는 것도 no-op이며 새 `values` reference가 reset을 일으킬 때만 적용된다.

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

Values effect는 component unmount 시 종료된다. `useForm(existingForm)` overload는 기존 동작을 유지하며 external-value synchronization을 설치하지 않는다.

React adapter의 첫 버전 hook은 세 가지다. `useRegister`는 단일, 배열, rest-argument 등록을 모두 처리하도록 overload되어 있다.

| Hook | Purpose |
| --- | --- |
| `useRegister(options)` | 단일 field의 input binding props를 반환한다: `name`, `type`, `value`, `checked`, `onChange`, `onBlur`, `onFocus`. 기본 input `type`은 `text`다. |
| `useRegister<TElement>(options[])` | map-friendly rendering을 위해 여러 binding props를 입력 순서대로 반환한다. select/textarea에 spread할 때는 `HTMLSelectElement` 또는 `HTMLTextAreaElement` generic으로 좁힌다. |
| `useRegister(optionA, optionB)` | 여러 binding을 rest arguments로 받는다. 내부적으로 options array처럼 처리한다. |
| `useField(options)` | 한 field에 대해 `{ props, value, setValue, errors, dirty, touched }`를 반환한다. `field.register`는 의도적으로 노출하지 않는다. |
| `useFormState()` | `errors`, `dirtyFields`, `touchedFields`, `isDirty`, `isValid`, `submitCount` 같은 form 전체 aggregate state를 반환한다. |

Field-local schema는 `useRegister` 또는 `useField`에 전달할 수 있다. 해당 field에 대해서는 field-local schema가 form-level schema보다 우선한다.

```tsx
const email = useField({
  name: 'email',
  schema: emailSchema,
});
```

Event model은 DOM event 중심이다. Custom component도 DOM-compatible `value`, `checked`, `onChange`, `onBlur`, `onFocus` props를 그대로 전달한다면 `useRegister`를 사용할 수 있다.


## Vue adapter

Vue binding은 `./vue` subpath로 노출된다. React adapter와 같은 `useForm(form)` 형태를 쓰지만, Vue template의 `v-bind`에 바로 전달할 수 있도록 `onInput`, `onChange`, `onBlur`, `onFocus` handler를 가진 props를 반환한다.

`useForm`은 `VueFormOptions`도 받는다. `values` source는 `MaybeRefOrGetter<TValues | undefined>`이고 `resetOptions`는 plain이다. 처음 정의된 값과 이후 `Object.is` identity가 달라진 값마다 `form.reset(values, resetOptions)`를 호출한다. `undefined`는 reset 없이 동기화를 중단하고, 마지막으로 정의되었던 같은 object를 다시 emit해도 no-op이다. 변경을 추적하려면 `ref`, `computed`, getter를 전달하라. 평면 값은 한 번만 평가된다. Reactive values에는 active Vue effect scope가 필요하며, scope가 없으면 adapter는 form을 만들기 전에 실패한다. Watcher는 해당 scope와 함께 중지되며 `useForm(existingForm)`은 watcher를 설치하지 않는다.

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

Vue adapter도 같은 세 가지 개념을 노출한다.

| Composable | Purpose |
| --- | --- |
| `useRegister(options)` | 하나의 input 중심 `v-bind` binding object를 반환한다. `type`이 포함되고 기본값은 `text`다. Text input은 `input` event에서, checkbox/radio는 `change` event에서 값을 갱신한다. select/textarea 타입은 generic으로 좁힌다. |
| `useRegister(options[])` / `useRegister(optionA, optionB)` | map-friendly rendering을 위해 여러 binding object를 반환한다. |
| `useField(options)` | getter 기반 reactive read를 가진 `{ props, value, setValue, errors, dirty, touched }`를 반환한다. |
| `useFormState()` | `errors`, `dirtyFields`, `touchedFields`, `focusedField`, `isDirty`, `isValid`, `submitCount` 같은 form 전체 aggregate getter를 반환한다. |

Field-local schema는 React와 같은 방식으로 동작하고 현재 Vue effect scope가 정리될 때 함께 cleanup된다.

## Solid adapter

Solid binding은 `./solid` subpath로 노출된다. React/Vue와 같은 `useForm(form)` 형태를 유지하되, Solid owner cleanup과 getter 기반 props를 사용한다.

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

Solid adapter는 Vue와 같은 의미의 `useRegister`, `useField`, `useFormState`를 제공한다. Text input은 `input` event에서, checkbox/radio/multiple select는 `change` event에서 갱신하고, field-local schema는 현재 Solid owner와 함께 dispose된다.

Component-owned form에서는 `SolidFormOptions`가 `values`를 `Accessor<TValues | undefined>`로 받고 plain `resetOptions`를 받는다.

```tsx
const [serverValues, setServerValues] = createSignal<User | undefined>();
const { form } = useForm({
  defaultValues: emptyUser,
  values: serverValues,
  resetOptions: { keepDirtyValues: true },
});
```

처음 정의된 accessor 값과 이후 `Object.is` identity가 달라진 값마다 form을 reset한다. `undefined`는 reset 없이 동기화를 중단하고, 마지막으로 정의되었던 같은 object를 다시 emit해도 no-op이며, `resetOptions`는 value-driven reset에만 적용된다. Reactive values에는 active Solid owner가 필요하며, owner가 없으면 adapter는 form을 만들기 전에 실패한다. Tracking은 해당 owner와 함께 dispose된다. `useForm(existingForm)`은 tracking을 설치하지 않는다.

## Svelte adapter

Svelte binding은 `./svelte` subpath로 노출된다. Adapter는 register action과 함께 form-wide 및 field-local state를 위한 readable store를 제공한다.

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

Svelte action은 DOM synchronization을 직접 담당한다. `useField`는 `$email`로 소비하는 `Readable<SvelteFieldSnapshot>`이며 최신 `value`, `errors`, `dirty`, `touched`를 emit하고 마지막 subscriber가 해제되면 core subscription도 정리한다.

Component-owned form에서는 `SvelteFormOptions`가 `values`를 `Readable<TValues | undefined>`로 받고 plain `resetOptions`를 받는다.

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

처음 정의된 emission과 이후 `Object.is` identity가 달라진 emission마다 form을 reset한다. `undefined`는 reset 없이 동기화를 중단하고, 마지막으로 정의되었던 같은 object를 다시 emit해도 no-op이며, `resetOptions`는 value-driven reset에만 적용된다. 이 overload는 component initialization 중 호출해야 하며 subscription은 unmount 시 종료된다. `useForm(existingForm)`은 external values를 구독하지 않는다.

## Core concepts

### `FieldPathSegment`

하나의 path segment는 string object key 또는 numeric array index다.

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

`FieldPath`는 form field path의 내부 tuple 표현이다.

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

Root path는 primitive root value나 root-level schema error에 유용하다.

### `FieldPathInput`

Public API는 string field name 또는 tuple path를 받는다.

```ts
type FieldPathInput = string | FieldPath;
```

String은 dot path로 파싱되지 않는다. 그래서 nested path와 `.` 문자를 실제로 포함한 object key가 충돌하지 않는다.

### `PathKey`

`FormState.fields`와 `FormState.arrayKeys`는 string key가 필요하다. `FormPath`는 tuple path를 안정적인 string key로 변환한다.

| FieldPath | PathKey |
| --- | --- |
| `[]` | `$` |
| `['email']` | `["email"]` |
| `['user', 'name']` | `["user","name"]` |
| `['items', 0, 'title']` | `["items",0,"title"]` |

구현은 separator 기반 문자열 대신 JSON array string을 사용한다. 그래서 `"user.name"` 같은 literal field name도 안전하다.

### `FieldState`

`FieldState`는 하나의 leaf field가 가진 value와 metadata를 저장한다.

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

Flag의 의미:

- `touched`: field가 한 번 이상 blur되었다.
- `dirty`: 현재 value가 같은 path의 initial value와 `Object.is` 기준으로 다르다.
- `modified`: `source: 'user'` write로 field가 변경되었다.
- `isFocused`: field가 현재 focus 중이다. `focus()`가 `true`로, `blur()`가 (`validateOn`과 무관하게 항상) `false`로 설정한다.
- `errors`: validation 또는 manual assignment로 붙은 field errors.

### `FormState`

Internal snapshot은 정규화되어 있다.

```ts
type FormState<TValues> = {
  defaultValues: TValues;
  fields: Record<PathKey, FieldState>;
  submitCount: number;
  arrayKeys: Record<PathKey, string[]>;
};
```

다음 input이 있을 때:

```ts
const form = new CreateForm({
  defaultValues: {
    user: { name: 'Ada' },
    items: [{ title: 'A' }, { title: 'B' }],
  },
});
```

Core는 leaf field states와 array container keys를 따로 저장한다.

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

`getValues()`는 `fields`와 `arrayKeys`에서 nested object를 복원한다.

### `FormError`

```ts
type FormError = {
  type?: string;
  message: string;
};
```

Schema error는 `type: 'standard_schema'`를 사용한다. `setErrors()`로 error를 직접 설정할 수도 있다.

### `ValidationTrigger`

```ts
type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';
```

`validateOn`은 automatic validation을 제어한다. 생략하면 기본값은 `['submit']`이다. Manual validation은 `trigger()`로 언제든 실행할 수 있다.

### `StandardSchemaV1`

Core는 Standard Schema compatible object를 받는다.

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

실패 시 `validate()`는 `issues`를 반환한다. 각 issue path는 `FieldPath`로 변환되고, 다시 `PathKey`로 변환된 뒤 해당 `FieldState.errors`에 기록된다.

### Field-local schemas

Framework adapter는 single field에 대한 schema를 등록할 수 있다.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});
```

Field-local schema가 있으면 해당 field는 form-level schema 대신 그 schema를 사용한다.

```txt
field-local schema > form-level schema
```

Cleanup function은 자신이 등록한 schema가 여전히 해당 field의 최신 registration일 때만 제거한다.

### `ArrayKeys`

Array item identity는 array values와 별도로 저장된다.

- `defaultValues`에서 온 item은 deterministic key를 받는다: `initial-0`, `initial-1`, ...
- Runtime insertion은 generated key를 받는다: `item-1`, `item-2`, ...
- `move()`와 `swap()`은 value와 함께 key를 이동시킨다.
- `replace()`는 모든 새 item에 새 key를 만들고 old child metadata를 보존하지 않는다.

이 key들은 framework list rendering을 위한 것이다.

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

- `defaultValues`: required default value tree. reset/dirty 기준값으로도 사용된다.
- `schema`: optional Standard Schema v1 compatible schema.
- `schemaOptions`: optional Standard Schema validation options.
- `validateOn`: optional automatic validation triggers. Defaults to `['submit']`.

### `getState()`

현재 `FormState` snapshot을 반환한다.

```ts
const state = form.getState();
console.log(state.submitCount);
```

반환된 object는 read-only로 취급해야 한다.

### `subscribe(listener)`

Store change를 구독하고 unsubscribe function을 반환한다.

```ts
const unsubscribe = form.subscribe(() => {
  console.log(form.getValues());
});

unsubscribe();
```

Framework adapter는 이 method를 사용해 core store와 reactive rendering을 연결한다.

### `registerFieldSchema(path, options)`

Field-local schema를 등록하고 cleanup function을 반환한다.

```ts
const cleanup = form.registerFieldSchema('email', {
  schema: emailSchema,
});

cleanup();
```

이 API는 주로 framework adapter를 위한 것이다. Field-local schema는 `blur()`, `trigger()`, `submit()` 동안 해당 field에서 form-level schema보다 우선한다.

### `getFieldState(path)`

Path에 해당하는 `FieldState`를 반환한다. Field가 아직 존재하지 않아도 `undefined` 대신 default field state를 반환한다.

```ts
const email = form.getFieldState('email');
```

### `getValue(path)`

현재 field value만 반환한다.

```ts
const email = form.getValue('email');
```

### `getValues()`

전체 nested values object를 복원해 반환한다.

```ts
const values = form.getValues();
```

### `setValue(path, value, options?)`

하나의 field value를 쓴다.

```ts
form.setValue(['user', 'name'], 'Grace', {
  source: 'user',
  validate: true,
});
```

Effects:

1. Public path input을 internal tuple path로 변환한다.
2. 새 value를 해당 `FieldState`에 쓴다.
3. 같은 path의 `defaultValues`와 비교해 `dirty`를 다시 계산한다.
4. `source === 'user'`일 때만 `modified`를 `true`로 만든다.
5. `options.validate`가 true이거나 `validateOn`에 `'change'`가 있으면 change validation을 시작한다.

`setValue()`는 `void`를 반환한다. Change validation은 async로 시작되며 method가 await하지 않는다.

Async validation은 target-aware하게 동작한다. 새 validation은 겹치는 field만 supersede하며 서로 독립적인 field validation은 동시에 완료될 수 있다. Full-form submit validation은 자신이 검증한 value snapshot도 확인한다. stale submit은 authoritative result를 얻을 때까지 재검증하며 기본값으로 `onValid`를 호출하지 않는다.

### `blur(path)`

Field를 touched 처리하고 필요하면 validate한다.

```ts
const valid = await form.blur('email');
```

`validateOn`에 `'blur'`가 없으면 field를 touch한 뒤 `true`를 반환한다.

### `focus(path)`

`path`에 해당하는 field의 `isFocused`를 `true`로 바꾼다. 다른 field는 건드리지 않는다 — DOM이 이전에 focus 되어 있던 element에 자연스럽게 `blur` 이벤트를 발생시키므로, `blur()`를 통해 `isFocused`가 clearing된다. Array rebasing 시 `isFocused`는 `move`/`swap`/`insert`/`remove`에 대해 보존된다.

core는 DOM과 독립적이므로 여러 field에 `focus()`를 호출하면 둘 이상이 동시에 `isFocused: true`가 될 수 있다. DOM 어댑터에서는 브라우저가 자연스럽게 한 번에 하나로 제한하지만, core를 직접 사용할 때는 이전 field를 `blur()` 하는 것은 호출자의 책임이다. `useFormState().focusedField` aggregate는 **`Object.entries` 순서상 첫 번째**로 발견된 focused field를 반환하며, "가장 최근에 focus 된 field"가 아니다. 모든 focused field를 알려면 `state.fields`를 직접 순회하라.

### `setErrors(path, errors)`

하나의 field error list를 교체한다.

```ts
form.setErrors('email', [{ message: 'Email is required' }]);
```

### `clearErrors(...paths)`

특정 field들의 errors를 비우거나, path를 넘기지 않으면 existing field 전체 errors를 비운다.

```ts
form.clearErrors('email');
form.clearErrors();
```

### `trigger(...paths)`

Manual validation을 실행한다.

```ts
await form.trigger('email');
await form.trigger();
```

Path가 있으면 full schema result에서 해당 field errors만 update한다. Path가 없으면 registered fields와 schema error keys 전체를 update한다.

### `array(path)`

Array field를 위한 `FormArray` controller를 반환한다.

```ts
const items = form.array('items');

items.push({ title: 'C' });
items.move(2, 0);
console.log(items.keys());
```

Array controller는 command가 실행될 때마다 store에서 최신 values와 keys를 읽는다.

### `reset(values?, options?)`

Form을 initial state로 되돌린다.

```ts
form.reset();
form.reset({ email: 'new@example.com' });
form.reset({ email: 'new@example.com' }, { keepDirtyValues: true });
```

Argument가 없으면 현재 `defaultValues`를 재사용한다. Argument가 있으면 그 값이 새로운 `defaultValues`가 된다.

Reset options는 새 normalized value shape에도 살아남은 field path에 대해 일부 상태를 보존한다.

| Option | Behavior |
| --- | --- |
| `keepDirtyValues` | dirty field의 현재 value를 유지하고 새 `defaultValues` 기준으로 dirty를 다시 계산한다. |
| `keepErrors` | 살아남은 field path의 errors를 유지한다. |
| `keepTouched` | 살아남은 field path의 touched flag를 유지한다. |
| `keepSubmitState` | `submitCount`, `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`을 유지한다. |

### `submit(onValid, onInvalid?)`

`submitCount`를 증가시키고 form을 validate한 뒤 알맞은 callback을 호출한다.

```ts
const result = await form.submit(
  values => values,
  fields => {
    console.log(fields);
  },
);
```

Validation이 실패하면 `onInvalid`는 현재 `fields` object를 받고 `submit()`은 `undefined`를 반환한다. Validation이 성공하면 `onValid`는 복원된 values를 받는다.

### `FormArray.keys()`

현재 array items를 rendering하기 위한 stable keys를 반환한다.

```ts
const keys = form.array('items').keys();
```

### `FormArray.insert(index, value)`

Item을 삽입한다. Out-of-range index는 `0...length` 범위로 보정된다.

### `FormArray.push(value)`

Item을 끝에 추가한다.

### `FormArray.remove(index)`

Item을 제거한다. Invalid index는 무시된다.

### `FormArray.move(fromIndex, toIndex)`

Item 하나를 이동한다. Invalid index 또는 no-op move는 무시된다.

### `FormArray.swap(leftIndex, rightIndex)`

두 item을 교환한다. Invalid index 또는 같은 index는 무시된다.

### `FormArray.replace(values)`

Array 전체를 교체한다. 기존 item link를 의도적으로 끊기 때문에 child field metadata는 보존되지 않는다.

## Runtime flows

### 필드 명령

`src/core/form/CreateForm.ts`부터 읽으면 명령의 전체 순서를 볼 수 있다.

```txt
setValue -> 경로 정규화 -> store.setValue -> 필요하면 change 검증
blur     -> 경로 정규화 -> unfocus -> touch -> 필요하면 blur 검증
trigger  -> 경로 정규화 -> 지정 필드 또는 전체 검증
array    -> form이 공유하는 키 생성기로 controller 생성
submit   -> 제출 큐 -> 검증 -> callback -> 완료 처리
```

상태 변경은 동기적으로 알린다. Blur의 unfocus와 touch 알림은 각각 유지한다.
`dirty`는 기본값과의 `Object.is` 비교 결과이고, `modified`는 사용자 입력으로
변경되었는지를 기록한다. 두 flag의 의미는 다르다.

### 검증과 제출

지정 필드 검증은 local schema를 먼저 실행한 뒤 나머지 대상에 form schema를
적용한다. 전체 검증은 form schema 이후 등록된 local schema를 실행한다.
Local 결과는 빈 오류 목록을 포함해 form schema 결과보다 우선한다. Local schema가
없는 지정 필드 검증은 form 전체 schema를 실행하지만 지정 필드 오류만 기록한다.

비동기 단계마다 검증 revision과 캡처한 값이 유효한지 확인한다. 서로 다른 필드의
검증은 순서가 바뀌어 완료되어도 반영되지만, 겹치는 검증은 최신 결과를 덮어쓰면
안 된다. 오류는 기존처럼 필드별로 기록하며 새로운 일괄 알림을 도입하지 않는다.

`FormSubmitter`는 동시 제출을 큐에 넣는다. 시도 횟수는 즉시 증가시키고,
stale 검증은 다시 실행한다. Invalid이면 `onInvalid`, valid이면 현재 값으로
`onValid`를 호출하고, 대기 중인 제출이 모두 끝나면 submit 상태를 완료한다.

### 배열 변경

```txt
controller가 현재 값과 키를 읽음
  -> 정적 planner가 { values, keys, mapPreviousIndex } 계산
  -> store.replaceState(previousState => rebase(previousState, path, mutation))
  -> 다음 snapshot 한 번 반영
```

Rebaser는 전달받은 snapshot에서 값을 복원하고 다음 상태를 초기화한 뒤,
살아남은 자식 필드 메타데이터와 중첩 배열 키를 새 경로로 옮긴다. Errors, touched,
dirty, modified, focus는 item을 따라간다. 배열 밖 필드와 submit 상태는 보존한다.
Replace는 기존 자식 메타데이터를 버리고 새 키를 만든다. 기존 defaultValues
동작도 그대로 유지한다.

## Internal architecture

```txt
CreateForm                         공개 명령 순서와 공유 배열 키
  FormStateStore                   상태 소유와 쓰기
    FormStateInitializer           중첩 기본값 -> 정규화된 snapshot
    FormStateReader                snapshot -> 필드와 중첩 값
  ValidationEngine                 schema 등록과 검증 단계
    StandardSchemaValidator        schema 결과 -> 필드 오류
    ValidationSequencer            겹치는 검증의 revision
    ValidationSnapshot             캡처한 값과 배열 키 비교
  FormSubmitter                    제출 큐와 callback 수명
  FormArrayController              배열 읽기와 상태 반영
    FormArrayMutationPlanner       순수 배열 변경 계산
    FormArrayRebaser                이전 snapshot + 변경 결과 -> 다음 snapshot
```

React, Vue, Solid, Svelte adapter는 공개 `Form` 계약에 의존한다.
`adapters/`는 DOM 값·바인딩과 상태 집계를 공유하고, 구독과 컴포넌트 수명 관리는
각 framework 디렉터리에 남긴다.

## Core walkthrough

모든 import를 따라가기보다 아래 순서로 읽으면 된다.

| 알고 싶은 내용 | `src/core/` 아래 파일 | 책임 |
| --- | --- | --- |
| 공개 명령 다음에 무슨 일이 일어나는가? | `form/CreateForm.ts` | 경로 변환, 상태 변경, 검증 요청. |
| 상태는 어디서 바뀌는가? | `state/FormStateStore.ts` | store 소유와 immer 쓰기, reset·submit flag 반영. |
| 값을 어떻게 복원하는가? | `state/FormStateReader.ts` | 명시적으로 받은 snapshot의 정적 계산. Store나 getter를 소유하지 않는다. |
| 초기 상태는 어떻게 만드는가? | `state/FormStateInitializer.ts` | 배열과 일반 객체를 순회하고 빈 객체·특수 객체·원시값은 leaf로 유지. |
| 없는 필드는 어떻게 읽는가? | `state/FieldStateFactory.ts` | undefined 값, 새 오류 배열, isFocused를 포함한 false flag 생성. |
| 경로는 어떻게 표현하는가? | `path/FormPath.ts` | 문자열은 단일 segment, tuple은 JSON key, root는 `$`. |
| 중첩 값을 어떻게 변경하는가? | `value/ValueHelper.ts` | 불변 nested get/set과 fields·배열 container에서 값 복원. |
| 검증 결과는 언제 적용하는가? | `validation/ValidationEngine.ts` | Local schema 우선순위, 지정·전체 검증 실행, stale 판별. |
| 어느 검증이 이전 검증을 대체하는가? | `validation/ValidationSequencer.ts` | 전체·필드별 revision과 schema 등록에 따른 무효화. |
| 검증 중 값이 달라졌는가? | `validation/ValidationSnapshot.ts` | 필드 값과 배열 키 identity 캡처·비교. |
| Schema issue는 어떻게 변환하는가? | `validation/StandardSchemaValidator.ts` | Standard Schema issue 정규화. 없거나 지원하지 않는 경로는 root 오류. |
| 제출 순서는 어떻게 보장하는가? | `form/FormSubmitter.ts` | 제출 큐, stale 검증 재시도, 완료 상태 처리. |
| 다음 배열 순서는 무엇인가? | `array/FormArrayMutationPlanner.ts` | 인스턴스나 store 없이 정적 insert/push/remove/move/swap/replace 계산. |
| 메타데이터는 어떻게 item을 따라가는가? | `array/FormArrayRebaser.ts` | Store 접근이나 알림 없는 순수 snapshot 변환. |
| 배열 변경은 누가 반영하는가? | `array/FormArrayController.ts` | 배열 상태를 읽고 updater의 snapshot을 rebaser에 전달. |
| 배열 키는 어디서 만드는가? | `array/ArrayKeyGenerator.ts` | CreateForm마다 하나를 소유하고 새 controller들과 공유. |
| Index와 경로는 어떻게 옮기는가? | `array/ArrayItemReorder.ts`, `array/FormArrayPath.ts` | 순수 정렬·index mapping·자식 경로 교체. |

공개 surface는 `src/index.ts`와 framework entry point가 정의한다.
`core/types.ts`는 기존 경로·상태·schema·명령 계약을 설명한다.
내부 모듈은 구현 상세이며 새로운 package export가 아니다.

## Design decisions

### Strings are literal paths

Dot-path parsing은 편하지만 모호하다. 이 core는 unambiguous tuple paths를 선택한다.

```ts
'user.name'        // one field named "user.name"
['user', 'name']   // nested user.name field
```

### State is normalized

Normalized fields는 whole nested value object를 mutate하지 않고도 개별 metadata를 update하기 쉽게 만든다. `ValueHelper`는 필요할 때 public value shape을 복원한다.

### Validation is schema-library independent

Core는 Standard Schema만 안다. 그래서 여러 validation library와 호환되고 특정 validator를 import하지 않는다.

### Array mutation is split into planning and rebasing

`FormArrayMutationPlanner`는 next array가 어떤 모습인지 결정한다. `FormArrayRebaser`는 전체 form state가 어떻게 따라가야 하는지 결정한다. 이 분리는 mutation math를 pure하게 만들고 store updates를 중앙화한다.

### `dirty` and `modified` are different

`dirty`는 current value와 initial value를 비교한다. `modified`는 user-originated writes를 추적한다. Programmatic update는 dirty일 수 있지만 user modified는 아닐 수 있다.

## Testing and development

### Commands

```sh
pnpm build
pnpm typecheck
pnpm test
```

`pnpm build`는 tsup으로 core와 네 framework entry point의 ESM JavaScript 및 declaration files를 bundle한다. `pnpm test:pack`은 별도 consumer에서 packed package의 runtime import와 TypeScript 계약을 확인한다.

`pnpm test`는 Vitest suite를 실행한다.

### Current test coverage themes

Existing tests는 다음을 cover한다.

1. Tuple paths와 literal string names의 차이.
2. Blur, manual trigger, submit에서의 Standard Schema validation.
3. Move와 remove 시 array value/key/metadata rebasing.
4. React adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema precedence.
5. Vue adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema cleanup.
6. Solid adapter의 text input, textarea, checkbox, radio, select, `useField`, overloaded `useRegister`, `useFormState`, field-local schema cleanup.
7. Svelte register action의 text input, checkbox, radio, select, multiple select, readable `useFormState`, field-local schema cleanup.

### Suggested future documentation/tests

좋은 추가 항목:

- `insert()` index bounding test.
- `replace()`가 child metadata를 의도적으로 drop하는지에 대한 test.
- Root-level schema errors test.
- Custom DOM-event-compatible component를 위한 adapter examples.

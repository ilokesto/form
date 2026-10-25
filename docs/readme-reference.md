# Core implementation reference

[README](../README.md) | [한국어](./readme-reference.ko.md)

This source-reading guide preserves the core walkthrough from the README.
Internal modules are not additional public exports. For application code, start with
[core concepts](./core-concepts.mdx), [field paths](./advanced/path-semantics.mdx),
[validation](./reference/validation.mdx), and [submit and reset](./reference/submit-and-reset.mdx).

Framework event bindings and external-value synchronization are covered by
[React](./integrations/react.mdx), [Vue](./integrations/vue.mdx),
[Solid](./integrations/solid.mdx), and [Svelte](./integrations/svelte.mdx).

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

### `focus(path)`

Sets `isFocused: true` on the field at `path`. Other fields are not touched — DOM naturally fires a `blur` event on the previously focused element, which clears `isFocused` via `blur()`. Array rebasing preserves `isFocused` across `move`/`swap`/`insert`/`remove`.

The core is DOM-independent, so calling `focus()` on multiple fields can leave more than one field with `isFocused: true`. In DOM adapters this is naturally bounded to one by the browser; in direct core usage it is the caller's responsibility to `blur()` the previous field. The `useFormState().focusedField` aggregate returns the **first** focused field found in `Object.entries` order, not the most recently focused one — to enumerate all focused fields, iterate `state.fields` directly.

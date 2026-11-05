import { createStore, type StoreApi } from '@ilokesto/store';
import { produce } from 'immer';

import { FieldStateFactory } from './FieldStateFactory';
import { FormStateInitializer } from './FormStateInitializer';
import { FormStateReader } from './FormStateReader';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FieldPathInput, FieldState, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

/**
 * @description Owns immutable form snapshots and writes; each command preserves the store notification boundary.
 * @example
 * ```ts
 * const store = new FormStateStore({ email: "" });
 * store.setValue(["email"], "Ada");
 * ```
 */
export class FormStateStore<TValues> {
  private readonly store: StoreApi<FormState<TValues>>;

  /**
   * @description Create a store by normalizing the supplied default values.
   * @param {TValues} defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @example
   * ```ts
   * const store = new FormStateStore({ email: "" });
   * ```
   */
  public constructor(defaultValues: TValues) {
    this.store = createStore<FormState<TValues>>(FormStateInitializer.initialize(defaultValues));
  }

  /**
   * @description Read the current immutable form snapshot without cloning it.
   * @returns {Readonly<FormState<TValues>>} Current read-only snapshot; callers must not mutate it.
   * - defaultValues `TValues` - Initial values and the baseline used for dirty checks and reset.
   * - fields `Record<string, FieldState<unknown>>` - Field snapshots indexed by normalized path keys.
   * - submitCount `number` - Number of submission attempts started by the form.
   * - isSubmitting `boolean` - Whether queued validation or a submit callback is still pending.
   * - isSubmitted `boolean` - Whether a submission has completed at least once.
   * - isSubmitSuccessful `boolean` - Whether the latest completed submission reached a successful valid callback.
   * - arrayKeys `ArrayKeys` - Stable rendering keys indexed by array path.
   * @example
   * ```ts
   * store.getState();
   * ```
   */
  public getState(): Readonly<FormState<TValues>> {
    return this.store.getState();
  }

  /**
   * @description Subscribe to form state changes and return the callback that unsubscribes this listener.
   * @param {() => void} listener - Callback invoked synchronously after a state change.
   * @returns {() => void} Cleanup callback for this subscription or registration.
   * @example
   * ```ts
   * store.subscribe(() => render());
   * ```
   */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * @description Read a normalized field key, returning an independent default snapshot when absent.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @returns {Readonly<FieldState>} Stored field snapshot, or an empty snapshot for an absent key.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * store.getFieldStateByKey(FormPath.pathToKey(["email"]));
   * ```
   */
  public getFieldStateByKey(fieldKey: PathKey): Readonly<FieldState> {
    return FormStateReader.getFieldStateByKey(this.store.getState(), fieldKey);
  }

  /**
   * @description Read field metadata and use a default snapshot when the field is not present.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {Readonly<FieldState>} Field snapshot, with a default shape when the leaf field is absent.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * store.getFieldState(["email"]);
   * ```
   */
  public getFieldState(fieldPath: FieldPathInput): Readonly<FieldState> {
    return FormStateReader.getFieldState(this.store.getState(), fieldPath);
  }

  /**
   * @description Read only the current value of the selected field.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {unknown} Stored field value, or undefined when the field has no value.
   * @example
   * ```ts
   * store.getValue(["email"]);
   * ```
   */
  public getValue(fieldPath: FieldPathInput): unknown {
    return FormStateReader.getValue(this.store.getState(), fieldPath);
  }

  /**
   * @description Reconstruct the nested values object from leaf fields and array containers.
   * @returns {TValues} Nested values reconstructed in the shape of the supplied defaults.
   * @example
   * ```ts
   * store.getValues();
   * ```
   */
  public getValues(): TValues {
    return FormStateReader.getValues(this.store.getState());
  }

  /**
   * @description Read a nested tuple path, returning undefined when a traversed container is missing or primitive.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @returns {unknown} Value at the tuple path, or undefined for an unreachable path.
   * @example
   * ```ts
   * store.getValueAtPath(["email"]);
   * ```
   */
  public getValueAtPath(fieldPath: FieldPath): unknown {
    return FormStateReader.getValueAtPath(this.store.getState(), fieldPath);
  }

  /**
   * @description Write a field value, compare dirty state with its default, and mark user-originated changes as modified. Return the normalized key for subsequent validation.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @param {unknown} value - Value to store or inspect.
   * @param {SetValueOptions} [options] - Write origin and optional immediate validation request.
   * @param {"user" | "program" | undefined} [options.source] - Write origin; user writes mark the field as modified.
   * @param {boolean | undefined} [options.validate] - Validation request for the controller; the state store itself does not run validation.
   * @returns {string} Normalized field key for the updated value.
   * @example
   * ```ts
   * store.setValue(["email"], "Ada", { source: "user" });
   * ```
   */
  public setValue(fieldPath: FieldPath, value: unknown, options: SetValueOptions = {}): PathKey {
    const fieldKey = FormPath.pathToKey(fieldPath);
    const defaultValue = ValueHelper.getValueAtPath(this.store.getState().defaultValues, fieldPath);

    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...FieldStateFactory.create(value),
          errors: previousField.errors,
          touched: previousField.touched,
          isFocused: previousField.isFocused,
          dirty: !Object.is(value, defaultValue),
          modified: options.source === 'user' ? true : previousField.modified,
        };
      }),
    );

    return fieldKey;
  }

  /**
   * @description Mark a field touched, creating default metadata if the field does not yet exist.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @example
   * ```ts
   * store.touchField(FormPath.pathToKey(["email"]));
   * ```
   */
  public touchField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          touched: true,
        };
      }),
    );
  }

  /**
   * @description Record focus, creating a default snapshot for an unknown field without clearing other fields.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @example
   * ```ts
   * store.focusField(FormPath.pathToKey(["email"]));
   * ```
   */
  public focusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: true,
        };
      }),
    );
  }

  /**
   * @description Clear focus, creating a default snapshot for an unknown field if necessary.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @example
   * ```ts
   * store.unfocusField(FormPath.pathToKey(["email"]));
   * ```
   */
  public unfocusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: false,
        };
      }),
    );
  }

  /**
   * @description Replace the errors for a normalized field key, creating a default field if necessary.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @param {readonly FormError[]} errors - Current validation errors for the field.
   * @example
   * ```ts
   * store.setErrorsByKey(FormPath.pathToKey(["email"]), errors);
   * ```
   */
  public setErrorsByKey(fieldKey: PathKey, errors: readonly FormError[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          errors: [...errors],
        };
      }),
    );
  }

  /**
   * @description Clear selected fields or all fields when no paths are provided.
   * @param {readonly string[] | undefined} [fieldKeys] - Normalized path keys to target.
   * @example
   * ```ts
   * store.clearErrors([FormPath.pathToKey(["email"])]);
   * ```
   */
  public clearErrors(fieldKeys?: readonly PathKey[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const keys = fieldKeys && fieldKeys.length > 0 ? fieldKeys : Object.keys(draft.fields);

        keys.forEach(fieldKey => {
          const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

          draft.fields[fieldKey] = {
            ...previousField,
            errors: [],
          };
        });
      }),
    );
  }

  /**
   * @description Reinitialize values and metadata, optionally retaining dirty values, errors, touched flags, and submission state.
   * @param {TValues | undefined} [values] - Replacement or current form values.
   * @param {ResetOptions} [options] - State preservation flags for this reset.
   * @param {boolean | undefined} [options.keepDirtyValues] - Preserve current values and modified flags of dirty fields.
   * @param {boolean | undefined} [options.keepErrors] - Preserve errors on surviving field paths.
   * @param {boolean | undefined} [options.keepTouched] - Preserve touched flags on surviving field paths.
   * @param {boolean | undefined} [options.keepSubmitState] - Preserve submission counters and lifecycle flags.
   * @example
   * ```ts
   * store.reset({ email: "Ada" }, { keepTouched: true });
   * ```
   */
  public reset(values?: TValues, options: ResetOptions = {}): void {
    const previousState = this.store.getState();
    const nextDefaultValues = values ?? previousState.defaultValues;
    const initializedState = FormStateInitializer.initialize(nextDefaultValues);

    this.store.setState(
      produce(initializedState, draft => {
        Object.entries(draft.fields).forEach(([fieldKey, nextField]) => {
          const previousField = previousState.fields[fieldKey];

          if (!previousField) {
            return;
          }

          if (options.keepDirtyValues && previousField.dirty) {
            const fieldPath = FormPath.keyToPath(fieldKey);
            const defaultValue = ValueHelper.getValueAtPath(nextDefaultValues, fieldPath);

            nextField.value = previousField.value;
            nextField.dirty = !Object.is(previousField.value, defaultValue);
            nextField.modified = previousField.modified;
          }

          if (options.keepErrors) {
            nextField.errors = [...previousField.errors];
          }

          if (options.keepTouched) {
            nextField.touched = previousField.touched;
          }
        });

        if (options.keepSubmitState) {
          draft.submitCount = previousState.submitCount;
          draft.isSubmitting = previousState.isSubmitting;
          draft.isSubmitted = previousState.isSubmitted;
          draft.isSubmitSuccessful = previousState.isSubmitSuccessful;
        }
      }),
    );
  }

  /**
   * @description Increment the attempt counter, mark submission pending, and clear the previous success flag.
   * @example
   * ```ts
   * store.beginSubmit();
   * ```
   */
  public beginSubmit(): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.submitCount += 1;
        draft.isSubmitting = true;
        draft.isSubmitSuccessful = false;
      }),
    );
  }

  /**
   * @description Finish the submission lifecycle and record whether the valid callback succeeded.
   * @param {boolean} successful - Whether the final submission callback completed successfully.
   * @example
   * ```ts
   * store.completeSubmit(true);
   * ```
   */
  public completeSubmit(successful: boolean): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.isSubmitting = false;
        draft.isSubmitted = true;
        draft.isSubmitSuccessful = successful;
      }),
    );
  }

  /**
   * @description Apply a complete normalized state updater through the underlying store.
   * @param {(previousState: FormState<TValues>) => FormState<TValues>} updater - State updater that replaces the complete normalized snapshot.
   * @example
   * ```ts
   * store.replaceState(previous => ({ ...previous, submitCount: 0 }));
   * ```
   */
  public replaceState(updater: (previousState: FormState<TValues>) => FormState<TValues>): void {
    this.store.setState(updater);
  }
}

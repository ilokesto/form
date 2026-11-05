import type { FieldPathInput, FieldState, Form, FormState } from '../../core/index';
import { FieldStateFactory } from '../../core/state/FieldStateFactory';

/**
 * @description Read field metadata, reconstructing container values from current nested values when no leaf field exists.
 * @param {Form<TValues>} form - Core form instance shared by all bound helpers.
 * @param {() => Readonly<FormState<TValues>>} form.getState - Read the current immutable form snapshot.
 * @param {(listener: () => void) => () => void} form.subscribe - Subscribe to state changes and return an unsubscribe callback.
 * @param {(path: FieldPathInput, options: FieldSchemaOptions) => () => void} form.registerFieldSchema - Register an overriding field-local validator and return its guarded cleanup.
 * @param {(path: FieldPathInput) => Readonly<FieldState>} form.getFieldState - Read field metadata, using a default snapshot for an unknown field.
 * @param {(path: FieldPathInput) => unknown} form.getValue - Read the current value of one field.
 * @param {() => TValues} form.getValues - Reconstruct nested values from fields and array containers.
 * @param {(path: FieldPathInput, value: unknown, options?: SetValueOptions) => void} form.setValue - Write a field with configurable user or program origin and optional immediate validation.
 * @param {(path: FieldPathInput) => Promise<boolean>} form.blur - Clear focus, mark touched, and run configured blur validation.
 * @param {(path: FieldPathInput) => void} form.focus - Record focus for the selected field.
 * @param {(path: FieldPathInput, errors: readonly FormError[]) => void} form.setErrors - Replace all errors for the selected field.
 * @param {(...paths: FieldPathInput[]) => void} form.clearErrors - Clear selected fields, or all field errors when no paths are supplied.
 * @param {(...paths: FieldPathInput[]) => Promise<boolean>} form.trigger - Run manual validation for selected paths or the entire form.
 * @param {(path: FieldPathInput) => FormArray} form.array - Return commands that keep array values, keys, and child metadata aligned.
 * @param {(values?: TValues | undefined, options?: ResetOptions) => void} form.reset - Reinitialize from default or replacement values with optional preservation flags.
 * @param {<TResult>(onValid: (values: TValues) => TResult | Promise<TResult>, onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void) => Promise<TResult | undefined>} form.submit - Queue validation and dispatch the valid or invalid callback.
 * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
 * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
 * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
 * @param {number} state.submitCount - Number of submission attempts started by the form.
 * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
 * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
 * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
 * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
 * @param {FieldPathInput} name - Literal field name or tuple path; strings are not split on dots.
 * @returns {Readonly<FieldState>} Field snapshot, with a default shape when the leaf field is absent.
 * - value `unknown` - Current field value.
 * - errors `FormError[]` - Current validation errors for the field.
 * - touched `boolean` - Whether the field has blurred at least once.
 * - dirty `boolean` - Whether the current value differs from its default by Object.is.
 * - modified `boolean` - Whether a user-originated write has changed this field.
 * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
 * @example
 * ```ts
 * const field = getFieldState(form, form.getState(), "email");
 * ```
 */
export function getFieldState<TValues>(form: Form<TValues>, state: Readonly<FormState<TValues>>, name: FieldPathInput): Readonly<FieldState> {
  const field = form.getFieldState(name);

  if (fieldPathExists(state, name)) {
    return field;
  }

  const value = getValueAtPath(form.getValues(), toFieldPath(name));

  return {
    ...field,
    value,
  };
}

function toFieldPath(name: FieldPathInput): readonly (string | number)[] {
  return typeof name === 'string' ? [name] : name;
}

function fieldPathExists<TValues>(state: Readonly<FormState<TValues>>, name: FieldPathInput): boolean {
  const field = state.fields[pathInputToKey(name)];
  return field !== undefined && FieldStateFactory.ownsValue(field);
}

function pathInputToKey(name: FieldPathInput): string {
  const path = toFieldPath(name);

  return path.length === 0 ? '$' : JSON.stringify(path);
}

function getValueAtPath(source: unknown, path: readonly (string | number)[]): unknown {
  let current = source;

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object' && typeof current !== 'function') {
      return undefined;
    }

    current = (current as Record<string | number, unknown>)[segment];
  }

  return current;
}

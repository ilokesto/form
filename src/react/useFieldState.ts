import type { FieldPathInput, Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import type { UseFieldStateReturn } from './types';
import { useFormSnapshot } from './useFormSnapshot';

/**
 * @description Subscribe to one field snapshot with its value type inferred from the form values and literal or tuple path.
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
 * @param {TName} name - Literal field name or tuple path; strings are not split on dots.
 * @returns {Readonly<FieldState<FieldPathValue<TValues, TName>>>} Read-only field snapshot whose value follows the supplied path type.
 * - value `FieldPathValue<TValues, TName>` - Current field value.
 * - errors `FormError[]` - Current validation errors for the field.
 * - touched `boolean` - Whether the field has blurred at least once.
 * - dirty `boolean` - Whether the current value differs from its default by Object.is.
 * - modified `boolean` - Whether a user-originated write has changed this field.
 * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
 * @example
 * ```ts
 * useFieldStateWithForm(form, "email");
 * ```
 */
export function useFieldStateWithForm<TValues, const TName extends FieldPathInput>(form: Form<TValues>, name: TName): UseFieldStateReturn<TValues, TName> {
  const state = useFormSnapshot(form);

  return getFieldState(form, state, name) as UseFieldStateReturn<TValues, TName>;
}

import { useSyncExternalStore } from 'react';
import type { Form, FormState } from '../core/index';

/**
 * @description Subscribe the framework view to core form snapshots and release the subscription through its lifecycle.
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
 * @returns {Readonly<FormState<TValues>>} Framework subscription to current immutable snapshots.
 * - defaultValues `TValues` - Initial values and the baseline used for dirty checks and reset.
 * - fields `Record<string, FieldState<unknown>>` - Field snapshots indexed by normalized path keys.
 * - submitCount `number` - Number of submission attempts started by the form.
 * - isSubmitting `boolean` - Whether queued validation or a submit callback is still pending.
 * - isSubmitted `boolean` - Whether a submission has completed at least once.
 * - isSubmitSuccessful `boolean` - Whether the latest completed submission reached a successful valid callback.
 * - arrayKeys `ArrayKeys` - Stable rendering keys indexed by array path.
 * @example
 * ```ts
 * useFormSnapshot(form);
 * ```
 */
export function useFormSnapshot<TValues>(form: Form<TValues>): Readonly<FormState<TValues>> {
  return useSyncExternalStore(
    listener => form.subscribe(listener),
    () => form.getState(),
    () => form.getState(),
  );
}

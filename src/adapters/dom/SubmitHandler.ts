import type { FieldState, Form } from '../../core/index';
import type { PathKey } from '../../core/types';

export type SubmitEventLike = {
  /** Optional callback used to cancel native form submission. */
  preventDefault?: () => void;
};

export type SubmitValidHandler<TValues, TResult> = (values: TValues) => TResult | Promise<TResult>;

export type SubmitInvalidHandler = (fields: Readonly<Record<PathKey, FieldState>>) => void;

export type SubmitHandler<TEvent extends SubmitEventLike, TResult> = (event?: TEvent) => Promise<TResult | undefined>;

/**
 * @description Create an asynchronous event handler that optionally prevents default before running the form submission queue.
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
 * @param {SubmitValidHandler<TValues, TResult>} onValid - Callback receiving current values after successful validation.
 * @param {SubmitInvalidHandler | undefined} [onInvalid] - Callback receiving field snapshots when validation fails.
 * @returns {SubmitHandler<TEvent, TResult>} Event handler resolving to the valid callback result or undefined after invalid validation.
 * @example
 * ```ts
 * createSubmitHandler(form, values => save(values), fields => showErrors(fields));
 * ```
 */
export function createSubmitHandler<TValues, TEvent extends SubmitEventLike, TResult>(
  form: Form<TValues>,
  onValid: SubmitValidHandler<TValues, TResult>,
  onInvalid?: SubmitInvalidHandler,
): SubmitHandler<TEvent, TResult> {
  return async event => {
    event?.preventDefault?.();

    return form.submit(onValid, onInvalid);
  };
}

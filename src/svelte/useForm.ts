import { onDestroy } from 'svelte';
import { createSubmitHandler } from '../adapters/dom';
import {
  createExternalValuesSynchronizer,
  createFormFromOptions,
  isFormInstance,
  type FormInput,
} from '../adapters/FormInput';
import type { Form } from '../core/index';
import type { SvelteForm, SvelteFormOptions } from './types';
import { createRegisterAction } from './RegisterAction';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';

/**
 * @description Bind framework helpers to an existing form or create one from options; defined external-value reference changes reset it.
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
 * @param {SvelteFormOptions<TValues>} options - Default values, optional form schema, and automatic validation triggers.
 * @param {TValues} options.defaultValues - Initial values and the baseline used for dirty checks and reset.
 * @param {StandardSchemaV1<unknown, TValues> | undefined} [options.schema] - Standard Schema validator; a field-local schema takes precedence over the form schema.
 * @param {StandardSchemaV1.Props<unknown, TValues>} [options.schema.~standard] - Standard Schema version, vendor, type metadata, and validation entry point.
 * @param {1} [options.schema.~standard.version] - Standard Schema major version, which must be 1.
 * @param {string} [options.schema.~standard.vendor] - Name of the schema library implementation.
 * @param {StandardSchemaV1.Types<unknown, TValues> | undefined} [options.schema.~standard.types] - Optional compile-time input and output metadata.
 * @param {unknown} [options.schema.~standard.types.input] - Schema input type metadata.
 * @param {TValues} [options.schema.~standard.types.output] - Schema output type metadata.
 * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<TValues> | Promise<StandardSchemaV1.Result<TValues>>} [options.schema.~standard.validate] - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
 * @param {StandardSchemaV1.Options | undefined} [options.schemaOptions] - Options forwarded to the Standard Schema validator.
 * @param {Record<string, unknown> | undefined} [options.schemaOptions.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
 * @param {readonly ValidationTrigger[] | undefined} [options.validateOn] - Triggers that run automatic validation; defaults to submit.
 * @param {Readable<TValues | undefined> | undefined} [options.values] - Replacement values; defined reference changes reset the form.
 * @param {ResetOptions | undefined} [options.resetOptions] - State preservation policy for external-value resets.
 * @param {boolean | undefined} [options.resetOptions.keepDirtyValues] - Preserve current values and modified flags of dirty fields.
 * @param {boolean | undefined} [options.resetOptions.keepErrors] - Preserve errors on surviving field paths.
 * @param {boolean | undefined} [options.resetOptions.keepTouched] - Preserve touched flags on surviving field paths.
 * @param {boolean | undefined} [options.resetOptions.keepSubmitState] - Preserve submission counters and lifecycle flags.
 * @returns {SvelteForm<TValues>} Core form and bound framework helpers sharing its state and lifecycle.
 * - form `Form<TValues>` - Core form instance shared by all bound helpers.
 * : form.getState `() => Readonly<FormState<TValues>>` - Read the current immutable form snapshot.
 * : form.subscribe `(listener: () => void) => () => void` - Subscribe to state changes and return an unsubscribe callback.
 * : form.registerFieldSchema `(path: FieldPathInput, options: FieldSchemaOptions) => () => void` - Register an overriding field-local validator and return its guarded cleanup.
 * : form.getFieldState `(path: FieldPathInput) => Readonly<FieldState>` - Read field metadata, using a default snapshot for an unknown field.
 * : form.getValue `(path: FieldPathInput) => unknown` - Read the current value of one field.
 * : form.getValues `() => TValues` - Reconstruct nested values from fields and array containers.
 * : form.setValue `(path: FieldPathInput, value: unknown, options?: SetValueOptions) => void` - Write a field with configurable user or program origin and optional immediate validation.
 * : form.blur `(path: FieldPathInput) => Promise<boolean>` - Clear focus, mark touched, and run configured blur validation.
 * : form.focus `(path: FieldPathInput) => void` - Record focus for the selected field.
 * : form.setErrors `(path: FieldPathInput, errors: readonly FormError[]) => void` - Replace all errors for the selected field.
 * : form.clearErrors `(...paths: FieldPathInput[]) => void` - Clear selected fields, or all field errors when no paths are supplied.
 * : form.trigger `(...paths: FieldPathInput[]) => Promise<boolean>` - Run manual validation for selected paths or the entire form.
 * : form.array `(path: FieldPathInput) => FormArray` - Return commands that keep array values, keys, and child metadata aligned.
 * : form.reset `(values?: TValues | undefined, options?: ResetOptions) => void` - Reinitialize from default or replacement values with optional preservation flags.
 * : form.submit `<TResult>(onValid: (values: TValues) => TResult | Promise<TResult>, onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void) => Promise<TResult | undefined>` - Queue validation and dispatch the valid or invalid callback.
 * - register `SvelteRegisterAction` - Svelte action that synchronizes the node and removes subscriptions on destroy.
 * - useField `(options: RegisterOptions) => SvelteFieldReturn` - Create field bindings, reactive value and metadata, and a setter.
 * - useFormState `() => Readable<FormStateSummary<TValues>>` - Subscribe to form-wide errors and lifecycle aggregates.
 * - handleSubmit `<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler) => SubmitHandler<Event, TResult>` - Create an event handler that prevents default submission before validating.
 * @example
 * ```ts
 * const { form, handleSubmit } = useForm({ defaultValues: { email: "" } });
 * ```
 */
export function useForm<TValues>(form: Form<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(options: SvelteFormOptions<TValues>): SvelteForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues, SvelteFormOptions<TValues>>): SvelteForm<TValues> {
  const form = isFormInstance(input) ? input : createFormFromOptions(input);
  if (!isFormInstance(input) && input.values !== undefined) {
    const synchronizeValues = createExternalValuesSynchronizer(form);
    const resetOptions = input.resetOptions;
    let unsubscribe: (() => void) | undefined;
    onDestroy(() => {
      unsubscribe?.();
    });
    unsubscribe = input.values.subscribe(values => {
      synchronizeValues(values, resetOptions);
    });
  }

  return {
    form,
    register: createRegisterAction(form),
    useField(options) {
      return useFieldWithForm(form, options);
    },
    useFormState() {
      return useFormStateWithForm(form);
    },
    handleSubmit(onValid, onInvalid) {
      return createSubmitHandler(form, onValid, onInvalid);
    },
  };
}

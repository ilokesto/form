import { CreateForm, type CreateFormOptions, type Form, type ResetOptions } from '../core/index';

export type ReactiveFormOptions<TValues, TSource> = CreateFormOptions<TValues> & {
  /** Replacement values; defined reference changes reset the form. */
  readonly values?: TSource;
  /** State preservation policy for external-value resets. */
  readonly resetOptions?: ResetOptions;
};

export type FormInput<TValues, TOptions extends CreateFormOptions<TValues>> = Form<TValues> | TOptions;

/**
 * @description Distinguish an existing core form from creation options by its subscribe and submit members.
 * @param {Form<TValues> | CreateFormOptions<TValues>} input - Existing form instance or options used to create one.
 * @param {() => Readonly<FormState<TValues>>} input.getState - Read the current immutable form snapshot.
 * @param {(listener: () => void) => () => void} input.subscribe - Subscribe to state changes and return an unsubscribe callback.
 * @param {(path: FieldPathInput, options: FieldSchemaOptions) => () => void} input.registerFieldSchema - Register an overriding field-local validator and return its guarded cleanup.
 * @param {(path: FieldPathInput) => Readonly<FieldState>} input.getFieldState - Read field metadata, using a default snapshot for an unknown field.
 * @param {(path: FieldPathInput) => unknown} input.getValue - Read the current value of one field.
 * @param {() => TValues} input.getValues - Reconstruct nested values from fields and array containers.
 * @param {(path: FieldPathInput, value: unknown, options?: SetValueOptions) => void} input.setValue - Write a field with configurable user or program origin and optional immediate validation.
 * @param {(path: FieldPathInput) => Promise<boolean>} input.blur - Clear focus, mark touched, and run configured blur validation.
 * @param {(path: FieldPathInput) => void} input.focus - Record focus for the selected field.
 * @param {(path: FieldPathInput, errors: readonly FormError[]) => void} input.setErrors - Replace all errors for the selected field.
 * @param {(...paths: FieldPathInput[]) => void} input.clearErrors - Clear selected fields, or all field errors when no paths are supplied.
 * @param {(...paths: FieldPathInput[]) => Promise<boolean>} input.trigger - Run manual validation for selected paths or the entire form.
 * @param {(path: FieldPathInput) => FormArray} input.array - Return commands that keep array values, keys, and child metadata aligned.
 * @param {(values?: TValues | undefined, options?: ResetOptions) => void} input.reset - Reinitialize from default or replacement values with optional preservation flags.
 * @param {<TResult>(onValid: (values: TValues) => TResult | Promise<TResult>, onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void) => Promise<TResult | undefined>} input.submit - Queue validation and dispatch the valid or invalid callback.
 * @param {TValues} input.defaultValues - Initial values and the baseline used for dirty checks and reset.
 * @param {StandardSchemaV1<unknown, TValues> | undefined} [input.schema] - Standard Schema validator; a field-local schema takes precedence over the form schema.
 * @param {StandardSchemaV1.Props<unknown, TValues>} [input.schema.~standard] - Standard Schema version, vendor, type metadata, and validation entry point.
 * @param {1} [input.schema.~standard.version] - Standard Schema major version, which must be 1.
 * @param {string} [input.schema.~standard.vendor] - Name of the schema library implementation.
 * @param {StandardSchemaV1.Types<unknown, TValues> | undefined} [input.schema.~standard.types] - Optional compile-time input and output metadata.
 * @param {unknown} [input.schema.~standard.types.input] - Schema input type metadata.
 * @param {TValues} [input.schema.~standard.types.output] - Schema output type metadata.
 * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<TValues> | Promise<StandardSchemaV1.Result<TValues>>} [input.schema.~standard.validate] - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
 * @param {StandardSchemaV1.Options | undefined} [input.schemaOptions] - Options forwarded to the Standard Schema validator.
 * @param {Record<string, unknown> | undefined} [input.schemaOptions.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
 * @param {readonly ValidationTrigger[] | undefined} [input.validateOn] - Triggers that run automatic validation; defaults to submit.
 * @returns {boolean} Whether input exposes the core form subscription and submission surface.
 * @example
 * ```ts
 * if (isFormInstance(input)) { input.getValues(); }
 * ```
 */
export function isFormInstance<TValues>(
  input: Form<TValues> | CreateFormOptions<TValues>,
): input is Form<TValues> {
  return 'subscribe' in input && 'submit' in input;
}

/**
 * @description Create a core form from the framework-neutral options, excluding reactive adapter-only settings.
 * @param {CreateFormOptions<TValues>} options - Default values, optional form schema, and automatic validation triggers.
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
 * @returns {Form<TValues>} New framework-neutral form initialized from the creation settings.
 * - getState `() => Readonly<FormState<TValues>>` - Read the current immutable form snapshot.
 * - subscribe `(listener: () => void) => () => void` - Subscribe to state changes and return an unsubscribe callback.
 * - registerFieldSchema `(path: FieldPathInput, options: FieldSchemaOptions) => () => void` - Register an overriding field-local validator and return its guarded cleanup.
 * - getFieldState `(path: FieldPathInput) => Readonly<FieldState>` - Read field metadata, using a default snapshot for an unknown field.
 * - getValue `(path: FieldPathInput) => unknown` - Read the current value of one field.
 * - getValues `() => TValues` - Reconstruct nested values from fields and array containers.
 * - setValue `(path: FieldPathInput, value: unknown, options?: SetValueOptions) => void` - Write a field with configurable user or program origin and optional immediate validation.
 * - blur `(path: FieldPathInput) => Promise<boolean>` - Clear focus, mark touched, and run configured blur validation.
 * - focus `(path: FieldPathInput) => void` - Record focus for the selected field.
 * - setErrors `(path: FieldPathInput, errors: readonly FormError[]) => void` - Replace all errors for the selected field.
 * - clearErrors `(...paths: FieldPathInput[]) => void` - Clear selected fields, or all field errors when no paths are supplied.
 * - trigger `(...paths: FieldPathInput[]) => Promise<boolean>` - Run manual validation for selected paths or the entire form.
 * - array `(path: FieldPathInput) => FormArray` - Return commands that keep array values, keys, and child metadata aligned.
 * - reset `(values?: TValues | undefined, options?: ResetOptions) => void` - Reinitialize from default or replacement values with optional preservation flags.
 * - submit `<TResult>(onValid: (values: TValues) => TResult | Promise<TResult>, onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void) => Promise<TResult | undefined>` - Queue validation and dispatch the valid or invalid callback.
 * @example
 * ```ts
 * createFormFromOptions({ defaultValues: { email: "" } });
 * ```
 */
export function createFormFromOptions<TValues>(options: CreateFormOptions<TValues>): Form<TValues> {
  const { defaultValues, schema, schemaOptions, validateOn } = options;
  return new CreateForm({ defaultValues, schema, schemaOptions, validateOn });
}

/**
 * @description Create a synchronizer that resets only for defined external-value references different from the previous defined reference.
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
 * @returns {(values: TValues | undefined, resetOptions: ResetOptions | undefined) => void} Callback accepting replacement values and reset options; undefined or repeated references are ignored.
 * @example
 * ```ts
 * const synchronize = createExternalValuesSynchronizer(form);
 * synchronize({ email: "Ada" }, { keepTouched: true });
 * ```
 */
export function createExternalValuesSynchronizer<TValues>(
  form: Form<TValues>,
): (values: TValues | undefined, resetOptions: ResetOptions | undefined) => void {
  let previousDefinedValues: TValues | undefined;

  return (values, resetOptions) => {
    if (values === undefined || Object.is(previousDefinedValues, values)) {
      return;
    }

    previousDefinedValues = values;
    form.reset(values, resetOptions);
  };
}

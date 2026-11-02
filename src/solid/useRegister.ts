import type { Form } from '../core/index';
import { getFieldState } from '../adapters/dom';
import { createRegisterProps, fieldPathToDomName } from './RegisterBinding';
import type { RegisterOptions, SolidRegisterElement, SolidRegisterPropsForElement, SolidRegisterPropsList } from './types';
import { useFieldSchemaRegistrations } from './useFieldSchemaRegistration';
import { useFormSnapshot } from './useFormSnapshot';

/**
 * @description Create a single binding or ordered binding list for single, array, or variadic registration options.
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
 * @param {RegisterOptions | TOptions} options - Single registration options or an ordered list; variadic calls use the same options order.
 * @param {FieldPathInput} options.name - Literal field name or tuple path; strings are not split on dots.
 * @param {StandardSchemaV1<unknown, unknown> | undefined} [options.schema] - Standard Schema validator; a field-local schema takes precedence over the form schema.
 * @param {StandardSchemaV1.Props<unknown, unknown>} [options.schema.~standard] - Standard Schema version, vendor, type metadata, and validation entry point.
 * @param {1} [options.schema.~standard.version] - Standard Schema major version, which must be 1.
 * @param {string} [options.schema.~standard.vendor] - Name of the schema library implementation.
 * @param {StandardSchemaV1.Types<unknown, unknown> | undefined} [options.schema.~standard.types] - Optional compile-time input and output metadata.
 * @param {unknown} [options.schema.~standard.types.input] - Schema input type metadata.
 * @param {unknown} [options.schema.~standard.types.output] - Schema output type metadata.
 * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<unknown> | Promise<StandardSchemaV1.Result<unknown>>} [options.schema.~standard.validate] - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
 * @param {StandardSchemaV1.Options | undefined} [options.schemaOptions] - Options forwarded to the Standard Schema validator.
 * @param {Record<string, unknown> | undefined} [options.schemaOptions.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
 * @param {string | undefined} [options.type] - Input kind; checkbox and radio use checked semantics, otherwise defaults to text.
 * @param {unknown} [options.value] - Explicit option value used by checkbox and radio bindings.
 * @param {unknown} [options.checkedValue] - Value written by a checked checkbox; omitted for a boolean checkbox.
 * @param {unknown} [options.uncheckedValue] - Value written by an unchecked checkbox; defaults to false.
 * @param {RegisterOptions | readonly RegisterOptions[]} first - First single registration or ordered registration list.
 * @param {FieldPathInput} first.name - Literal field name or tuple path; strings are not split on dots.
 * @param {StandardSchemaV1<unknown, unknown> | undefined} [first.schema] - Standard Schema validator; a field-local schema takes precedence over the form schema.
 * @param {StandardSchemaV1.Props<unknown, unknown>} [first.schema.~standard] - Standard Schema version, vendor, type metadata, and validation entry point.
 * @param {1} [first.schema.~standard.version] - Standard Schema major version, which must be 1.
 * @param {string} [first.schema.~standard.vendor] - Name of the schema library implementation.
 * @param {StandardSchemaV1.Types<unknown, unknown> | undefined} [first.schema.~standard.types] - Optional compile-time input and output metadata.
 * @param {unknown} [first.schema.~standard.types.input] - Schema input type metadata.
 * @param {unknown} [first.schema.~standard.types.output] - Schema output type metadata.
 * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<unknown> | Promise<StandardSchemaV1.Result<unknown>>} [first.schema.~standard.validate] - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
 * @param {StandardSchemaV1.Options | undefined} [first.schemaOptions] - Options forwarded to the Standard Schema validator.
 * @param {Record<string, unknown> | undefined} [first.schemaOptions.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
 * @param {string | undefined} [first.type] - Input kind; checkbox and radio use checked semantics, otherwise defaults to text.
 * @param {unknown} [first.value] - Explicit option value used by checkbox and radio bindings.
 * @param {unknown} [first.checkedValue] - Value written by a checked checkbox; omitted for a boolean checkbox.
 * @param {unknown} [first.uncheckedValue] - Value written by an unchecked checkbox; defaults to false.
 * @param {readonly RegisterOptions[]} rest - Additional registration options for variadic binding creation.
 * @returns {SolidRegisterPropsForElement<TElement> | SolidRegisterPropsList<TElement, TOptions> | SolidRegisterPropsForElement<SolidRegisterElement> | SolidRegisterPropsForElement<SolidRegisterElement>[]} One binding for a single options object, otherwise bindings in supplied order.
 * - onInput `((event: InputEvent & { currentTarget: HTMLSelectElement; }) => void) | ((event: InputEvent & { currentTarget: HTMLElement; }) => void) | ((event: InputEvent & { currentTarget: HTMLInputElement; }) => void) | ((event: InputEvent & { currentTarget: HTMLTextAreaElement; }) => void)` - Forward text input events into the form.
 * - onChange `((event: Event & { currentTarget: HTMLSelectElement; }) => void) | ((event: Event & { currentTarget: HTMLElement; }) => void) | ((event: Event & { currentTarget: HTMLInputElement; }) => void) | ((event: Event & { currentTarget: HTMLTextAreaElement; }) => void)` - Forward change events, including checked and selection state, into the form.
 * - onBlur `((event: FocusEvent & { currentTarget: HTMLSelectElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLInputElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLTextAreaElement; }) => void)` - Clear focus and mark the field touched.
 * - onFocus `((event: FocusEvent & { currentTarget: HTMLSelectElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLInputElement; }) => void) | ((event: FocusEvent & { currentTarget: HTMLTextAreaElement; }) => void)` - Record focus for this field.
 * - name `string` - DOM name string; tuple paths are JSON-serialized.
 * - value `DomValue | undefined | unknown | string | number | undefined` - Current field value.
 * - checked `boolean | undefined` - Whether this checkbox or radio represents the current field value.
 * - type `string` - Input kind; checkbox and radio use checked semantics, otherwise defaults to text.
 * @example
 * ```ts
 * const email = useRegisterWithForm(form, { name: "email" });
 * const fields = useRegisterWithForm(form, [{ name: "email" }, { name: "name" }]);
 * ```
 */
export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement>(form: Form<TValues>, options: RegisterOptions): SolidRegisterPropsForElement<TElement>;
export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(form: Form<TValues>, options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
export function useRegisterWithForm<TValues, TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(form: Form<TValues>, ...options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
export function useRegisterWithForm<TValues>(form: Form<TValues>, first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]): SolidRegisterPropsForElement<SolidRegisterElement> | SolidRegisterPropsForElement<SolidRegisterElement>[];

export function useRegisterWithForm<TValues>(
  form: Form<TValues>,
  first: RegisterOptions | readonly RegisterOptions[],
  ...rest: readonly RegisterOptions[]
): SolidRegisterPropsForElement<SolidRegisterElement> | SolidRegisterPropsForElement<SolidRegisterElement>[] {
  const shouldReturnList = Array.isArray(first) || rest.length > 0;
  const options = normalizeRegisterOptions(first, rest);

  useFieldSchemaRegistrations(form, options);

  const snapshot = useFormSnapshot(form);
  const bindings = options.map(option => createRegisterProps(
    form,
    option,
    () => getFieldState(form, snapshot(), option.name),
    fieldPathToDomName(option.name),
  ));

  return shouldReturnList ? bindings : bindings[0];
}

function normalizeRegisterOptions(first: RegisterOptions | readonly RegisterOptions[], rest: readonly RegisterOptions[]): readonly RegisterOptions[] {
  if (Array.isArray(first)) {
    return first as readonly RegisterOptions[];
  }

  if (rest.length > 0) {
    return [first as RegisterOptions, ...rest];
  }

  return [first as RegisterOptions];
}

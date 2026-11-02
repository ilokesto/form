import type { FieldState, Form } from '../core/index';
import { createDomBinding, type FieldEventTarget, type RegisterOptions, fieldPathToDomName } from '../adapters/dom';
import type { SolidRegisterElement, SolidRegisterPropsForElement } from './types';

/**
 * @description Create framework-specific DOM bindings that forward value, checked, change, blur, and focus behavior to the core form.
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
 * @param {RegisterOptions} options - Field schema and DOM binding options.
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
 * @param {() => Readonly<FieldState>} getField - Read the latest field snapshot when a binding is accessed.
 * @param {string} domName - Name string assigned to the DOM control.
 * @returns {SolidRegisterPropsForElement<TElement>} Binding properties suitable for the selected framework and element type.
 * @example
 * ```ts
 * createRegisterProps(form, { name: "email" }, () => form.getFieldState("email"), "email");
 * ```
 */
export function createRegisterProps<TValues, TElement extends SolidRegisterElement>(
  form: Form<TValues>,
  options: RegisterOptions,
  getField: () => Readonly<FieldState>,
  domName: string,
): SolidRegisterPropsForElement<TElement> {
  const binding = createDomBinding(form, options, getField, domName);
  const props = {
    name: binding.name,
    type: binding.type,
    get value() {
      return binding.value;
    },
    get checked() {
      return binding.checked;
    },
    onInput: (event: InputEvent & { /** DOM element that owns the event listener. */
    currentTarget: HTMLElement }) => {
      binding.input(event.currentTarget as FieldEventTarget);
    },
    onChange: (event: Event & { /** DOM element that owns the event listener. */
    currentTarget: HTMLElement }) => {
      binding.change(event.currentTarget as FieldEventTarget);
    },
    onBlur: () => {
      binding.blur();
    },
    onFocus: () => {
      binding.focus();
    },
  };

  return props as unknown as SolidRegisterPropsForElement<TElement>;
}

export { fieldPathToDomName };

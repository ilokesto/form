import type { FieldPathInput, FieldState, Form } from '../../core/index';
import type { DomValue, FieldEventTarget, RegisterOptions } from './types';

const SKIP_CHANGE = Symbol('skip change');

type ChangeValue = unknown | typeof SKIP_CHANGE;

export type DomBindingCore = {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Input kind; checkbox and radio use checked semantics, otherwise defaults to text. */
  readonly type: string;
  /** Current field value. */
  readonly value?: DomValue;
  /** Whether this checkbox or radio represents the current field value. */
  readonly checked?: boolean;
  /** Schema input type metadata. */
  input(target: FieldEventTarget): void;
  /** Commit the change event value using checkbox, radio, or selection semantics. */
  change(target: FieldEventTarget): void;
  /** Clear focus, mark touched, and run configured blur validation. */
  blur(): void;
  /** Record focus for the selected field. */
  focus(): void;
};

/**
 * @description Create shared DOM value and checked bindings plus event commands that write user-originated changes.
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
 * @returns {DomBindingCore} Live value and checked getters with commands for DOM interaction.
 * - name `string` - DOM name string; tuple paths are JSON-serialized.
 * - type `string` - Input kind; checkbox and radio use checked semantics, otherwise defaults to text.
 * - value `DomValue | undefined` - DOM-compatible field or option value for this input kind.
 * - checked `boolean | undefined` - Whether this checkbox or radio represents the current field value.
 * - input `(target: FieldEventTarget) => void` - Process text input while ignoring checkbox, radio, and multiple-select input events.
 * - change `(target: FieldEventTarget) => void` - Commit the change event value using checkbox, radio, or selection semantics.
 * - blur `() => void` - Clear focus, mark touched, and run configured blur validation.
 * - focus `() => void` - Record focus for the selected field.
 * @example
 * ```ts
 * createDomBinding(form, { name: "email" }, () => form.getFieldState("email"), "email");
 * ```
 */
export function createDomBinding<TValues>(
  form: Form<TValues>,
  options: RegisterOptions,
  getField: () => Readonly<FieldState>,
  domName: string,
): DomBindingCore {
  const inputType = options.type ?? 'text';

  return {
    name: domName,
    type: inputType,
    get value() {
      return getBoundValue(inputType, getField().value, getOptionValue(options));
    },
    get checked() {
      return getBoundChecked(inputType, getField().value, getOptionValue(options));
    },
    input(target) {
      if (shouldIgnoreInputEvent(target, options)) {
        return;
      }

      commitEventValue(form, options, getField().value, target);
    },
    change(target) {
      commitEventValue(form, options, getField().value, target);
    },
    blur() {
      void form.blur(options.name);
    },
    focus() {
      form.focus(options.name);
    },
  };
}

/**
 * @description Preserve literal field names and stringify tuple paths for the DOM name attribute.
 * @param {FieldPathInput} name - Literal field name or tuple path; strings are not split on dots.
 * @returns {string} Literal string name or JSON-serialized tuple for the DOM attribute.
 * @example
 * ```ts
 * fieldPathToDomName("email");
 * ```
 */
export function fieldPathToDomName(name: FieldPathInput): string {
  return typeof name === 'string' ? name : JSON.stringify(name);
}

function commitEventValue<TValues>(form: Form<TValues>, options: RegisterOptions, currentValue: unknown, target: FieldEventTarget): void {
  const nextValue = getEventValue(target, options, currentValue);

  if (nextValue !== SKIP_CHANGE) {
    form.setValue(options.name, nextValue, { source: 'user' });
  }
}

function shouldIgnoreInputEvent(target: FieldEventTarget, options: RegisterOptions): boolean {
  const type = options.type ?? target.type;

  return type === 'checkbox' || type === 'radio' || Boolean(target.multiple);
}

function getOptionValue(options: RegisterOptions): unknown {
  return options.value ?? options.checkedValue;
}

function getBoundValue(kind: string | undefined, fieldValue: unknown, optionValue: unknown): DomValue | undefined {
  if (kind === 'checkbox') {
    return toDomValue(optionValue);
  }

  if (kind === 'radio') {
    return toDomValue(optionValue) ?? '';
  }

  return toDomValue(fieldValue) ?? '';
}

function getBoundChecked(kind: string | undefined, fieldValue: unknown, optionValue: unknown): boolean | undefined {
  if (kind === 'checkbox') {
    if (optionValue !== undefined && Array.isArray(fieldValue)) {
      return fieldValue.some(item => Object.is(item, optionValue));
    }

    if (optionValue !== undefined) {
      return Object.is(fieldValue, optionValue);
    }

    return Boolean(fieldValue);
  }

  if (kind === 'radio') {
    return Object.is(fieldValue, optionValue);
  }

  return undefined;
}

function getEventValue(target: FieldEventTarget, options: RegisterOptions, currentValue: unknown): ChangeValue {
  const type = options.type ?? target.type;

  if (type === 'checkbox') {
    return getCheckboxEventValue(target, options, currentValue);
  }

  if (type === 'radio') {
    if (!target.checked) {
      return SKIP_CHANGE;
    }

    return getOptionValue(options) ?? target.value;
  }

  if (target.multiple && target.selectedOptions) {
    return [...target.selectedOptions].map(option => option.value);
  }

  return target.value;
}

function getCheckboxEventValue(target: FieldEventTarget, options: RegisterOptions, currentValue: unknown): unknown {
  if (options.checkedValue === undefined && options.value === undefined) {
    return Boolean(target.checked);
  }

  if (Array.isArray(currentValue)) {
    const optionValue = getOptionValue(options);

    if (target.checked) {
      return currentValue.some(item => Object.is(item, optionValue)) ? currentValue : [...currentValue, optionValue];
    }

    return currentValue.filter(item => !Object.is(item, optionValue));
  }

  return target.checked ? getOptionValue(options) : (options.uncheckedValue ?? false);
}

function toDomValue(value: unknown): DomValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }

  return String(value);
}

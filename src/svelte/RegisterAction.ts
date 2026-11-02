import type { Action } from 'svelte/action';
import type { Form } from '../core/index';
import { createDomBinding, fieldPathToDomName, getFieldState, type FieldEventTarget, type RegisterOptions } from '../adapters/dom';

/**
 * @description Create a Svelte action that synchronizes DOM values, registers a local schema, and removes listeners and subscriptions on destroy.
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
 * @returns {Action<HTMLElement, RegisterOptions>} Svelte action with update and destroy cleanup handled by the framework.
 * @example
 * ```ts
 * const register = createRegisterAction(form);
 * // In a Svelte template: <input use:register={{ name: "email" }} />
 * ```
 */
export function createRegisterAction<TValues>(form: Form<TValues>): Action<HTMLElement, RegisterOptions> {
  return (node, initialOptions) => {
    let options = initialOptions;
    let cleanupSchema = registerSchema(form, options);

    const getBinding = () => createDomBinding(
      form,
      resolveOptionsFromNode(node, options),
      () => getFieldState(form, form.getState(), options.name),
      fieldPathToDomName(options.name),
    );

    const syncNode = () => {
      applyBindingToNode(node, getBinding(), options);
    };

    const onInput = (event: Event) => {
      getBinding().input(event.currentTarget as FieldEventTarget);
    };
    const onChange = (event: Event) => {
      getBinding().change(event.currentTarget as FieldEventTarget);
    };
    const onBlur = () => {
      getBinding().blur();
    };
    const onFocus = () => {
      getBinding().focus();
    };

    node.addEventListener('input', onInput);
    node.addEventListener('change', onChange);
    node.addEventListener('blur', onBlur);
    node.addEventListener('focus', onFocus);

    const unsubscribe = form.subscribe(syncNode);
    syncNode();

    return {
      update(nextOptions) {
        cleanupSchema();
        options = nextOptions;
        cleanupSchema = registerSchema(form, options);
        syncNode();
      },
      destroy() {
        unsubscribe();
        cleanupSchema();
        node.removeEventListener('input', onInput);
        node.removeEventListener('change', onChange);
        node.removeEventListener('blur', onBlur);
        node.removeEventListener('focus', onFocus);
      },
    };
  };
}

type BindingSnapshot = ReturnType<typeof createDomBinding>;

function registerSchema<TValues>(form: Form<TValues>, options: RegisterOptions): () => void {
  if (!options.schema) {
    return () => undefined;
  }

  return form.registerFieldSchema(options.name, { schema: options.schema, schemaOptions: options.schemaOptions });
}

function resolveOptionsFromNode(node: HTMLElement, options: RegisterOptions): RegisterOptions {
  if (options.type !== undefined || !(node instanceof HTMLInputElement)) {
    return options;
  }

  return {
    ...options,
    type: node.type || 'text',
  };
}

function applyBindingToNode(node: HTMLElement, binding: BindingSnapshot, options: RegisterOptions): void {
  setNodeName(node, binding.name);

  if (node instanceof HTMLInputElement) {
    applyInputBinding(node, binding, options);
    return;
  }

  if (node instanceof HTMLSelectElement) {
    applySelectBinding(node, binding);
    return;
  }

  if (node instanceof HTMLTextAreaElement) {
    setStringValue(node, binding.value);
    return;
  }

  applyCustomBinding(node, binding);
}

function setNodeName(node: HTMLElement, name: string): void {
  if ('name' in node) {
    (node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name = name;
    return;
  }

  node.setAttribute('name', name);
}

function applyInputBinding(node: HTMLInputElement, binding: BindingSnapshot, options: RegisterOptions): void {
  if (options.type !== undefined && node.type !== options.type) {
    node.type = options.type;
  }

  if (node.type === 'checkbox' || node.type === 'radio') {
    if (binding.value !== undefined) {
      node.value = String(Array.isArray(binding.value) ? binding.value[0] : binding.value);
    }

    node.checked = Boolean(binding.checked);
    return;
  }

  setStringValue(node, binding.value);
}

function applySelectBinding(node: HTMLSelectElement, binding: BindingSnapshot): void {
  const value = binding.value;

  if (node.multiple) {
    const values = new Set((Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String));
    Array.from(node.options).forEach(option => {
      option.selected = values.has(option.value);
    });
    return;
  }

  setStringValue(node, value);
}

function setStringValue(node: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: BindingSnapshot['value']): void {
  const nextValue = value === undefined ? '' : String(Array.isArray(value) ? value[0] ?? '' : value);

  if (node.value !== nextValue) {
    node.value = nextValue;
  }
}

function applyCustomBinding(node: HTMLElement, binding: BindingSnapshot): void {
  if ('value' in node) {
    (node as HTMLElement & { /** Current field value. */
    value: unknown }).value = binding.value;
  }

  if ('checked' in node) {
    (node as HTMLElement & { /** Whether this checkbox or radio represents the current field value. */
    checked: boolean }).checked = Boolean(binding.checked);
  }
}

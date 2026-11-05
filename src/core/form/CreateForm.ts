import { ArrayKeyGenerator, FormArrayController } from '../array/index';
import { FormSubmitter } from './FormSubmitter';
import { FormStateStore } from '../state/index';
import { FormPath } from '../path/index';
import { ValidationEngine } from '../validation/index';
import type { CreateFormOptions, FieldPathInput, FieldSchemaOptions, FieldState, Form, FormArray, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

/**
 * @description Coordinates framework-neutral field, array, validation, and queued submission commands over one store.
 * @example
 * ```ts
 * const form = new CreateForm({ defaultValues: { email: "" } });
 * form.setValue("email", "Ada");
 * ```
 */
export class CreateForm<TValues> implements Form<TValues> {
  /** form의 단일 상태 저장소. 모든 값/필드 메타데이터/배열 키는 이 store를 통해 읽고 쓴다. */
  private readonly store: FormStateStore<TValues>;
  /** 필드 명령 뒤에 실행할 검증과 field-local schema 등록을 담당한다. */
  private readonly validation: ValidationEngine<TValues>;
  /** 같은 form의 모든 배열 controller가 공유하는 item key 생성기. */
  private readonly arrayKeys = new ArrayKeyGenerator();
  /** submitCount 증가, submit validation, onValid/onInvalid 호출을 담당한다. */
  private readonly submitter: FormSubmitter<TValues>;

  /**
   * @description Create a form and connect its state, array, validation, and submission collaborators.
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
   * @example
   * ```ts
   * const form = new CreateForm({ defaultValues: { email: "" } });
   * ```
   */
  public constructor(options: CreateFormOptions<TValues>) {
    this.store = new FormStateStore(options.defaultValues);

    this.validation = new ValidationEngine(this.store, options);
    this.submitter = new FormSubmitter(this.store, this.validation);
  }

  /**
   * @description Read the current immutable form snapshot without cloning it.
   * @returns {Readonly<FormState<TValues>>} Current read-only snapshot; callers must not mutate it.
   * - defaultValues `TValues` - Initial values and the baseline used for dirty checks and reset.
   * - fields `Record<string, FieldState<unknown>>` - Field snapshots indexed by normalized path keys.
   * - submitCount `number` - Number of submission attempts started by the form.
   * - isSubmitting `boolean` - Whether queued validation or a submit callback is still pending.
   * - isSubmitted `boolean` - Whether a submission has completed at least once.
   * - isSubmitSuccessful `boolean` - Whether the latest completed submission reached a successful valid callback.
   * - arrayKeys `ArrayKeys` - Stable rendering keys indexed by array path.
   * @example
   * ```ts
   * form.getState();
   * ```
   */
  public getState(): Readonly<FormState<TValues>> {
    return this.store.getState();
  }

  /**
   * @description Subscribe to form state changes and return the callback that unsubscribes this listener.
   * @param {() => void} listener - Callback invoked synchronously after a state change.
   * @returns {() => void} Cleanup callback for this subscription or registration.
   * @example
   * ```ts
   * form.subscribe(() => render());
   * ```
   */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * @description Register a field-local schema; the returned cleanup removes only this registration if it is still current.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @param {FieldSchemaOptions} options - Field-local schema and validation settings.
   * @param {StandardSchemaV1<unknown, unknown>} options.schema - Standard Schema validator; a field-local schema takes precedence over the form schema.
   * @param {StandardSchemaV1.Props<unknown, unknown>} options.schema.~standard - Standard Schema version, vendor, type metadata, and validation entry point.
   * @param {1} options.schema.~standard.version - Standard Schema major version, which must be 1.
   * @param {string} options.schema.~standard.vendor - Name of the schema library implementation.
   * @param {StandardSchemaV1.Types<unknown, unknown> | undefined} [options.schema.~standard.types] - Optional compile-time input and output metadata.
   * @param {unknown} [options.schema.~standard.types.input] - Schema input type metadata.
   * @param {unknown} [options.schema.~standard.types.output] - Schema output type metadata.
   * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<unknown> | Promise<StandardSchemaV1.Result<unknown>>} options.schema.~standard.validate - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
   * @param {StandardSchemaV1.Options | undefined} [options.schemaOptions] - Options forwarded to the Standard Schema validator.
   * @param {Record<string, unknown> | undefined} [options.schemaOptions.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
   * @returns {() => void} Cleanup callback for this subscription or registration.
   * @example
   * ```ts
   * form.registerFieldSchema(["email"], { schema });
   * ```
   */
  public registerFieldSchema(path: FieldPathInput, options: FieldSchemaOptions): () => void {
    return this.validation.registerFieldSchema(FormPath.pathInputToKey(path), options);
  }

  /**
   * @description Read field metadata and use a default snapshot when the field is not present.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @returns {Readonly<FieldState>} Field snapshot, with a default shape when the leaf field is absent.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * form.getFieldState(["email"]);
   * ```
   */
  public getFieldState(path: FieldPathInput): Readonly<FieldState> {
    return this.store.getFieldState(path);
  }

  /**
   * @description Read only the current value of the selected field.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @returns {unknown} Stored field value, or undefined when the field has no value.
   * @example
   * ```ts
   * form.getValue(["email"]);
   * ```
   */
  public getValue(path: FieldPathInput): unknown {
    return this.store.getValue(path);
  }

  /**
   * @description Reconstruct the nested values object from leaf fields and array containers.
   * @returns {TValues} Nested values reconstructed in the shape of the supplied defaults.
   * @example
   * ```ts
   * form.getValues();
   * ```
   */
  public getValues(): TValues {
    return this.store.getValues();
  }

  /**
   * @description Write a field value, compare dirty state with its default, and mark user-originated changes as modified. Start change validation when explicitly requested or configured.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @param {unknown} value - Value to store or inspect.
   * @param {SetValueOptions} [options] - Write origin and optional immediate validation request.
   * @param {"user" | "program" | undefined} [options.source] - Write origin; user writes mark the field as modified.
   * @param {boolean | undefined} [options.validate] - Whether to start validation immediately after this write.
   * @example
   * ```ts
   * form.setValue(["email"], "Ada", { source: "user" });
   * ```
   */
  public setValue(path: FieldPathInput, value: unknown, options: SetValueOptions = {}): void {
    const fieldKey = this.store.setValue(FormPath.toFieldPath(path), value, options);

    // setValue는 동기 API다. 상태 알림 이후 change validation을 시작한다.
    if (options.validate || this.validation.shouldValidateOn('change')) {
      void this.validation.validateField(fieldKey, 'change');
    }
  }

  /**
   * @description Clear focus and mark touched before running configured blur validation; return true when validation is disabled.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @returns {Promise<boolean>} Promise resolving true when validation is disabled or the current field result is valid.
   * @example
   * ```ts
   * await form.blur(["email"]);
   * ```
   */
  public async blur(path: FieldPathInput): Promise<boolean> {
    const fieldKey = FormPath.pathInputToKey(path);
    this.store.unfocusField(fieldKey);
    this.store.touchField(fieldKey);

    if (!this.validation.shouldValidateOn('blur')) {
      return true;
    }

    return this.validation.validateField(fieldKey, 'blur');
  }

  /**
   * @description Record focus for this field without modifying its value.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @example
   * ```ts
   * form.focus(["email"]);
   * ```
   */
  public focus(path: FieldPathInput): void {
    this.store.focusField(FormPath.pathInputToKey(path));
  }

  /**
   * @description Replace the selected field error list without running validation.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @param {readonly FormError[]} errors - Current validation errors for the field.
   * @example
   * ```ts
   * form.setErrors(["email"], errors);
   * ```
   */
  public setErrors(path: FieldPathInput, errors: readonly FormError[]): void {
    this.store.setErrorsByKey(FormPath.pathInputToKey(path), errors);
  }

  /**
   * @description Clear selected fields or all fields when no paths are provided.
   * @param {FieldPathInput[]} paths - Fields to target; no paths means all fields.
   * @example
   * ```ts
   * form.clearErrors("email");
   * ```
   */
  public clearErrors(...paths: FieldPathInput[]): void {
    this.store.clearErrors(paths.length > 0 ? paths.map(path => FormPath.pathInputToKey(path)) : undefined);
  }

  /**
   * @description Run manual schema validation for selected paths or the whole form when no paths are supplied.
   * @param {FieldPathInput[]} paths - Fields to target; no paths means all fields.
   * @returns {Promise<boolean>} Promise resolving true only when the targeted current validation result is valid.
   * @example
   * ```ts
   * await form.trigger("email");
   * ```
   */
  public trigger(...paths: FieldPathInput[]): Promise<boolean> {
    if (paths.length === 0) {
      return this.validation.validateRegisteredFields('manual');
    }

    return this.validation.validateFields(paths.map(path => FormPath.pathInputToKey(path)), 'manual');
  }

  /**
   * @description Create commands for an array field that keep values, stable keys, and child state aligned.
   * @param {FieldPathInput} path - Literal field name or tuple path; strings are not split on dots.
   * @returns {FormArray} Array commands sharing the current form store and item-key generator.
   * - keys `() => readonly string[]` - Stable item keys in array order.
   * - insert `(index: number, value: unknown) => void` - Insert a value at a bounded array index.
   * - push `(value: unknown) => void` - Append a value and allocate a stable item key.
   * - remove `(index: number) => void` - Remove the indexed item and rebase surviving child fields.
   * - move `(fromIndex: number, toIndex: number) => void` - Move an item while preserving its key and child metadata.
   * - swap `(leftIndex: number, rightIndex: number) => void` - Swap item positions while preserving keys and child metadata.
   * - replace `(values: readonly unknown[]) => void` - Replace all array items and regenerate their keys and child state.
   * @example
   * ```ts
   * form.array("users").push({ email: "" });
   * ```
   */
  public array(path: FieldPathInput): FormArray {
    return new FormArrayController(this.store, this.arrayKeys, FormPath.toFieldPath(path));
  }

  /**
   * @description Invalidate pending validation and reinitialize values and metadata, optionally retaining dirty values, errors, touched flags, and submission state.
   * @param {TValues | undefined} [values] - Replacement or current form values.
   * @param {ResetOptions | undefined} [options] - State preservation flags for this reset.
   * @param {boolean | undefined} [options.keepDirtyValues] - Preserve current values and modified flags of dirty fields.
   * @param {boolean | undefined} [options.keepErrors] - Preserve errors on surviving field paths.
   * @param {boolean | undefined} [options.keepTouched] - Preserve touched flags on surviving field paths.
   * @param {boolean | undefined} [options.keepSubmitState] - Preserve submission counters and lifecycle flags.
   * @example
   * ```ts
   * form.reset({ email: "Ada" }, { keepTouched: true });
   * ```
   */
  public reset(values?: TValues, options?: ResetOptions): void {
    this.validation.invalidatePending();
    this.store.reset(values, options);
  }

  /**
   * @description Queue a submission, retry stale validation, and return the valid callback result or undefined after invalid validation.
   * @param {(values: TValues) => TResult | Promise<TResult>} onValid - Callback receiving current values after successful validation.
   * @param {((fields: Readonly<Record<PathKey, FieldState>>) => void) | undefined} [onInvalid] - Callback receiving field snapshots when validation fails.
   * @returns {Promise<TResult | undefined>} Promise of the valid callback result, or undefined when validation fails; callback errors reject.
   * @example
   * ```ts
   * await form.submit(values => save(values), fields => showErrors(fields));
   * ```
   */
  public submit<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined> {
    return this.submitter.submit(onValid, onInvalid);
  }
}

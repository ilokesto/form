import { StandardSchemaValidator, type StandardSchemaValidationResult } from './StandardSchemaValidator';
import { ValidationSequencer, type ValidationToken } from './ValidationSequencer';
import { ValidationSnapshot } from './ValidationSnapshot';
import type { FormStateStore } from '../state/index';
import type { CreateFormOptions, FieldSchemaOptions, FormError, PathKey, ValidationTrigger } from '../types';

export type ValidationOutcome =
  | { /** Discriminant identifying the validation scope or valid, invalid, or stale outcome. */
  readonly kind: 'invalid' }
  | { /** Discriminant identifying the validation scope or valid, invalid, or stale outcome. */
  readonly kind: 'stale' }
  | { /** Discriminant identifying the validation scope or valid, invalid, or stale outcome. */
  readonly kind: 'valid' };

/**
 * @description Runs form and field-local Standard Schema validators and rejects stale asynchronous results.
 * @example
 * ```ts
 * const validation = new ValidationEngine(store, { defaultValues: { email: "" } });
 * ```
 */
export class ValidationEngine<TValues> {
  /** validateOn이 지정되지 않았을 때 submit에서만 자동 검증하도록 하는 기본값이다. */
  private static readonly DEFAULT_VALIDATE_ON: readonly ValidationTrigger[] = ['submit'];

  /** validation 대상 field value와 errors를 읽고 쓰는 저장소다. */
  private readonly store: FormStateStore<TValues>;
  /** Standard Schema compatible schema를 실행하고 issue를 field errors로 바꾸는 adapter다. */
  private readonly schema?: StandardSchemaValidator<TValues>;
  /** field별로 form-level schema보다 우선 적용할 schema validator다. */
  private readonly fieldSchemas = new Map<PathKey, RegisteredFieldSchema>();
  /** 어떤 trigger에서 자동 validation을 실행할지 나타내는 설정이다. */
  private readonly validateOn: readonly ValidationTrigger[];
  /** field schema cleanup이 최신 등록만 제거하도록 구분하는 증가 id다. */
  private nextFieldSchemaId = 0;
  private readonly sequencer = new ValidationSequencer();

  /**
   * @description Create a validation engine with optional form schema and configured automatic triggers.
   * @param {FormStateStore<TValues>} store - Shared form state store to read and update.
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
   * const validation = new ValidationEngine(store, { defaultValues: { email: "" } });
   * ```
   */
  public constructor(store: FormStateStore<TValues>, options: CreateFormOptions<TValues>) {
    this.store = store;
    this.schema = options.schema ? new StandardSchemaValidator(options.schema, options.schemaOptions) : undefined;
    this.validateOn = options.validateOn ?? ValidationEngine.DEFAULT_VALIDATE_ON;
  }

  /**
   * @description Check whether the configured automatic-validation triggers include this trigger.
   * @param {ValidationTrigger} trigger - Reason validation was requested; not passed to the schema.
   * @returns {boolean} Whether this trigger is enabled for automatic validation.
   * @example
   * ```ts
   * validation.shouldValidateOn("manual");
   * ```
   */
  public shouldValidateOn(trigger: ValidationTrigger): boolean {
    return this.validateOn.includes(trigger);
  }

  /**
   * @description Register a field-local schema; the returned cleanup removes only this registration if it is still current.
   * @param {string} fieldKey - Normalized path key of the target field.
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
   * validation.registerFieldSchema(FormPath.pathToKey(["email"]), { schema });
   * ```
   */
  public registerFieldSchema(fieldKey: PathKey, options: FieldSchemaOptions): () => void {
    const id = ++this.nextFieldSchemaId;

    this.fieldSchemas.set(fieldKey, {
      id,
      validator: new StandardSchemaValidator(options.schema, options.schemaOptions),
    });
    this.sequencer.invalidateFields([fieldKey]);

    return () => {
      if (this.fieldSchemas.get(fieldKey)?.id === id) {
        this.fieldSchemas.delete(fieldKey);
        this.sequencer.invalidateFields([fieldKey]);
      }
    };
  }

  /**
   * @description Validate one field with local-schema precedence and reject stale results.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @param {ValidationTrigger} _trigger - Reason validation was requested; not passed to the schema.
   * @returns {Promise<boolean>} Promise resolving true only when the current validation result is valid.
   * @example
   * ```ts
   * await validation.validateField(FormPath.pathToKey(["email"]), "manual");
   * ```
   */
  public async validateField(fieldKey: PathKey, _trigger: ValidationTrigger): Promise<boolean> {
    return this.validateFields([fieldKey], _trigger);
  }

  /**
   * @description Validate selected fields with local-schema precedence; an empty list validates the full form.
   * @param {readonly string[]} fieldKeys - Normalized path keys to target.
   * @param {ValidationTrigger} _trigger - Reason validation was requested; not passed to the schema.
   * @returns {Promise<boolean>} Promise resolving true only when the current validation result is valid.
   * @example
   * ```ts
   * await validation.validateFields([FormPath.pathToKey(["email"])], "manual");
   * ```
   */
  public async validateFields(fieldKeys: readonly PathKey[], _trigger: ValidationTrigger): Promise<boolean> {
    const targetFieldKeys = ValidationEngine.unique(fieldKeys);

    if (targetFieldKeys.length === 0) {
      return this.validateRegisteredFields('manual');
    }

    const token = this.sequencer.startFields(targetFieldKeys);
    const snapshot = ValidationSnapshot.capture(this.store.getState());

    // Field validation gives local schemas precedence before running the form fallback.
    const localErrorsByKey = await this.validateFieldSchemas(targetFieldKeys);

    if (this.isStale(token, snapshot)) {
      return false;
    }

    const formSchemaFieldKeys = targetFieldKeys.filter(fieldKey => !this.fieldSchemas.has(fieldKey));
    const schemaResult = formSchemaFieldKeys.length > 0
      ? await this.validateFormSchema()
      : ValidationEngine.createValidSchemaResult();

    if (this.isStale(token, snapshot)) {
      return false;
    }

    const errorsByKey = this.mergeErrorsByKey(schemaResult.errorsByKey, localErrorsByKey);

    this.applyErrors([...formSchemaFieldKeys, ...Object.keys(localErrorsByKey)], errorsByKey);

    return targetFieldKeys.every(fieldKey => (errorsByKey[fieldKey] ?? []).length === 0);
  }

  /**
   * @description Validate the form and local overrides, returning false for invalid or stale results.
   * @param {ValidationTrigger} _trigger - Reason validation was requested; not passed to the schema.
   * @returns {Promise<boolean>} Promise resolving true only when the current validation result is valid.
   * @example
   * ```ts
   * await validation.validateRegisteredFields("manual");
   * ```
   */
  public async validateRegisteredFields(_trigger: ValidationTrigger): Promise<boolean> {
    const outcome = await this.validateRegisteredFieldsOutcome(_trigger);
    return outcome.kind === 'valid';
  }

  /**
   * @description Validate the form and local overrides, distinguishing accepted, invalid, and stale results.
   * @param {ValidationTrigger} _trigger - Reason validation was requested; not passed to the schema.
   * @returns {Promise<ValidationOutcome>} Promise of a valid, invalid, or stale validation outcome.
   * - kind `"invalid" | "stale" | "valid"` - Validation outcome: valid, invalid, or stale.
   * @example
   * ```ts
   * await validation.validateRegisteredFieldsOutcome("manual");
   * ```
   */
  public async validateRegisteredFieldsOutcome(
    _trigger: ValidationTrigger,
  ): Promise<ValidationOutcome> {
    const token = this.sequencer.startFull();
    const snapshot = ValidationSnapshot.capture(this.store.getState());

    // Full validation runs the form schema first, then applies local overrides.
    const schemaResult = await this.validateFormSchema();

    if (this.isStale(token, snapshot)) {
      return { kind: 'stale' };
    }

    const localErrorsByKey = await this.validateFieldSchemas([...this.fieldSchemas.keys()]);

    if (this.isStale(token, snapshot)) {
      return { kind: 'stale' };
    }

    const errorsByKey = this.mergeErrorsByKey(schemaResult.errorsByKey, localErrorsByKey);
    const keysToWrite = this.getValidationWriteKeys(errorsByKey);

    this.applyErrors(keysToWrite, errorsByKey);

    return keysToWrite.every(fieldKey => (errorsByKey[fieldKey] ?? []).length === 0)
      ? { kind: 'valid' }
      : { kind: 'invalid' };
  }

  /**
   * Standard Schema가 있으면 전체 form values를 검증한다.
   *
   * @returns schema가 없으면 성공 결과, 있으면 schema validation 결과.
   */
  private validateFormSchema(): Promise<StandardSchemaValidationResult> {
    if (!this.schema) {
      return Promise.resolve(ValidationEngine.createValidSchemaResult());
    }

    return this.schema.validate(this.store.getValues());
  }

  private isStale(token: ValidationToken, snapshot: ValidationSnapshot): boolean {
    return this.sequencer.isStale(token) || !snapshot.matches(this.store.getState());
  }

  /**
   * validation 결과를 store에 기록한다.
   *
   * @param fieldKeys - errors를 교체할 field key 목록.
   * @param errorsByKey - field key별 errors.
   */
  private applyErrors(fieldKeys: readonly PathKey[], errorsByKey: Readonly<Record<PathKey, readonly FormError[]>>): void {
    // Each field write notifies synchronously; applying a result is not a batched state change.
    fieldKeys.forEach(fieldKey => {
      this.store.setErrorsByKey(fieldKey, errorsByKey[fieldKey] ?? []);
    });
  }

  /** field-local schema가 있으면 해당 field value를 검증한다. */
  private async validateFieldSchema(fieldKey: PathKey): Promise<FormError[] | undefined> {
    const fieldSchema = this.fieldSchemas.get(fieldKey);

    if (!fieldSchema) {
      return undefined;
    }

    return fieldSchema.validator.validateValue(this.store.getFieldStateByKey(fieldKey).value);
  }

  /** 지정된 field들 중 field-local schema가 등록된 field만 검증한다. */
  private async validateFieldSchemas(fieldKeys: readonly PathKey[]): Promise<Record<PathKey, FormError[]>> {
    const errorsByKey: Record<PathKey, FormError[]> = {};

    await Promise.all(fieldKeys.map(async fieldKey => {
      const errors = await this.validateFieldSchema(fieldKey);

      if (errors) {
        errorsByKey[fieldKey] = errors;
      }
    }));

    return errorsByKey;
  }

  /**
   * form-level schema 결과에 field-local schema 결과를 덮어쓴다.
   *
   * @remarks
   * field-local schema가 등록된 field는 valid 결과([])까지도 form-level error보다 우선한다.
   */
  private mergeErrorsByKey(
    formErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
    fieldErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
  ): Record<PathKey, FormError[]> {
    const merged = Object.entries(formErrorsByKey).reduce<Record<PathKey, FormError[]>>((errorsByKey, [fieldKey, errors]) => {
      if (!this.fieldSchemas.has(fieldKey)) {
        errorsByKey[fieldKey] = [...errors];
      }

      return errorsByKey;
    }, {});

    Object.entries(fieldErrorsByKey).forEach(([fieldKey, errors]) => {
      merged[fieldKey] = [...errors];
    });

    return merged;
  }

  /**
   * 전체 validation 결과를 기록할 key 목록을 만든다.
   *
   * @remarks
   * 이전 schema error가 남아 있던 field도 clear해야 하므로 현재 store의 field key를 포함한다.
   *
   * @param schemaErrorsByKey - schema issue가 발생한 key 목록.
   * @returns errors를 교체할 key 목록.
   */
  private getValidationWriteKeys(
    schemaErrorsByKey: Readonly<Record<PathKey, readonly FormError[]>>,
  ): PathKey[] {
    return ValidationEngine.unique([...Object.keys(this.store.getState().fields), ...Object.keys(schemaErrorsByKey)]);
  }

  /**
   * 입력 순서를 유지하며 중복 field key를 제거한다.
   *
   * @param fieldKeys - 중복이 있을 수 있는 field key 목록.
   * @returns 중복 제거된 field key 목록.
   */
  private static unique(fieldKeys: readonly PathKey[]): PathKey[] {
    return [...new Set(fieldKeys)];
  }

  /** schema가 없거나 실행할 필요가 없을 때 쓰는 빈 성공 결과다. */
  private static createValidSchemaResult(): StandardSchemaValidationResult {
    return {
      valid: true,
      errorsByKey: {},
    };
  }
}

type RegisteredFieldSchema = {
  id: number;
  validator: StandardSchemaValidator<unknown>;
};

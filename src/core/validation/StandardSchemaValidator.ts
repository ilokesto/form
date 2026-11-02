import { FormPath } from '../path/index';
import type { FieldPath, FieldPathSegment, FormError, PathKey, StandardSchemaV1 } from '../types';

/**
 * @description Adapts Standard Schema validation results into field errors without depending on a specific schema library.
 * @example
 * ```ts
 * const validator = new StandardSchemaValidator(schema);
 * const result = await validator.validate(values);
 * ```
 */
export class StandardSchemaValidator<TValues> {
  /**
   * @description Create a Standard Schema adapter with optional library validation settings.
   * @param {StandardSchemaV1<unknown, TValues>} schema - Standard Schema validator to execute.
   * @param {StandardSchemaV1.Props<unknown, TValues>} schema.~standard - Standard Schema version, vendor, type metadata, and validation entry point.
   * @param {1} schema.~standard.version - Standard Schema major version, which must be 1.
   * @param {string} schema.~standard.vendor - Name of the schema library implementation.
   * @param {StandardSchemaV1.Types<unknown, TValues> | undefined} [schema.~standard.types] - Optional compile-time input and output metadata.
   * @param {unknown} [schema.~standard.types.input] - Schema input type metadata.
   * @param {TValues} [schema.~standard.types.output] - Schema output type metadata.
   * @param {(value: unknown, options?: StandardSchemaV1.Options | undefined) => StandardSchemaV1.Result<TValues> | Promise<StandardSchemaV1.Result<TValues>>} schema.~standard.validate - Validate unknown input and return accepted values or issues, synchronously or asynchronously.
   * @param {StandardSchemaV1.Options | undefined} [options] - Optional library-specific Standard Schema validation settings.
   * @param {Record<string, unknown> | undefined} [options.libraryOptions] - Library-specific validation options; keys are defined by the schema library.
   * @example
   * ```ts
   * const validator = new StandardSchemaValidator(schema);
   * ```
   */
  public constructor(
    private readonly schema: StandardSchemaV1<unknown, TValues>,
    private readonly options?: StandardSchemaV1.Options,
  ) {}

  /**
   * @description Validate all values and group schema issues by normalized field key.
   * @param {TValues} values - Replacement or current form values.
   * @returns {Promise<StandardSchemaValidationResult>} Promise of schema validity and errors grouped by normalized path.
   * - valid `boolean` - Whether the schema accepted the supplied values.
   * - errorsByKey `Record<string, FormError[]>` - Validation errors grouped by normalized field path.
   * @example
   * ```ts
   * await validator.validate({ email: "Ada" });
   * ```
   */
  public async validate(values: TValues): Promise<StandardSchemaValidationResult> {
    const result = await this.schema['~standard'].validate(values, this.options);

    if (!result.issues) {
      return {
        valid: true,
        errorsByKey: {},
      };
    }

    return {
      valid: false,
      errorsByKey: result.issues.reduce<Record<PathKey, FormError[]>>((errorsByKey, issue) => {
        const fieldKey = FormPath.pathToKey(StandardSchemaValidator.issuePathToFieldPath(issue.path));
        errorsByKey[fieldKey] = [
          ...(errorsByKey[fieldKey] ?? []),
          {
            type: 'standard_schema',
            message: issue.message,
          },
        ];
        return errorsByKey;
      }, {}),
    };
  }

  /**
   * @description Validate one field value and flatten every issue into errors for that field.
   * @param {unknown} value - Value to store or inspect.
   * @returns {Promise<FormError[]>} Promise of the errors for this value, or an empty array on success.
   * @example
   * ```ts
   * await validator.validateValue("Ada");
   * ```
   */
  public async validateValue(value: unknown): Promise<FormError[]> {
    const result = await this.schema['~standard'].validate(value, this.options);

    if (!result.issues) {
      return [];
    }

    return result.issues.map(issue => ({
      type: 'standard_schema',
      message: issue.message,
    }));
  }

  /**
   * Standard Schema issue path를 core FieldPath로 변환한다.
   *
   * @remarks
   * Standard Schema path segment는 PropertyKey 또는 `{ key }` 형태일 수 있다.
   * core FieldPath는 string/number만 지원하므로 symbol 등 표현할 수 없는 segment가 있으면 root error로 돌린다.
   *
   * @param issuePath - Standard Schema issue path.
   * @returns core에서 사용하는 FieldPath.
   */
  private static issuePathToFieldPath(issuePath: StandardSchemaV1.Issue['path']): FieldPath {
    if (!issuePath || issuePath.length === 0) {
      return [];
    }

    const fieldPath: FieldPathSegment[] = [];

    for (const segment of issuePath) {
      const key = StandardSchemaValidator.issuePathSegmentToKey(segment);

      if (key === undefined) {
        return [];
      }

      fieldPath.push(key);
    }

    return fieldPath;
  }

  /**
   * Standard Schema path segment 하나를 core path segment로 변환한다.
   *
   * @param segment - PropertyKey 또는 `{ key }` 형태의 path segment.
   * @returns string/number key면 그대로 반환하고, symbol처럼 표현할 수 없으면 undefined.
   */
  private static issuePathSegmentToKey(segment: PropertyKey | StandardSchemaV1.PathSegment): FieldPathSegment | undefined {
    const key = typeof segment === 'object' ? segment.key : segment;

    if (typeof key === 'string' || typeof key === 'number') {
      return key;
    }

    return undefined;
  }
}

/**
 * Standard Schema validation을 core가 사용할 수 있게 정규화한 결과다.
 */
export type StandardSchemaValidationResult = {
  /** schema validation 전체가 성공했는지 여부다. */
  valid: boolean;
  /** PathKey별로 묶은 FormError 목록이다. */
  errorsByKey: Record<PathKey, FormError[]>;
};

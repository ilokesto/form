import type { FieldState } from '../types';

/**
 * @description Creates independent field snapshots with shared default metadata rules and fresh error arrays.
 * @example
 * ```ts
 * const field = FieldStateFactory.create("");
 * ```
 */
export class FieldStateFactory {
  private static readonly METADATA_ONLY = Symbol('metadata-only field');

  /** 모든 field가 공통으로 갖는 기본 메타데이터 값이다. errors는 매번 새 배열로 복사해서 공유 참조를 피한다. */
  private static readonly DEFAULT_FIELD_STATE: FieldState = {
    value: undefined,
    errors: [],
    touched: false,
    dirty: false,
    modified: false,
    isFocused: false,
  };

  /**
   * @description Create a field snapshot with the supplied value, fresh errors, and false metadata flags.
   * @param {unknown} value - Value to store or inspect.
   * @returns {FieldState} Independent field snapshot with the supplied value and fresh errors.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * FieldStateFactory.create("Ada");
   * ```
   */
  public static create(value: unknown): FieldState {
    return {
      ...this.DEFAULT_FIELD_STATE,
      value,
      errors: [],
    };
  }

  /**
   * @description Create a metadata-only snapshot with undefined value and fresh errors, without introducing a value into the form.
   * @returns {FieldState} Independent empty snapshot with undefined value and false metadata flags.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * FieldStateFactory.createDefault();
   * ```
   */
  public static createDefault(): FieldState {
    const field = {
      ...this.create(undefined),
      [this.METADATA_ONLY]: true,
    };

    return field;
  }

  /**
   * @description Identify value-owning snapshots, including explicit undefined values, separately from metadata-only snapshots.
   * @param {Readonly<FieldState>} field - Field snapshot whose value ownership is inspected.
   * @param {unknown} field.value - Current field value.
   * @param {FormError[]} field.errors - Current validation errors for the field.
   * @param {boolean} field.touched - Whether the field has blurred at least once.
   * @param {boolean} field.dirty - Whether the current value differs from its default.
   * @param {boolean} field.modified - Whether a user-originated write has changed this field.
   * @param {boolean} field.isFocused - Whether focus has been recorded without a subsequent blur.
   * @returns {boolean} Whether the snapshot contributes a value when reconstructing the form.
   * @example
   * ```ts
   * FieldStateFactory.ownsValue(FieldStateFactory.create(undefined)); // true
   * FieldStateFactory.ownsValue(FieldStateFactory.createDefault()); // false
   * ```
   */
  public static ownsValue(field: Readonly<FieldState>): boolean {
    return !(this.METADATA_ONLY in field);
  }
}

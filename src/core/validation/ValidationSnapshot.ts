import type { FormState, PathKey } from '../types';

type ValidationState = Pick<FormState<unknown>, 'arrayKeys' | 'fields'>;

/**
 * @description Captures field-value and array-key identities so metadata-only writes do not invalidate validation.
 * @example
 * ```ts
 * const snapshot = ValidationSnapshot.capture(form.getState());
 * const unchanged = snapshot.matches(form.getState());
 * ```
 */
export class ValidationSnapshot {
  private constructor(
    private readonly fieldValues: ReadonlyMap<PathKey, unknown>,
    private readonly arrayKeys: ReadonlyMap<PathKey, readonly string[]>,
  ) {}

  /**
   * @description Capture current field-value and array-key references without retaining a store.
   * @param {ValidationState} state - Form snapshot used as the source of this calculation.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @returns {ValidationSnapshot} Identity snapshot independent of validation revisions and the live store.
   * @example
   * ```ts
   * ValidationSnapshot.capture(state);
   * ```
   */
  public static capture(state: ValidationState): ValidationSnapshot {
    return new ValidationSnapshot(
      new Map(Object.entries(state.fields).map(([fieldKey, field]) => [fieldKey, field.value])),
      new Map(Object.entries(state.arrayKeys)),
    );
  }

  /**
   * @description Check value and array-key identities; metadata-only and error-only changes still match.
   * @param {ValidationState} state - Form snapshot used as the source of this calculation.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @returns {boolean} Whether all captured field values and array keys still have identical references.
   * @example
   * ```ts
   * snapshot.matches(state);
   * ```
   */
  public matches(state: ValidationState): boolean {
    if (this.fieldValues.size !== Object.keys(state.fields).length) return false;
    if (this.arrayKeys.size !== Object.keys(state.arrayKeys).length) return false;

    for (const [fieldKey, value] of this.fieldValues) {
      if (!Object.is(state.fields[fieldKey]?.value, value)) return false;
    }
    for (const [fieldKey, keys] of this.arrayKeys) {
      if (!Object.is(state.arrayKeys[fieldKey], keys)) return false;
    }
    return true;
  }
}

import { FormPath } from '../path/index';
import { FieldStateFactory } from '../state/FieldStateFactory';
import type { FieldPath, FormState, PathKey } from '../types';

type ValidationState = Pick<FormState<unknown>, 'arrayKeys' | 'fields'>;
type ArrayDependency = readonly string[] | string | undefined;

/**
 * @description Captures whole-form or selected-field value and array-item dependencies without retaining a store.
 * @example
 * ```ts
 * const snapshot = ValidationSnapshot.capture(form.getState());
 * const unchanged = snapshot.matches(form.getState());
 * ```
 */
export class ValidationSnapshot {
  private constructor(
    private readonly fieldValues: ReadonlyMap<PathKey, unknown>,
    private readonly arrayKeys: ReadonlyMap<string, ArrayDependency>,
    private readonly fieldKeys?: readonly PathKey[],
  ) {}

  /**
   * @description Capture whole-form dependencies by default, or only values and array-item identities affecting selected fields.
   * @param {ValidationState} state - Form snapshot used as the source of this calculation.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {readonly string[] | undefined} [fieldKeys] - Normalized field keys for local-only validation; omitted to capture the whole form.
   * @returns {ValidationSnapshot} Identity snapshot independent of validation revisions and the live store.
   * @example
   * ```ts
   * ValidationSnapshot.capture(state);
   * ```
   */
  public static capture(state: ValidationState, fieldKeys?: readonly PathKey[]): ValidationSnapshot {
    const paths = fieldKeys?.map(fieldKey => FormPath.keyToPath(fieldKey));
    const fieldValues = new Map(Object.entries(state.fields)
      .filter(([fieldKey, field]) => {
        if (!paths) {
          return true;
        }
        if (!FieldStateFactory.ownsValue(field)) {
          return false;
        }
        const fieldPath = FormPath.keyToPath(fieldKey);
        return paths.some(path => this.hasPrefix(fieldPath, path) || this.hasPrefix(path, fieldPath));
      })
      .map(([fieldKey, field]) => [fieldKey, field.value]));
    const arrayKeys = new Map<string, ArrayDependency>();

    Object.entries(state.arrayKeys).forEach(([arrayKey, keys]) => {
      if (!paths) {
        arrayKeys.set(arrayKey, keys);
        return;
      }

      const arrayPath = FormPath.keyToPath(arrayKey);
      paths.forEach(path => {
        if (this.hasPrefix(arrayPath, path)) {
          arrayKeys.set(`array:${arrayKey}`, keys);
        } else if (this.hasPrefix(path, arrayPath)) {
          const segment = path[arrayPath.length];
          const index = Number(segment);
          if (Number.isInteger(index) && index >= 0 && String(index) === String(segment)) {
            arrayKeys.set(`item:${arrayKey}:${index}`, keys[index]);
          } else {
            arrayKeys.set(`array:${arrayKey}`, keys);
          }
        }
      });
    });

    return new ValidationSnapshot(fieldValues, arrayKeys, fieldKeys ? [...fieldKeys] : undefined);
  }

  /**
   * @description Compare captured dependencies, allowing copied local array-key lists when their item identities are unchanged.
   * @param {ValidationState} state - Form snapshot used as the source of this calculation.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @returns {boolean} Whether captured values and relevant array item identities remain unchanged.
   * @example
   * ```ts
   * snapshot.matches(state);
   * ```
   */
  public matches(state: ValidationState): boolean {
    const current = ValidationSnapshot.capture(state, this.fieldKeys);
    if (this.fieldValues.size !== current.fieldValues.size) {
      return false;
    }
    if (this.arrayKeys.size !== current.arrayKeys.size) {
      return false;
    }

    for (const [fieldKey, value] of this.fieldValues) {
      if (!current.fieldValues.has(fieldKey) || !Object.is(current.fieldValues.get(fieldKey), value)) {
        return false;
      }
    }
    for (const [fieldKey, keys] of this.arrayKeys) {
      if (!current.arrayKeys.has(fieldKey)) {
        return false;
      }
      const currentKeys = current.arrayKeys.get(fieldKey);
      if (this.fieldKeys && Array.isArray(keys) && Array.isArray(currentKeys)) {
        if (keys.length !== currentKeys.length || keys.some((key, index) => key !== currentKeys[index])) {
          return false;
        }
      } else if (!Object.is(currentKeys, keys)) {
        return false;
      }
    }
    return true;
  }

  private static hasPrefix(path: FieldPath, prefix: FieldPath): boolean {
    // Value lookup coerces numeric property keys in both objects and arrays.
    return prefix.length <= path.length && prefix.every((segment, index) => String(segment) === String(path[index]));
  }
}

import { FormPath } from '../path/index';
import type { FieldPath, FormState, PathKey } from '../types';

/**
 * @description Reads, immutably updates, and reconstructs nested form values from normalized field snapshots.
 * @example
 * ```ts
 * const next = ValueHelper.setValueAtPath({ email: "" }, ["email"], "Ada");
 * ```
 */
export class ValueHelper {
  /**
   * values 복원을 시작할 root container를 만든다.
   *
   * @param source - defaultValues의 root 값.
   * @returns source가 배열이면 빈 배열, 객체면 빈 객체, primitive면 source 자체.
   */
  private static createEmptyRoot(source: unknown): unknown {
    if (Array.isArray(source)) {
      return [];
    }

    if (typeof source === 'object' && source !== null) {
      return {};
    }

    return source;
  }

  /**
   * @description Read a nested tuple path, returning undefined when a traversed container is missing or primitive.
   * @param {unknown} source - Root object or array to read or immutably update.
   * @param {FieldPath} path - Tuple path identifying the target field or value.
   * @returns {unknown} Value at the tuple path, or undefined for an unreachable path.
   * @example
   * ```ts
   * ValueHelper.getValueAtPath({ email: "Ada" }, ["email"]);
   * ```
   */
  public static getValueAtPath(source: unknown, path: FieldPath): unknown {
    let current = source;

    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object' && typeof current !== 'function') {
        return undefined;
      }

      current = (current as Record<string | number, unknown>)[segment];
    }

    return current;
  }

  /**
   * @description Copy containers along a tuple path and write the value without mutating the original root.
   * @param {TValues} source - Root object or array to read or immutably update.
   * @param {FieldPath} path - Tuple path identifying the target field or value.
   * @param {unknown} value - Value to store or inspect.
   * @returns {TValues} New root with the path updated; untouched branches retain their references.
   * @example
   * ```ts
   * ValueHelper.setValueAtPath({ email: "Ada" }, ["email"], "Ada");
   * ```
   */
  public static setValueAtPath<TValues>(source: TValues, path: FieldPath, value: unknown): TValues {
    if (path.length === 0) {
      return value as TValues;
    }

    const cloneRoot = Array.isArray(source)
      ? [...source]
      : typeof source === 'object' && source !== null
        ? { ...source }
        : {};
    let current: Record<string | number, unknown> = cloneRoot as Record<string | number, unknown>;

    path.forEach((segment, index) => {
      if (index === path.length - 1) {
        current[segment] = value;
        return;
      }

      const nextSegment = path[index + 1];
      const previous = current[segment];
      const next = Array.isArray(previous)
        ? [...previous]
        : typeof previous === 'object' && previous !== null
          ? { ...previous }
          : typeof nextSegment === 'number'
            ? []
            : {};

      current[segment] = next;
      current = next as Record<string | number, unknown>;
    });

    return cloneRoot as TValues;
  }

  /**
   * @description Rebuild nested values from normalized fields and array keys, using the supplied path lookup.
   * @param {FormState<TValues>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {Readonly<Record<string, FieldPath>>} fieldPaths - Lookup from normalized keys to tuple paths.
   * @returns {TValues} Nested values rebuilt from field values and array container lengths.
   * @example
   * ```ts
   * ValueHelper.getValuesFromFields(state, FormStateReader.getKnownFieldPaths(state));
   * ```
   */
  public static getValuesFromFields<TValues>(
    state: FormState<TValues>,
    fieldPaths: Readonly<Record<PathKey, FieldPath>>,
  ): TValues {
    const valueWithArrays = Object.entries(state.arrayKeys).reduce<unknown>((values, [key, keys]) => {
      return this.setValueAtPath(values, FormPath.keyToPath(key), new Array(keys.length));
    }, this.createEmptyRoot(state.defaultValues));

    return Object.entries(state.fields).reduce<TValues>((values, [key, field]) => {
      const fieldPath = fieldPaths[key];

      if (!fieldPath) {
        return values;
      }

      return this.setValueAtPath(values, fieldPath, field.value);
    }, valueWithArrays as TValues);
  }
}

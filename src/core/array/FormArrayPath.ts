import type { FieldPath } from '../types';

/**
 * @description Identifies array-child paths and replaces only their item-index segment.
 * @example
 * ```ts
 * const child = FormArrayPath.isArrayChildPath(["users", 0, "email"], ["users"]);
 * ```
 */
export class FormArrayPath {
  /**
   * @description Compare path segments with Object.is to check whether a tuple starts with the prefix.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @param {FieldPath} prefix - Path prefix to compare segment by segment.
   * @returns {boolean} Whether every prefix segment matches by Object.is.
   * @example
   * ```ts
   * FormArrayPath.hasPathPrefix(["email"], ["users"]);
   * ```
   */
  public static hasPathPrefix(fieldPath: FieldPath, prefix: FieldPath): boolean {
    return prefix.every((segment, index) => Object.is(fieldPath[index], segment));
  }

  /**
   * @description Check that a path extends the array path with a numeric item-index segment.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @param {FieldPath} arrayPath - Tuple path of the array container.
   * @returns {boolean} Whether the next segment below the array container is a numeric index.
   * @example
   * ```ts
   * FormArrayPath.isArrayChildPath(["users", 0, "email"], ["users"]);
   * ```
   */
  public static isArrayChildPath(fieldPath: FieldPath, arrayPath: FieldPath): boolean {
    return fieldPath.length > arrayPath.length && this.hasPathPrefix(fieldPath, arrayPath) && typeof fieldPath[arrayPath.length] === 'number';
  }

  /**
   * @description Replace the item index beneath an array path while retaining the remaining child segments.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @param {FieldPath} arrayPath - Tuple path of the array container.
   * @param {number} nextIndex - Replacement item index.
   * @returns {FieldPath} Copied child path containing the replacement array index.
   * @example
   * ```ts
   * FormArrayPath.replaceArrayIndex(["users", 0, "email"], ["users"], 1);
   * ```
   */
  public static replaceArrayIndex(fieldPath: FieldPath, arrayPath: FieldPath, nextIndex: number): FieldPath {
    return [...arrayPath, nextIndex, ...fieldPath.slice(arrayPath.length + 1)];
  }
}

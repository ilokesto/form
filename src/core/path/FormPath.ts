import type { FieldPath, FieldPathInput, PathKey } from '../types';

/**
 * @description Converts literal names and tuple paths to collision-free normalized keys; only tuples represent nested paths.
 * @example
 * ```ts
 * const key = FormPath.pathInputToKey(["users", 0, "email"]);
 * ```
 */
export class FormPath {
  /**
   * root path를 표현하는 특수 key다.
   *
   * @remarks
   * 일반 path는 JSON.stringify 배열 문자열이므로 `$`와 충돌하지 않는다.
   */
  public static readonly ROOT_PATH_KEY = '$';

  /**
   * @description Return the supplied segments as a tuple path without parsing strings.
   * @param {FieldPath} segments - Path segments; numeric segments identify array indexes.
   * @returns {FieldPath} Tuple containing the supplied path segments.
   * @example
   * ```ts
   * FormPath.path("users", 0, "email");
   * ```
   */
  public static path(...segments: FieldPath): FieldPath {
    return segments;
  }

  /**
   * @description Wrap a string as one literal field name or preserve the supplied tuple path.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {FieldPath} Tuple path; a string becomes exactly one segment.
   * @example
   * ```ts
   * FormPath.toFieldPath(["email"]);
   * ```
   */
  public static toFieldPath(fieldPath: FieldPathInput): FieldPath {
    if (typeof fieldPath === 'string') {
      // 문자열은 dot path로 파싱하지 않고 하나의 필드 이름으로 취급해 실제 키의 `.` 문자와 충돌하지 않게 한다.
      return [fieldPath];
    }

    return fieldPath;
  }

  /**
   * @description Normalize a literal name or tuple into a field-store key.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {string} Normalized key for field and array-key lookup.
   * @example
   * ```ts
   * FormPath.pathInputToKey(["email"]);
   * ```
   */
  public static pathInputToKey(fieldPath: FieldPathInput): PathKey {
    return this.pathToKey(this.toFieldPath(fieldPath));
  }

  /**
   * @description Serialize a tuple as JSON, using $ for the empty root path.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @returns {string} $ for the root path, otherwise the JSON-serialized tuple.
   * @example
   * ```ts
   * FormPath.pathToKey(["email"]);
   * ```
   */
  public static pathToKey(fieldPath: FieldPath): PathKey {
    if (fieldPath.length === 0) {
      return this.ROOT_PATH_KEY;
    }

    // 구분자 기반 문자열 대신 JSON을 쓰면 `user.name` 같은 실제 키와 경로 표기가 충돌하지 않는다.
    return JSON.stringify(fieldPath);
  }

  /**
   * @description Parse a stored key back to tuple segments and throw for invalid keys or segment types.
   * @param {string} key - Serialized path key produced by pathToKey.
   * @returns {FieldPath} Decoded string and numeric path segments.
   * @example
   * ```ts
   * FormPath.keyToPath(FormPath.pathToKey(["email"]));
   * ```
   */
  public static keyToPath(key: PathKey): FieldPath {
    if (key === this.ROOT_PATH_KEY) {
      return [];
    }

    // 외부 입력이 들어올 수 있으므로 파싱 결과를 바로 믿지 않고 아래에서 segment 타입을 검증한다.
    const parsed: unknown = JSON.parse(key);

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid form path key: ${key}`);
    }

    return parsed.map(segment => {
      if (typeof segment === 'string' || typeof segment === 'number') {
        return segment;
      }

      throw new Error(`Invalid form path segment in key: ${key}`);
    });
  }
}

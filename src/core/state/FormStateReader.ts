import { FieldStateFactory } from './FieldStateFactory';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FieldPathInput, FieldState, FormState, PathKey } from '../types';

/**
 * FormState의 읽기 전용 파생값을 담당한다.
 *
 * 전달된 snapshot만 읽는다. store 조회와 분리되어 배열 재배치에서도 같은
 * snapshot을 기준으로 field 경로와 전체 values를 복원할 수 있다.
 */
export class FormStateReader {
  /**
   * fields 객체의 key들을 FieldPath로 되돌린다.
   *
   * ValueHelper.getValuesFromFields는 field value를 nested object로 복원할 때
   * 각 PathKey가 실제로 어떤 tuple path였는지 알아야 한다.
   */
  public static getKnownFieldPaths<TValues>(state: Readonly<FormState<TValues>>): Record<PathKey, FieldPath> {
    return Object.keys(state.fields).reduce<Record<PathKey, FieldPath>>((paths, key) => {
      paths[key] = FormPath.keyToPath(key);
      return paths;
    }, {});
  }

  /** key로 FieldState를 읽고, 없는 key라면 default FieldState를 반환해 caller가 undefined 처리를 하지 않게 한다. */
  public static getFieldStateByKey<TValues>(state: Readonly<FormState<TValues>>, fieldKey: PathKey): Readonly<FieldState> {
    return state.fields[fieldKey] ?? FieldStateFactory.createDefault();
  }

  /** public path input을 PathKey로 바꾼 뒤 FieldState를 읽는다. */
  public static getFieldState<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPathInput): Readonly<FieldState> {
    return FormStateReader.getFieldStateByKey(state, FormPath.pathInputToKey(fieldPath));
  }

  /** FieldState에서 value만 꺼내는 편의 메서드다. */
  public static getValue<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPathInput): unknown {
    return FormStateReader.getFieldState(state, fieldPath).value;
  }

  /** 현재 FormState를 사용자가 넘긴 defaultValues와 같은 nested 구조로 복원한다. */
  public static getValues<TValues>(state: Readonly<FormState<TValues>>): TValues {
    return ValueHelper.getValuesFromFields(state, FormStateReader.getKnownFieldPaths(state));
  }

  /** 복원된 values에서 FieldPath가 가리키는 nested 값을 읽는다. */
  public static getValueAtPath<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPath): unknown {
    return ValueHelper.getValueAtPath(FormStateReader.getValues(state), fieldPath);
  }
}

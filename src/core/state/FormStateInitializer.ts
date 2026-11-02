import { FieldStateFactory } from './FieldStateFactory';
import { FormPath } from '../path/index';
import type { ArrayKeys, FieldPath, FieldState, FormState } from '../types';

/**
 * @description Normalizes default values into leaf field snapshots and array-container keys.
 * @example
 * ```ts
 * const state = FormStateInitializer.initialize({ email: "" });
 * ```
 */
export class FormStateInitializer {
  /**
   * @description Normalize default values; arrays become key containers, plain objects recurse, and other values become leaves.
   * @param {TValues} defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @returns {FormState<TValues>} Initial normalized state with deterministic initial-N array keys.
   * - defaultValues `TValues` - Initial values and the baseline used for dirty checks and reset.
   * - fields `Record<string, FieldState<unknown>>` - Field snapshots indexed by normalized path keys.
   * - submitCount `number` - Number of submission attempts started by the form.
   * - isSubmitting `boolean` - Whether queued validation or a submit callback is still pending.
   * - isSubmitted `boolean` - Whether a submission has completed at least once.
   * - isSubmitSuccessful `boolean` - Whether the latest completed submission reached a successful valid callback.
   * - arrayKeys `ArrayKeys` - Stable rendering keys indexed by array path.
   * @example
   * ```ts
   * FormStateInitializer.initialize({ email: "" });
   * ```
   */
  public static initialize<TValues>(defaultValues: TValues): FormState<TValues> {
    const fields: Record<string, FieldState> = {};
    const arrayKeys: ArrayKeys = {};

    this.visitInitialValue(defaultValues, [], fields, arrayKeys);

    return {
      defaultValues,
      fields,
      submitCount: 0,
      isSubmitting: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      arrayKeys,
    };
  }

  /**
   * 순회 가능한 plain object인지 확인한다.
   *
   * @remarks
   * class 인스턴스나 Date 같은 객체는 내부 프로퍼티를 form field로 쪼개지 않고 leaf value로 보존한다.
   *
   * @param value - 검사할 값.
   * @returns plain object이면 true.
   */
  private static isTraversableObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  /**
   * defaultValues 안에 이미 존재하는 배열 item의 deterministic key를 만든다.
   *
   * @param length - 배열 길이.
   * @returns `initial-0`, `initial-1` 형태의 key 배열.
   */
  private static createInitialArrayKeys(length: number): string[] {
    return Array.from({ length }, (_, index) => `initial-${index}`);
  }

  /**
   * initial value tree를 DFS로 순회하며 fields와 arrayKeys 누적 객체에 기록한다.
   *
   * @param value - 현재 방문 중인 값.
   * @param fieldPath - 현재 값이 위치한 tuple path.
   * @param fields - leaf field 상태를 기록할 mutable accumulator.
   * @param arrayKeys - 배열 container key 목록을 기록할 mutable accumulator.
   */
  private static visitInitialValue(
    value: unknown,
    fieldPath: FieldPath,
    fields: Record<string, FieldState>,
    arrayKeys: ArrayKeys,
  ): void {
    if (Array.isArray(value)) {
      // 배열 자체는 field leaf가 아니라 field array 컨테이너이므로 key 목록만 저장하고 자식만 순회한다.
      arrayKeys[FormPath.pathToKey(fieldPath)] = this.createInitialArrayKeys(value.length);

      value.forEach((item, index) => {
        this.visitInitialValue(item, [...fieldPath, index], fields, arrayKeys);
      });

      return;
    }

    if (this.isTraversableObject(value)) {
      const entries = Object.entries(value);

      if (entries.length === 0) {
        // 빈 객체는 더 내려갈 leaf가 없으므로 그 자체를 하나의 field value로 보존한다.
        fields[FormPath.pathToKey(fieldPath)] = FieldStateFactory.create(value);
        return;
      }

      entries.forEach(([key, childValue]) => {
        this.visitInitialValue(childValue, [...fieldPath, key], fields, arrayKeys);
      });

      return;
    }

    // primitive, null, Date, class instance 등 순회하지 않는 값은 leaf field로 등록한다.
    fields[FormPath.pathToKey(fieldPath)] = FieldStateFactory.create(value);
  }
}

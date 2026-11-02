import { ArrayKeyGenerator } from './ArrayKeyGenerator';
import { FormArrayMutationPlanner, type FormArrayMutation } from './FormArrayMutationPlanner';
import { FormPath } from '../path/index';
import { FormStateStore } from '../state/index';
import { FormArrayRebaser } from './FormArrayRebaser';
import type { FieldPath, FormArray } from '../types';

/**
 * @description Applies array commands with shared item keys and rebases child field metadata with each change.
 * @example
 * ```ts
 * const items = new FormArrayController(store, new ArrayKeyGenerator(), ["users"]);
 * items.push({ email: "" });
 * ```
 */
export class FormArrayController<TValues> implements FormArray {
  /** 배열 값과 arrayKeys를 읽고, 최종 FormState를 교체할 store다. */
  private readonly store: FormStateStore<TValues>;
  /** 새 배열 item에 부여할 안정적인 render key를 만든다. */
  private readonly keyGenerator: ArrayKeyGenerator;
  /** 이 controller가 담당하는 배열 field의 내부 tuple path다. */
  private readonly fieldPath: FieldPath;

  /**
   * @description Create an array controller for one tuple path with the shared form key generator.
   * @param {FormStateStore<TValues>} store - Shared form state store to read and update.
   * @param {ArrayKeyGenerator} keys - Item key generator shared by controllers in this form.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @example
   * ```ts
   * const items = new FormArrayController(store, new ArrayKeyGenerator(), ["users"]);
   * ```
   */
  public constructor(store: FormStateStore<TValues>, keys: ArrayKeyGenerator, fieldPath: FieldPath) {
    this.store = store;
    this.keyGenerator = keys;
    this.fieldPath = fieldPath;
  }

  /**
   * @description Read stable rendering keys in current item order.
   * @returns {readonly string[]} Stable rendering keys corresponding to current array items.
   * @example
   * ```ts
   * items.keys();
   * ```
   */
  public keys(): readonly string[] {
    return this.getKeys();
  }

  /**
   * @description Insert an item at a bounded index and allocate its stable key.
   * @param {number} index - Zero-based item index.
   * @param {unknown} value - Value to store or inspect.
   * @example
   * ```ts
   * items.insert(0, "Ada");
   * ```
   */
  public insert(index: number, value: unknown): void {
    this.applyMutation(FormArrayMutationPlanner.insert(this.getArray(), this.getKeys(), index, value, this.keyGenerator.create()));
  }

  /**
   * @description Append an item and allocate its stable key.
   * @param {unknown} value - Value to store or inspect.
   * @example
   * ```ts
   * items.push("Ada");
   * ```
   */
  public push(value: unknown): void {
    this.applyMutation(FormArrayMutationPlanner.push(this.getArray(), this.getKeys(), value, this.keyGenerator.create()));
  }

  /**
   * @description Remove a valid item and its child state; an invalid index leaves the state unchanged.
   * @param {number} index - Zero-based item index.
   * @example
   * ```ts
   * items.remove(0);
   * ```
   */
  public remove(index: number): void {
    this.applyMutation(FormArrayMutationPlanner.remove(this.getArray(), this.getKeys(), index));
  }

  /**
   * @description Move an item and its metadata; invalid or identical indexes leave the state unchanged.
   * @param {number} fromIndex - Original index of the item to move.
   * @param {number} toIndex - Destination index of the moved item.
   * @example
   * ```ts
   * items.move(0, 1);
   * ```
   */
  public move(fromIndex: number, toIndex: number): void {
    this.applyMutation(FormArrayMutationPlanner.move(this.getArray(), this.getKeys(), fromIndex, toIndex));
  }

  /**
   * @description Swap two items with their keys and metadata; invalid or identical indexes leave the state unchanged.
   * @param {number} leftIndex - First item index.
   * @param {number} rightIndex - Second item index.
   * @example
   * ```ts
   * items.swap(0, 1);
   * ```
   */
  public swap(leftIndex: number, rightIndex: number): void {
    this.applyMutation(FormArrayMutationPlanner.swap(this.getArray(), this.getKeys(), leftIndex, rightIndex));
  }

  /**
   * @description Replace all items and regenerate their keys and child field state.
   * @param {readonly unknown[]} values - Replacement or current form values.
   * @example
   * ```ts
   * items.replace(["Ada", "Lin"]);
   * ```
   */
  public replace(values: readonly unknown[]): void {
    this.applyMutation(FormArrayMutationPlanner.replace(values, values.map(() => this.keyGenerator.create())));
  }

  /**
   * store에서 현재 배열 값을 읽는다.
   *
   * @returns path의 값이 배열이면 그 배열, 아니면 빈 배열.
   */
  private getArray(): unknown[] {
    const value = this.store.getValueAtPath(this.fieldPath);
    return Array.isArray(value) ? value : [];
  }

  /**
   * 현재 배열에 대응하는 render key 목록을 읽는다.
   *
   * @returns store에 저장된 arrayKeys가 있으면 그것을 사용하고, 없으면 현재 배열 길이만큼 새 key를 만든다.
   */
  private getKeys(): string[] {
    const arrayKey = FormPath.pathToKey(this.fieldPath);
    const currentArray = this.getArray();
    return this.store.getState().arrayKeys[arrayKey] ?? currentArray.map(() => this.keyGenerator.create());
  }

  /**
   * planner가 만든 mutation이 있으면 rebase를 실행한다.
   *
   * @param mutation - 유효하지 않은 조작이면 undefined일 수 있다.
   */
  private applyMutation(mutation: FormArrayMutation | undefined): void {
    if (!mutation) {
      return;
    }

    this.store.replaceState(previousState =>
      FormArrayRebaser.rebase(previousState, this.fieldPath, mutation),
    );
  }
}

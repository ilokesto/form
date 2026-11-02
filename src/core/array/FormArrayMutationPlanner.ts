import { ArrayItemReorder, type IndexMapper } from './ArrayItemReorder';

/**
 * 배열 조작 결과를 표현한다.
 *
 * @remarks
 * values와 keys는 다음 배열 상태이고, mapPreviousIndex는 이전 child field 상태를
 * 어느 새 index로 옮길지 FormArrayRebaser에 알려 준다.
 */
export type FormArrayMutation = {
  /** Array values after this mutation, in the same order as the stable keys. */
  values: readonly unknown[];
  /** Stable item keys in array order. */
  keys: readonly string[];
  /** Map an old item index to its new position, or undefined if removed. */
  mapPreviousIndex: IndexMapper;
};

/**
 * @description Computes array values, stable keys, and index mappings without reading or writing a store.
 * @example
 * ```ts
 * const next = FormArrayMutationPlanner.push([], [], "Ada", "item-1");
 * ```
 */
export class FormArrayMutationPlanner {
  /**
   * @description Compute a bounded insertion using the supplied new item key and preserve old item mappings.
   * @param {readonly unknown[]} currentArray - Array values before the mutation.
   * @param {readonly string[]} currentKeys - Stable item keys before the mutation.
   * @param {number} index - Zero-based item index.
   * @param {unknown} value - Value to store or inspect.
   * @param {string} nextKey - Stable key allocated for the new item.
   * @returns {FormArrayMutation} Next values, stable keys, and old-to-new index mapper.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.insert(["Ada", "Lin"], ["item-1", "item-2"], 0, "Ada", "item-3");
   * ```
   */
  public static insert(
    currentArray: readonly unknown[],
    currentKeys: readonly string[],
    index: number,
    value: unknown,
    nextKey: string,
  ): FormArrayMutation {
    const boundedIndex = Math.max(0, Math.min(index, currentArray.length));
    const nextArray = [...currentArray];
    const nextKeys = [...currentKeys];
    const nextOrder = [...currentArray.keys()];

    nextArray.splice(boundedIndex, 0, value);
    nextKeys.splice(boundedIndex, 0, nextKey);
    nextOrder.splice(boundedIndex, 0, -1);

    return {
      values: nextArray,
      keys: nextKeys,
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * @description Compute an append using the supplied new item key and preserve old item mappings.
   * @param {readonly unknown[]} currentArray - Array values before the mutation.
   * @param {readonly string[]} currentKeys - Stable item keys before the mutation.
   * @param {unknown} value - Value to store or inspect.
   * @param {string} nextKey - Stable key allocated for the new item.
   * @returns {FormArrayMutation} Next values, stable keys, and old-to-new index mapper.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.push(["Ada", "Lin"], ["item-1", "item-2"], "Ada", "item-3");
   * ```
   */
  public static push(currentArray: readonly unknown[], currentKeys: readonly string[], value: unknown, nextKey: string): FormArrayMutation {
    return {
      values: [...currentArray, value],
      keys: [...currentKeys, nextKey],
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, [...currentArray.keys(), -1]),
    };
  }

  /**
   * @description Compute removal and remap surviving indexes; return undefined for an invalid index.
   * @param {readonly unknown[]} currentArray - Array values before the mutation.
   * @param {readonly string[]} currentKeys - Stable item keys before the mutation.
   * @param {number} index - Zero-based item index.
   * @returns {FormArrayMutation | undefined} Next array mutation, or undefined for invalid or unchanged indexes.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.remove(["Ada", "Lin"], ["item-1", "item-2"], 0);
   * ```
   */
  public static remove(currentArray: readonly unknown[], currentKeys: readonly string[], index: number): FormArrayMutation | undefined {
    if (index < 0 || index >= currentArray.length) {
      return undefined;
    }

    const nextOrder = [...currentArray.keys()].filter(itemIndex => itemIndex !== index);

    return {
      values: currentArray.filter((_, itemIndex) => itemIndex !== index),
      keys: currentKeys.filter((_, itemIndex) => itemIndex !== index),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * @description Compute reordered values, keys, and index mapping; return undefined for invalid or identical indexes.
   * @param {readonly unknown[]} currentArray - Array values before the mutation.
   * @param {readonly string[]} currentKeys - Stable item keys before the mutation.
   * @param {number} fromIndex - Original index of the item to move.
   * @param {number} toIndex - Destination index of the moved item.
   * @returns {FormArrayMutation | undefined} Next array mutation, or undefined for invalid or unchanged indexes.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.move(["Ada", "Lin"], ["item-1", "item-2"], 0, 1);
   * ```
   */
  public static move(currentArray: readonly unknown[], currentKeys: readonly string[], fromIndex: number, toIndex: number): FormArrayMutation | undefined {
    if (fromIndex < 0 || fromIndex >= currentArray.length || toIndex < 0 || toIndex >= currentArray.length || fromIndex === toIndex) {
      return undefined;
    }

    const nextOrder = ArrayItemReorder.moveItem([...currentArray.keys()], fromIndex, toIndex);

    return {
      values: ArrayItemReorder.moveItem(currentArray, fromIndex, toIndex),
      keys: ArrayItemReorder.moveItem(currentKeys, fromIndex, toIndex),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * @description Compute exchanged values, keys, and index mapping; return undefined for invalid or identical indexes.
   * @param {readonly unknown[]} currentArray - Array values before the mutation.
   * @param {readonly string[]} currentKeys - Stable item keys before the mutation.
   * @param {number} leftIndex - First item index.
   * @param {number} rightIndex - Second item index.
   * @returns {FormArrayMutation | undefined} Next array mutation, or undefined for invalid or unchanged indexes.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.swap(["Ada", "Lin"], ["item-1", "item-2"], 0, 1);
   * ```
   */
  public static swap(currentArray: readonly unknown[], currentKeys: readonly string[], leftIndex: number, rightIndex: number): FormArrayMutation | undefined {
    if (
      leftIndex < 0 ||
      rightIndex < 0 ||
      leftIndex >= currentArray.length ||
      rightIndex >= currentArray.length ||
      leftIndex === rightIndex
    ) {
      return undefined;
    }

    const nextOrder = ArrayItemReorder.swapItems([...currentArray.keys()], leftIndex, rightIndex);

    return {
      values: ArrayItemReorder.swapItems(currentArray, leftIndex, rightIndex),
      keys: ArrayItemReorder.swapItems(currentKeys, leftIndex, rightIndex),
      mapPreviousIndex: ArrayItemReorder.createIndexMapper(currentArray.length, nextOrder),
    };
  }

  /**
   * @description Copy replacement values and supplied keys, disconnecting every previous item mapping.
   * @param {readonly unknown[]} values - Replacement or current form values.
   * @param {readonly string[]} nextKeys - Stable keys for the replacement array.
   * @returns {FormArrayMutation} Replacement values and keys with all previous item mappings removed.
   * - values `readonly unknown[]` - Array values after this mutation, in the same order as the stable keys.
   * - keys `readonly string[]` - Stable item keys in array order.
   * - mapPreviousIndex `IndexMapper` - Map an old item index to its new position, or undefined if removed.
   * @example
   * ```ts
   * FormArrayMutationPlanner.replace(["Ada"], ["item-1"]);
   * ```
   */
  public static replace(values: readonly unknown[], nextKeys: readonly string[]): FormArrayMutation {
    return {
      values: [...values],
      keys: [...nextKeys],
      mapPreviousIndex: () => undefined,
    };
  }
}

/**
 * 이전 배열 index를 다음 배열 index로 변환하는 함수다.
 *
 * @returns item이 삭제되어 더 이상 존재하지 않으면 undefined.
 */
export type IndexMapper = (index: number) => number | undefined;

/**
 * @description Provides immutable array reorder operations and old-to-new index mapping.
 * @example
 * ```ts
 * const moved = ArrayItemReorder.moveItem(["Ada", "Lin"], 0, 1);
 * ```
 */
export class ArrayItemReorder {
  /**
   * @description Build an old-to-new index mapper; removed and out-of-range old indexes resolve to undefined.
   * @param {number} previousLength - Array length before the reorder.
   * @param {readonly number[]} nextOrder - Old item indexes in next order; -1 denotes a newly inserted item.
   * @returns {IndexMapper} Mapper returning the next index, or undefined when the old item was removed.
   * @example
   * ```ts
   * ArrayItemReorder.createIndexMapper(2, [1, 0]);
   * ```
   */
  public static createIndexMapper(previousLength: number, nextOrder: readonly number[]): IndexMapper {
    const positions = new Map<number, number>();

    nextOrder.forEach((previousIndex, nextIndex) => {
      if (previousIndex >= 0 && previousIndex < previousLength) {
        positions.set(previousIndex, nextIndex);
      }
    });

    return index => positions.get(index);
  }

  /**
   * @description Return a copied array with one item moved to the destination index.
   * @param {readonly T[]} items - Items to reorder without mutating the input.
   * @param {number} fromIndex - Original index of the item to move.
   * @param {number} toIndex - Destination index of the moved item.
   * @returns {T[]} Copied array in the requested order; the input array is unchanged.
   * @example
   * ```ts
   * ArrayItemReorder.moveItem(["Ada", "Lin"], 0, 1);
   * ```
   */
  public static moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
    const nextItems = [...items];
    const [item] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, item);
    return nextItems;
  }

  /**
   * @description Return a copied array with the two item positions exchanged.
   * @param {readonly T[]} items - Items to reorder without mutating the input.
   * @param {number} leftIndex - First item index.
   * @param {number} rightIndex - Second item index.
   * @returns {T[]} Copied array with the two positions exchanged.
   * @example
   * ```ts
   * ArrayItemReorder.swapItems(["Ada", "Lin"], 0, 1);
   * ```
   */
  public static swapItems<T>(items: readonly T[], leftIndex: number, rightIndex: number): T[] {
    const nextItems = [...items];
    const left = nextItems[leftIndex];
    nextItems[leftIndex] = nextItems[rightIndex];
    nextItems[rightIndex] = left;
    return nextItems;
  }
}

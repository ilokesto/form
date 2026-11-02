/**
 * @description Allocates form-local item-N keys for items added at runtime; initial items use deterministic initial-N keys.
 * @example
 * ```ts
 * const key = new ArrayKeyGenerator().create();
 * ```
 */
export class ArrayKeyGenerator {
  /** 다음 key에 사용할 증가 숫자다. */
  private id = 0;

  /**
   * @description Allocate the next item-N rendering key; numbering starts at item-1 for this generator.
   * @returns {string} Next form-local key in item-N format.
   * @example
   * ```ts
   * const keys = new ArrayKeyGenerator();
   * const key = keys.create();
   * ```
   */
  public create(): string {
    this.id += 1;
    return `item-${this.id}`;
  }
}

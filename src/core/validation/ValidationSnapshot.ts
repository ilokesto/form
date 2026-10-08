import type { FormState, PathKey } from '../types';

type ValidationState = Pick<FormState<unknown>, 'arrayKeys' | 'fields'>;

/** Captures value and array identities without retaining a store or validation revisions. */
export class ValidationSnapshot {
  private constructor(
    private readonly fieldValues: ReadonlyMap<PathKey, unknown>,
    private readonly arrayKeys: ReadonlyMap<PathKey, readonly string[]>,
  ) {}

  public static capture(state: ValidationState): ValidationSnapshot {
    return new ValidationSnapshot(
      new Map(Object.entries(state.fields).map(([fieldKey, field]) => [fieldKey, field.value])),
      new Map(Object.entries(state.arrayKeys)),
    );
  }

  /** Metadata and error writes do not invalidate work against unchanged values. */
  public matches(state: ValidationState): boolean {
    if (this.fieldValues.size !== Object.keys(state.fields).length) return false;
    if (this.arrayKeys.size !== Object.keys(state.arrayKeys).length) return false;

    for (const [fieldKey, value] of this.fieldValues) {
      if (!Object.is(state.fields[fieldKey]?.value, value)) return false;
    }
    for (const [fieldKey, keys] of this.arrayKeys) {
      if (!Object.is(state.arrayKeys[fieldKey], keys)) return false;
    }
    return true;
  }
}

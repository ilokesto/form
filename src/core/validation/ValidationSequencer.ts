import type { PathKey } from '../types';

type FullValidationToken = {
  /** Discriminant identifying the validation scope or valid, invalid, or stale outcome. */
  readonly kind: 'full';
  /** Global validation revision captured when full validation starts. */
  readonly revision: number;
};

type FieldValidationToken = {
  /** Full-validation revision captured when field validation starts. */
  readonly fullRevision: number;
  /** Discriminant identifying the validation scope or valid, invalid, or stale outcome. */
  readonly kind: 'fields';
  /** Per-field revisions captured for this validation request. */
  readonly targetRevisions: ReadonlyMap<PathKey, number>;
};

export type ValidationToken = FullValidationToken | FieldValidationToken;

/**
 * @description Tracks global and per-field revisions so newer validation work invalidates stale results.
 * @example
 * ```ts
 * const sequencer = new ValidationSequencer();
 * const token = sequencer.startFields(["email"]);
 * ```
 */
export class ValidationSequencer {
  private revision = 0;
  private fullRevision = 0;
  private readonly targetRevisions = new Map<PathKey, number>();

  /**
   * @description Start a full validation revision, invalidating earlier full and field requests.
   * @returns {ValidationToken} Token capturing this full validation revision.
   * - kind `"full" | "fields"` - Validation scope: full-form or selected fields.
   * - revision `number` - Global validation revision captured when full validation starts.
   * - fullRevision `number` - Full-validation revision captured when field validation starts.
   * - targetRevisions `ReadonlyMap<string, number>` - Per-field revisions captured for this validation request.
   * @example
   * ```ts
   * sequencer.startFull();
   * ```
   */
  public startFull(): ValidationToken {
    this.revision += 1;
    this.fullRevision += 1;
    return { kind: 'full', revision: this.revision };
  }

  /**
   * @description Start revisions for the selected fields without invalidating unrelated field requests.
   * @param {readonly string[]} fieldKeys - Normalized path keys to target.
   * @returns {ValidationToken} Token capturing the full revision and selected field revisions.
   * - kind `"full" | "fields"` - Validation scope: full-form or selected fields.
   * - revision `number` - Global validation revision captured when full validation starts.
   * - fullRevision `number` - Full-validation revision captured when field validation starts.
   * - targetRevisions `ReadonlyMap<string, number>` - Per-field revisions captured for this validation request.
   * @example
   * ```ts
   * sequencer.startFields([FormPath.pathToKey(["email"])]);
   * ```
   */
  public startFields(fieldKeys: readonly PathKey[]): ValidationToken {
    this.revision += 1;
    const targetRevisions = new Map<PathKey, number>();

    for (const fieldKey of fieldKeys) {
      const revision = (this.targetRevisions.get(fieldKey) ?? 0) + 1;
      this.targetRevisions.set(fieldKey, revision);
      targetRevisions.set(fieldKey, revision);
    }

    return {
      fullRevision: this.fullRevision,
      kind: 'fields',
      targetRevisions,
    };
  }

  /**
   * @description Invalidate outstanding validation for the selected fields and any pending full request.
   * @param {readonly string[]} fieldKeys - Normalized path keys to target.
   * @example
   * ```ts
   * sequencer.invalidateFields([FormPath.pathToKey(["email"])]);
   * ```
   */
  public invalidateFields(fieldKeys: readonly PathKey[]): void {
    this.revision += 1;
    for (const fieldKey of fieldKeys) {
      this.targetRevisions.set(fieldKey, (this.targetRevisions.get(fieldKey) ?? 0) + 1);
    }
  }

  /**
   * @description Compare a captured token with current revisions to detect superseded validation.
   * @param {ValidationToken} token - Validation revision token to compare with current revisions.
   * @param {"full" | "fields"} token.kind - Validation scope: full-form or selected fields.
   * @param {number} token.revision - Global validation revision captured when full validation starts.
   * @param {number} token.fullRevision - Full-validation revision captured when field validation starts.
   * @param {ReadonlyMap<string, number>} token.targetRevisions - Per-field revisions captured for this validation request.
   * @returns {boolean} Whether any relevant revision has superseded the captured token.
   * @example
   * ```ts
   * const token = sequencer.startFull();
   * sequencer.startFields([FormPath.pathToKey(["email"])]);
   * const stale = sequencer.isStale(token);
   * ```
   */
  public isStale(token: ValidationToken): boolean {
    switch (token.kind) {
      case 'full':
        return token.revision !== this.revision;
      case 'fields':
        if (token.fullRevision !== this.fullRevision) return true;
        for (const [fieldKey, revision] of token.targetRevisions) {
          if (this.targetRevisions.get(fieldKey) !== revision) return true;
        }
        return false;
    }
  }
}

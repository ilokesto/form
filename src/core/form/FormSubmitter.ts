import type { FormStateStore } from '../state/index';
import type { ValidationEngine } from '../validation/index';
import type { FieldState, PathKey } from '../types';

/**
 * @description Serializes submissions, retries stale validation, and records lifecycle state after the final queued submission.
 * @example
 * ```ts
 * const submitter = new FormSubmitter(store, validation);
 * await submitter.submit(values => save(values));
 * ```
 */
export class FormSubmitter<TValues> {
  private submissionQueue: Promise<void> = Promise.resolve();
  private pendingSubmissionCount = 0;

  /**
   * @description Create a submit queue over the same store and validation engine.
   * @param {FormStateStore<TValues>} store - Shared form state store to read and update.
   * @param {ValidationEngine<TValues>} validation - Validation engine sharing the same state store.
   * @example
   * ```ts
   * const submitter = new FormSubmitter(store, validation);
   * ```
   */
  public constructor(
    private readonly store: FormStateStore<TValues>,
    private readonly validation: ValidationEngine<TValues>,
  ) {}

  /**
   * @description Queue a submission, retry stale validation, and return the valid callback result or undefined after invalid validation.
   * @param {(values: TValues) => TResult | Promise<TResult>} onValid - Callback receiving current values after successful validation.
   * @param {((fields: Readonly<Record<PathKey, FieldState>>) => void) | undefined} [onInvalid] - Callback receiving field snapshots when validation fails.
   * @returns {Promise<TResult | undefined>} Promise of the valid callback result, or undefined when validation fails; callback errors reject.
   * @example
   * ```ts
   * await submitter.submit(values => save(values), fields => showErrors(fields));
   * ```
   */
  public submit<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined> {
    this.pendingSubmissionCount += 1;
    this.store.beginSubmit();

    const submission = this.submissionQueue.then(() => this.executeSubmission(onValid, onInvalid));
    this.submissionQueue = submission.then(
      () => undefined,
      () => undefined,
    );

    return submission;
  }

  private async executeSubmission<TResult>(
    onValid: (values: TValues) => TResult | Promise<TResult>,
    onInvalid?: (fields: Readonly<Record<PathKey, FieldState>>) => void,
  ): Promise<TResult | undefined> {
    let successful = false;

    try {
      while (true) {
        const outcome = await this.validation.validateRegisteredFieldsOutcome('submit');

        switch (outcome.kind) {
          case 'stale':
            continue;
          case 'invalid':
            onInvalid?.(this.store.getState().fields);
            return undefined;
          case 'valid': {
            const result = await onValid(this.store.getValues());

            successful = true;
            return result;
          }
        }
      }
    } finally {
      this.pendingSubmissionCount -= 1;
      if (this.pendingSubmissionCount === 0) {
        this.store.completeSubmit(successful);
      }
    }
  }
}

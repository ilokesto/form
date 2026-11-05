import type { FormArrayMutation } from './FormArrayMutationPlanner';
import { FormArrayPath } from './FormArrayPath';
import { FieldStateFactory } from '../state/FieldStateFactory';
import { FormStateInitializer } from '../state/FormStateInitializer';
import { FormStateReader } from '../state/FormStateReader';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FormState } from '../types';

/**
 * @description Rebases fields and nested array keys after item changes while preserving surviving metadata and submission state.
 * @example
 * ```ts
 * const next = FormArrayRebaser.rebase(state, ["users"], mutation);
 * ```
 */
export class FormArrayRebaser {
  /**
   * @description Apply next array values and move surviving child metadata and nested array keys to their new indexes without changing the configured defaults.
   * @param {Readonly<FormState<TValues>>} previousState - Snapshot before the array mutation.
   * @param {TValues} previousState.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} previousState.fields - Field snapshots indexed by normalized path keys.
   * @param {number} previousState.submitCount - Number of submission attempts started by the form.
   * @param {boolean} previousState.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} previousState.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} previousState.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} previousState.arrayKeys - Stable rendering keys indexed by array path.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @param {FormArrayMutation} mutation - Next array values, stable keys, and old-to-new index mapper.
   * @param {readonly unknown[]} mutation.values - Array values after this mutation, in the same order as the stable keys.
   * @param {readonly string[]} mutation.keys - Stable item keys in array order.
   * @param {IndexMapper} mutation.mapPreviousIndex - Map an old item index to its new position, or undefined if removed.
   * @returns {FormState<TValues>} Next form snapshot with surviving child metadata and submission state preserved.
   * - defaultValues `TValues` - Initial values and the baseline used for dirty checks and reset.
   * - fields `Record<string, FieldState<unknown>>` - Field snapshots indexed by normalized path keys.
   * - submitCount `number` - Number of submission attempts started by the form.
   * - isSubmitting `boolean` - Whether queued validation or a submit callback is still pending.
   * - isSubmitted `boolean` - Whether a submission has completed at least once.
   * - isSubmitSuccessful `boolean` - Whether the latest completed submission reached a successful valid callback.
   * - arrayKeys `ArrayKeys` - Stable rendering keys indexed by array path.
   * @example
   * ```ts
   * const mutation = FormArrayMutationPlanner.push([], [], "Ada", "item-1");
   * const next = FormArrayRebaser.rebase(state, ["users"], mutation);
   * ```
   */
  public static rebase<TValues>(
    previousState: Readonly<FormState<TValues>>,
    fieldPath: FieldPath,
    mutation: FormArrayMutation,
  ): FormState<TValues> {
    const fieldPaths = FormStateReader.getKnownFieldPaths(previousState);
    const nextValues = ValueHelper.setValueAtPath(FormStateReader.getValues(previousState), fieldPath, [...mutation.values]);
    const initializedState = FormStateInitializer.initialize(nextValues);
    const arrayKey = FormPath.pathToKey(fieldPath);
    const rebasedFields = { ...initializedState.fields };
    const rebasedArrayKeys = { ...initializedState.arrayKeys };

    Object.entries(previousState.fields).forEach(([fieldKey, previousField]) => {
      const currentFieldPath = fieldPaths[fieldKey];

      if (!currentFieldPath) {
        return;
      }

      if (!FormArrayPath.isArrayChildPath(currentFieldPath, fieldPath)) {
        rebasedFields[fieldKey] = previousField;
        return;
      }

      const previousIndex = currentFieldPath[fieldPath.length];

      if (typeof previousIndex !== 'number') {
        return;
      }

      const nextIndex = mutation.mapPreviousIndex(previousIndex);

      if (nextIndex === undefined) {
        return;
      }

      const nextFieldPath = FormArrayPath.replaceArrayIndex(currentFieldPath, fieldPath, nextIndex);
      const nextFieldKey = FormPath.pathToKey(nextFieldPath);
      const nextField = initializedState.fields[nextFieldKey] ?? FieldStateFactory.createDefault();

      rebasedFields[nextFieldKey] = {
        ...nextField,
        errors: previousField.errors,
        touched: previousField.touched,
        dirty: previousField.dirty,
        modified: previousField.modified,
        isFocused: previousField.isFocused,
      };
    });

    Object.entries(previousState.arrayKeys).forEach(([previousArrayKey, previousKeys]) => {
      if (previousArrayKey === arrayKey) {
        return;
      }

      const previousArrayPath = FormPath.keyToPath(previousArrayKey);
      let nextArrayPath = previousArrayPath;

      if (FormArrayPath.isArrayChildPath(previousArrayPath, fieldPath)) {
        const previousIndex = previousArrayPath[fieldPath.length];

        if (typeof previousIndex !== 'number') {
          return;
        }

        const nextIndex = mutation.mapPreviousIndex(previousIndex);

        if (nextIndex === undefined) {
          return;
        }

        nextArrayPath = FormArrayPath.replaceArrayIndex(previousArrayPath, fieldPath, nextIndex);
      }

      const nextArrayKey = FormPath.pathToKey(nextArrayPath);
      const initializedKeys = initializedState.arrayKeys[nextArrayKey];

      if (initializedKeys?.length === previousKeys.length) {
        rebasedArrayKeys[nextArrayKey] = [...previousKeys];
      }
    });

    rebasedArrayKeys[arrayKey] = [...mutation.keys];

    return {
      ...initializedState,
      defaultValues: previousState.defaultValues,
      fields: rebasedFields,
      arrayKeys: rebasedArrayKeys,
      submitCount: previousState.submitCount,
      isSubmitting: previousState.isSubmitting,
      isSubmitted: previousState.isSubmitted,
      isSubmitSuccessful: previousState.isSubmitSuccessful,
    };
  }
}

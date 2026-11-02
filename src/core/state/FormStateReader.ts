import { FieldStateFactory } from './FieldStateFactory';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FieldPathInput, FieldState, FormState, PathKey } from '../types';

/**
 * @description Derives values and field metadata from one supplied snapshot without reading a live store.
 * @example
 * ```ts
 * const values = FormStateReader.getValues(form.getState());
 * ```
 */
export class FormStateReader {
  /**
   * @description Decode the snapshot field keys into a lookup of tuple paths.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @returns {Record<string, FieldPath>} Lookup mapping each stored field key to its decoded tuple path.
   * @example
   * ```ts
   * FormStateReader.getKnownFieldPaths(state);
   * ```
   */
  public static getKnownFieldPaths<TValues>(state: Readonly<FormState<TValues>>): Record<PathKey, FieldPath> {
    return Object.keys(state.fields).reduce<Record<PathKey, FieldPath>>((paths, key) => {
      paths[key] = FormPath.keyToPath(key);
      return paths;
    }, {});
  }

  /**
   * @description Read a normalized field key, returning an independent default snapshot when absent.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {string} fieldKey - Normalized path key of the target field.
   * @returns {Readonly<FieldState>} Stored field snapshot, or an empty snapshot for an absent key.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * FormStateReader.getFieldStateByKey(state, FormPath.pathToKey(["email"]));
   * ```
   */
  public static getFieldStateByKey<TValues>(state: Readonly<FormState<TValues>>, fieldKey: PathKey): Readonly<FieldState> {
    return state.fields[fieldKey] ?? FieldStateFactory.createDefault();
  }

  /**
   * @description Read field metadata and use a default snapshot when the field is not present.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {Readonly<FieldState>} Field snapshot, with a default shape when the leaf field is absent.
   * - value `unknown` - Current field value.
   * - errors `FormError[]` - Current validation errors for the field.
   * - touched `boolean` - Whether the field has blurred at least once.
   * - dirty `boolean` - Whether the current value differs from its default by Object.is.
   * - modified `boolean` - Whether a user-originated write has changed this field.
   * - isFocused `boolean` - Whether focus has been recorded without a subsequent blur.
   * @example
   * ```ts
   * FormStateReader.getFieldState(state, ["email"]);
   * ```
   */
  public static getFieldState<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPathInput): Readonly<FieldState> {
    return FormStateReader.getFieldStateByKey(state, FormPath.pathInputToKey(fieldPath));
  }

  /**
   * @description Read only the current value of the selected field.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {FieldPathInput} fieldPath - Literal field name or tuple path; strings are not split on dots.
   * @returns {unknown} Stored field value, or undefined when the field has no value.
   * @example
   * ```ts
   * FormStateReader.getValue(state, ["email"]);
   * ```
   */
  public static getValue<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPathInput): unknown {
    return FormStateReader.getFieldState(state, fieldPath).value;
  }

  /**
   * @description Reconstruct the nested values object from leaf fields and array containers.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @returns {TValues} Nested values reconstructed in the shape of the supplied defaults.
   * @example
   * ```ts
   * FormStateReader.getValues(state);
   * ```
   */
  public static getValues<TValues>(state: Readonly<FormState<TValues>>): TValues {
    return ValueHelper.getValuesFromFields(state, FormStateReader.getKnownFieldPaths(state));
  }

  /**
   * @description Read a nested tuple path, returning undefined when a traversed container is missing or primitive.
   * @param {Readonly<FormState<TValues>>} state - Form snapshot used as the source of this calculation.
   * @param {TValues} state.defaultValues - Initial values and the baseline used for dirty checks and reset.
   * @param {Record<string, FieldState<unknown>>} state.fields - Field snapshots indexed by normalized path keys.
   * @param {number} state.submitCount - Number of submission attempts started by the form.
   * @param {boolean} state.isSubmitting - Whether queued validation or a submit callback is still pending.
   * @param {boolean} state.isSubmitted - Whether a submission has completed at least once.
   * @param {boolean} state.isSubmitSuccessful - Whether the latest completed submission reached a successful valid callback.
   * @param {ArrayKeys} state.arrayKeys - Stable rendering keys indexed by array path.
   * @param {FieldPath} fieldPath - Tuple path identifying the target field or value.
   * @returns {unknown} Value at the tuple path, or undefined for an unreachable path.
   * @example
   * ```ts
   * FormStateReader.getValueAtPath(state, ["email"]);
   * ```
   */
  public static getValueAtPath<TValues>(state: Readonly<FormState<TValues>>, fieldPath: FieldPath): unknown {
    return ValueHelper.getValueAtPath(FormStateReader.getValues(state), fieldPath);
  }
}

import { createStore, type StoreApi } from '@ilokesto/store';
import { produce } from 'immer';

import { FieldStateFactory } from './FieldStateFactory';
import { FormStateInitializer } from './FormStateInitializer';
import { FormStateReader } from './FormStateReader';
import { FormPath } from '../path/index';
import { ValueHelper } from '../value/index';
import type { FieldPath, FieldPathInput, FieldState, FormError, FormState, PathKey, ResetOptions, SetValueOptions } from '../types';

/**
 * form 상태와 쓰기 작업의 소유자다.
 *
 * 각 명령은 기존 알림 경계를 유지하며 immer로 다음 snapshot을 만든다.
 * 읽기와 values 복원은 현재 snapshot을 순수한 FormStateReader 계산에 전달한다.
 */
export class FormStateStore<TValues> {
  private readonly store: StoreApi<FormState<TValues>>;

  /** nested defaultValues를 정규화하여 단일 store를 만든다. */
  public constructor(defaultValues: TValues) {
    this.store = createStore<FormState<TValues>>(FormStateInitializer.initialize(defaultValues));
  }

  /** 현재 FormState snapshot을 반환한다. 반환값은 읽기 전용으로 취급한다. */
  public getState(): Readonly<FormState<TValues>> {
    return this.store.getState();
  }

  /** 상태 변경 시 호출될 listener를 등록하고 unsubscribe 함수를 반환한다. */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /** 이미 정규화된 key로 FieldState를 읽는다. validation처럼 key 기반으로 동작하는 곳에서 사용한다. */
  public getFieldStateByKey(fieldKey: PathKey): Readonly<FieldState> {
    return FormStateReader.getFieldStateByKey(this.store.getState(), fieldKey);
  }

  /** public path input을 받아 해당 FieldState를 읽는다. */
  public getFieldState(fieldPath: FieldPathInput): Readonly<FieldState> {
    return FormStateReader.getFieldState(this.store.getState(), fieldPath);
  }

  /** public path input을 받아 해당 value만 읽는다. */
  public getValue(fieldPath: FieldPathInput): unknown {
    return FormStateReader.getValue(this.store.getState(), fieldPath);
  }

  /** fields와 arrayKeys로부터 전체 values 객체를 복원한다. */
  public getValues(): TValues {
    return FormStateReader.getValues(this.store.getState());
  }

  /** 내부 FieldPath를 기준으로 최신 values에서 nested value를 읽는다. 배열 controller가 현재 배열 값을 얻을 때 사용한다. */
  public getValueAtPath(fieldPath: FieldPath): unknown {
    return FormStateReader.getValueAtPath(this.store.getState(), fieldPath);
  }

  /**
   * 한 field value를 갱신한다.
   *
   * dirty는 defaultValues의 같은 path 값과 Object.is로 비교해 계산한다.
   * modified는 사용자가 만든 변경(source: 'user')일 때만 true로 바꾼다.
   * 반환한 PathKey는 이후 validation 실행에 재사용된다.
   */
  public setValue(fieldPath: FieldPath, value: unknown, options: SetValueOptions = {}): PathKey {
    const fieldKey = FormPath.pathToKey(fieldPath);
    const defaultValue = ValueHelper.getValueAtPath(this.store.getState().defaultValues, fieldPath);

    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          value,
          dirty: !Object.is(value, defaultValue),
          modified: options.source === 'user' ? true : previousField.modified,
        };
      }),
    );

    return fieldKey;
  }

  /** blur된 field의 touched flag를 true로 바꾼다. 기존 field가 없으면 default state에서 시작한다. */
  public touchField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          touched: true,
        };
      }),
    );
  }

  /**
   * field의 isFocused를 true로 바꾼다. focus 이벤트에서 호출된다.
   *
   * fieldKey에 해당하는 field가 없으면 default state를 생성해 기록한다. 이는 touchField와 동일한 패턴이지만,
   * 존재하지 않는 path에 대해 의도치 않게 field가 생성되는 부수 효과에 유의해야 한다.
   */
  public focusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: true,
        };
      }),
    );
  }

  /**
   * field의 isFocused를 false로 바꾼다. blur 이벤트에서 호출된다.
   *
   * fieldKey에 해당하는 field가 없으면 default state를 생성해 기록한다. focusField와 동일한 fallback 패턴이며,
   * 존재하지 않는 path에 대해 의도치 않게 field가 생성되는 부수 효과에 유의해야 한다.
   */
  public unfocusField(fieldKey: PathKey): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          isFocused: false,
        };
      }),
    );
  }

  /** validation 또는 외부 명령 결과로 field의 errors를 통째로 교체한다. */
  public setErrorsByKey(fieldKey: PathKey, errors: readonly FormError[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

        draft.fields[fieldKey] = {
          ...previousField,
          errors: [...errors],
        };
      }),
    );
  }

  /**
   * errors를 비운다.
   *
   * fieldKeys가 있으면 해당 key들만 대상으로 하고, 없으면 현재 존재하는 모든 fields를 대상으로 한다.
   * 존재하지 않는 key가 들어와도 default field를 만든 뒤 errors: [] 상태로 저장한다.
   */
  public clearErrors(fieldKeys?: readonly PathKey[]): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        const keys = fieldKeys && fieldKeys.length > 0 ? fieldKeys : Object.keys(draft.fields);

        keys.forEach(fieldKey => {
          const previousField = draft.fields[fieldKey] ?? FieldStateFactory.createDefault();

          draft.fields[fieldKey] = {
            ...previousField,
            errors: [],
          };
        });
      }),
    );
  }

  /** 새 values가 있으면 그것을 새 defaultValues로 삼고, 없으면 기존 defaultValues로 FormState를 재생성한다. */
  public reset(values?: TValues, options: ResetOptions = {}): void {
    const previousState = this.store.getState();
    const nextDefaultValues = values ?? previousState.defaultValues;
    const initializedState = FormStateInitializer.initialize(nextDefaultValues);

    this.store.setState(
      produce(initializedState, draft => {
        Object.entries(draft.fields).forEach(([fieldKey, nextField]) => {
          const previousField = previousState.fields[fieldKey];

          if (!previousField) {
            return;
          }

          if (options.keepDirtyValues && previousField.dirty) {
            const fieldPath = FormPath.keyToPath(fieldKey);
            const defaultValue = ValueHelper.getValueAtPath(nextDefaultValues, fieldPath);

            nextField.value = previousField.value;
            nextField.dirty = !Object.is(previousField.value, defaultValue);
            nextField.modified = previousField.modified;
          }

          if (options.keepErrors) {
            nextField.errors = [...previousField.errors];
          }

          if (options.keepTouched) {
            nextField.touched = previousField.touched;
          }
        });

        if (options.keepSubmitState) {
          draft.submitCount = previousState.submitCount;
          draft.isSubmitting = previousState.isSubmitting;
          draft.isSubmitted = previousState.isSubmitted;
          draft.isSubmitSuccessful = previousState.isSubmitSuccessful;
        }
      }),
    );
  }

  /** submit 시도 횟수를 증가시키고 진행 중 상태를 기록한다. */
  public beginSubmit(): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.submitCount += 1;
        draft.isSubmitting = true;
        draft.isSubmitSuccessful = false;
      }),
    );
  }

  /** submit validation/callback 완료 후 성공 여부를 기록한다. */
  public completeSubmit(successful: boolean): void {
    this.store.setState(prevState =>
      produce(prevState, draft => {
        draft.isSubmitting = false;
        draft.isSubmitted = true;
        draft.isSubmitSuccessful = successful;
      }),
    );
  }

  /** 이미 완성된 FormState updater를 store에 전달한다. 배열 리베이스처럼 여러 조각을 한 번에 바꿀 때 사용한다. */
  public replaceState(updater: (previousState: FormState<TValues>) => FormState<TValues>): void {
    this.store.setState(updater);
  }
}

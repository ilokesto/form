import { ref, toValue, watch } from 'vue';

import { createSubmitHandler } from '../adapters/dom';
import { createFormFromOptions, isFormInstance, type FormInput } from '../adapters/FormInput';
import type { Form } from '../core/index';
import type { RegisterOptions, VueForm, VueFormOptions } from './types';
import { useFieldWithForm } from './useField';
import { useFormStateWithForm } from './useFormState';
import { useRegisterWithForm } from './useRegister';

/** Vue composable surface를 core Form 인스턴스에 바인딩한다. */
export function useForm<TValues>(form: Form<TValues>): VueForm<TValues>;
export function useForm<TValues>(options: VueFormOptions<TValues>): VueForm<TValues>;
export function useForm<TValues>(input: FormInput<TValues>): VueForm<TValues> {
  const isForm = isFormInstance(input);
  const form = isForm ? input : createFormFromOptions(input);
  const values = isForm ? undefined : (input as VueFormOptions<TValues>).values;
  const resetOptions = isForm ? undefined : (input as VueFormOptions<TValues>).resetOptions;

  if (values !== undefined) {
    const previousValuesRef = ref<TValues | undefined>(undefined);

    const sync = (nextValues: TValues) => {
      if (previousValuesRef.value === nextValues) {
        return;
      }

      previousValuesRef.value = nextValues;
      form.reset(nextValues, resetOptions);
    };

    sync(toValue(values));

    watch(
      () => toValue(values),
      nextValues => {
        sync(nextValues);
      },
    );
  }

  const useRegister = ((first: RegisterOptions | readonly RegisterOptions[], ...rest: readonly RegisterOptions[]) => useRegisterWithForm(form, first, ...rest)) as VueForm<TValues>['useRegister'];
  const useField = ((options: RegisterOptions) => useFieldWithForm(form, options)) as VueForm<TValues>['useField'];
  const useFormState = (): ReturnType<VueForm<TValues>['useFormState']> => useFormStateWithForm(form);
  const handleSubmit = ((onValid, onInvalid) => createSubmitHandler(form, onValid, onInvalid)) as VueForm<TValues>['handleSubmit'];

  return { form, useRegister, useField, useFormState, handleSubmit };
}

import type { MaybeRefOrGetter } from 'vue';
import type { Form, FormError, FormState } from '../core/index';
import type { DomValue, RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';
import type { ReactiveFormOptions } from '../adapters/FormInput';

export type { RegisterOptions } from '../adapters/dom';

/**
 * Vue adapter가 form 생성 옵션에 더해 reactive external values를 받을 때 쓰는 옵션이다.
 *
 * @remarks
 * React 어댑터와 동일한 의미이지만, Vue의 반응형 모델에 맞춰 `values`를 `MaybeRefOrGetter<TValues | undefined>`로 받는다.
 * ref, computed, getter, 평면 값 모두 전달할 수 있으며 adapter는 defined reference 변화를 감지해 `form.reset()`을 호출한다.
 */
export type VueFormOptions<TValues> = ReactiveFormOptions<
  TValues,
  MaybeRefOrGetter<TValues | undefined>
>;

type VueBindingHandlers<TElement extends HTMLElement> = {
  /** Forward text input events into the form. */
  onInput: (event: Event) => void;
  /** Forward change events, including checked and selection state, into the form. */
  onChange: (event: Event) => void;
  /** Clear focus and mark the field touched. */
  onBlur: (event: FocusEvent) => void;
  /** Record focus for this field. */
  onFocus: (event: FocusEvent) => void;
};

/** `<input v-bind="useRegister(...)" />`에 바로 전달할 수 있는 기본 binding props다. */
export type VueInputRegisterProps = VueBindingHandlers<HTMLInputElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Input kind; checkbox and radio use checked semantics, otherwise defaults to text. */
  readonly type: string;
  /** Current field value. */
  readonly value?: string | number | string[];
  /** Whether this checkbox or radio represents the current field value. */
  readonly checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type VueSelectRegisterProps = VueBindingHandlers<HTMLSelectElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: DomValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type VueTextareaRegisterProps = VueBindingHandlers<HTMLTextAreaElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: string | number;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type VueCustomRegisterProps<TElement extends HTMLElement = HTMLElement> = VueBindingHandlers<TElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: unknown;
  /** Whether this checkbox or radio represents the current field value. */
  readonly checked?: boolean;
};

export type VueRegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 Vue DOM-event-compatible field binding props다. */
export type VueRegisterPropsForElement<TElement extends VueRegisterElement> = TElement extends HTMLSelectElement
  ? VueSelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? VueTextareaRegisterProps
    : TElement extends HTMLInputElement
      ? VueInputRegisterProps
      : VueCustomRegisterProps<TElement>;

export type VueRegisterProps = VueRegisterPropsForElement<VueRegisterElement>;

export type VueRegisterPropsList<TElement extends VueRegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? VueRegisterPropsForElement<TElement> : never;
};

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type VueFieldReturn<TProps extends VueRegisterProps = VueInputRegisterProps> = {
  /** Binding properties to spread onto the matching DOM control. */
  readonly props: TProps;
  /** Current field value. */
  readonly value: unknown;
  /** Replace the field value as a programmatic write. */
  setValue(value: unknown): void;
  /** Current validation errors for the field. */
  readonly errors: FormError[];
  /** Whether the current value differs from its default by Object.is. */
  readonly dirty: boolean;
  /** Whether the field has blurred at least once. */
  readonly touched: boolean;
};

/** form 전체 상태에서 Vue UI가 자주 쓰는 aggregate state다. */
export type VueFormStateReturn<TValues> = {
  /** Current immutable form snapshot. */
  readonly state: Readonly<FormState<TValues>>;
  /** Nonempty validation error lists indexed by normalized field path. */
  readonly errors: Record<string, FormError[]>;
  /** Normalized paths whose fields are dirty. */
  readonly dirtyFields: Record<string, true>;
  /** Normalized paths whose fields are touched. */
  readonly touchedFields: Record<string, true>;
  /** First focused field in entry order, or null; not necessarily the last focused field. */
  readonly focusedField: string | null;
  /** Whether at least one field is dirty. */
  readonly isDirty: boolean;
  /** Whether no field currently has recorded errors. */
  readonly isValid: boolean;
  /** Whether queued validation or a submit callback is still pending. */
  readonly isSubmitting: boolean;
  /** Whether a submission has completed at least once. */
  readonly isSubmitted: boolean;
  /** Whether the latest completed submission reached a successful valid callback. */
  readonly isSubmitSuccessful: boolean;
  /** Number of submission attempts started by the form. */
  readonly submitCount: number;
};

/** `useForm(form)`이 반환하는 form-bound composable 모음이다. */
export type VueForm<TValues> = {
  /** Core form instance shared by all bound helpers. */
  form: Form<TValues>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends VueRegisterElement = HTMLInputElement>(options: RegisterOptions): VueRegisterPropsForElement<TElement>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends VueRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): VueRegisterPropsList<TElement, TOptions>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends VueRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): VueRegisterPropsList<TElement, TOptions>;
  /** Create field bindings, reactive value and metadata, and a setter. */
  useField<TElement extends VueRegisterElement = HTMLInputElement>(options: RegisterOptions): VueFieldReturn<VueRegisterPropsForElement<TElement>>;
  /** Subscribe to form-wide errors and lifecycle aggregates. */
  useFormState(): VueFormStateReturn<TValues>;
  /** Create an event handler that prevents default submission before validating. */
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};

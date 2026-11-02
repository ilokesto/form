import type {
  ChangeEventHandler,
  FocusEventHandler,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  FormEvent,
} from 'react';
import type { FieldPathInput, FieldPathValue, FieldState, Form, FormError, FormState } from '../core/index';
import type { RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';
import type { ReactiveFormOptions } from '../adapters/FormInput';

export type { RegisterOptions } from '../adapters/dom';

/** React adapter가 form 생성 옵션에 더해 reactive external values를 받을 때 쓰는 옵션이다. */
export type ReactFormOptions<TValues> = ReactiveFormOptions<TValues, TValues | undefined>;

type InputValue = InputHTMLAttributes<HTMLInputElement>['value'];
type InputType = InputHTMLAttributes<HTMLInputElement>['type'];
type SelectValue = SelectHTMLAttributes<HTMLSelectElement>['value'];
type TextareaValue = TextareaHTMLAttributes<HTMLTextAreaElement>['value'];

type BindingHandlers<TElement extends HTMLElement> = {
  /** Forward change events, including checked and selection state, into the form. */
  onChange: ChangeEventHandler<TElement>;
  /** Clear focus and mark the field touched. */
  onBlur: FocusEventHandler<TElement>;
  /** Record focus for this field. */
  onFocus: FocusEventHandler<TElement>;
};

/** `<input {...useRegister(...)} />`에 바로 spread할 수 있는 기본 binding props다. */
export type InputRegisterProps = BindingHandlers<HTMLInputElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  name: string;
  /** Input kind; checkbox and radio use checked semantics, otherwise defaults to text. */
  type: InputType;
  /** Current field value. */
  value?: InputValue;
  /** Whether this checkbox or radio represents the current field value. */
  checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type SelectRegisterProps = BindingHandlers<HTMLSelectElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  name: string;
  /** Current field value. */
  value?: SelectValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type TextareaRegisterProps = BindingHandlers<HTMLTextAreaElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  name: string;
  /** Current field value. */
  value?: TextareaValue;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type CustomRegisterProps<TElement extends HTMLElement = HTMLElement> = BindingHandlers<TElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  name: string;
  /** Current field value. */
  value?: unknown;
  /** Whether this checkbox or radio represents the current field value. */
  checked?: boolean;
};

export type RegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 DOM-event-compatible field binding props다. */
export type RegisterPropsForElement<TElement extends RegisterElement> = TElement extends HTMLSelectElement
  ? SelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? TextareaRegisterProps
    : TElement extends HTMLInputElement
      ? InputRegisterProps
      : CustomRegisterProps<TElement>;

export type RegisterProps = RegisterPropsForElement<RegisterElement>;

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type UseFieldReturn<TProps extends RegisterProps = InputRegisterProps> = {
  /** Binding properties to spread onto the matching DOM control. */
  props: TProps;
  /** Current field value. */
  value: unknown;
  /** Replace the field value as a programmatic write. */
  setValue: (value: unknown) => void;
  /** Current validation errors for the field. */
  errors: FormError[];
  /** Whether the current value differs from its default by Object.is. */
  dirty: boolean;
  /** Whether the field has blurred at least once. */
  touched: boolean;
};

/** 한 field의 value와 meta를 form values 타입과 path에서 추론해 반환한다. */
export type UseFieldStateReturn<TValues, TName extends FieldPathInput> = Readonly<FieldState<FieldPathValue<TValues, TName>>>;

/** form 전체 상태에서 React UI가 자주 쓰는 aggregate state다. */
export type UseFormStateReturn<TValues> = {
  /** Current immutable form snapshot. */
  state: Readonly<FormState<TValues>>;
  /** Nonempty validation error lists indexed by normalized field path. */
  errors: Record<string, FormError[]>;
  /** Normalized paths whose fields are dirty. */
  dirtyFields: Record<string, true>;
  /** Normalized paths whose fields are touched. */
  touchedFields: Record<string, true>;
  /** First focused field in entry order, or null; not necessarily the last focused field. */
  focusedField: string | null;
  /** Whether at least one field is dirty. */
  isDirty: boolean;
  /** Whether no field currently has recorded errors. */
  isValid: boolean;
  /** Whether queued validation or a submit callback is still pending. */
  isSubmitting: boolean;
  /** Whether a submission has completed at least once. */
  isSubmitted: boolean;
  /** Whether the latest completed submission reached a successful valid callback. */
  isSubmitSuccessful: boolean;
  /** Number of submission attempts started by the form. */
  submitCount: number;
};

export type RegisterPropsList<TElement extends RegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? RegisterPropsForElement<TElement> : never;
};

/** `useForm(form)`이 반환하는 form-bound hook 모음이다. */
export type ReactForm<TValues> = {
  /** Core form instance shared by all bound helpers. */
  form: Form<TValues>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends RegisterElement = HTMLInputElement>(options: RegisterOptions): RegisterPropsForElement<TElement>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends RegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): RegisterPropsList<TElement, TOptions>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends RegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): RegisterPropsList<TElement, TOptions>;
  /** Create field bindings, reactive value and metadata, and a setter. */
  useField<TElement extends RegisterElement = HTMLInputElement>(options: RegisterOptions): UseFieldReturn<RegisterPropsForElement<TElement>>;
  /** Subscribe to a path-typed field snapshot. */
  useFieldState<const TName extends FieldPathInput>(name: TName): UseFieldStateReturn<TValues, TName>;
  /** Subscribe to form-wide errors and lifecycle aggregates. */
  useFormState(): UseFormStateReturn<TValues>;
  /** Create an event handler that prevents default submission before validating. */
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<FormEvent<HTMLFormElement>, TResult>;
};

import type { Accessor } from 'solid-js';
import type { Form, FormError, FormState } from '../core/index';
import type { DomValue, RegisterOptions, SubmitHandler, SubmitInvalidHandler, SubmitValidHandler } from '../adapters/dom';
import type { ReactiveFormOptions } from '../adapters/FormInput';

export type { RegisterOptions } from '../adapters/dom';

/** Solid owner가 외부 values accessor와 함께 form을 만들 때 쓰는 옵션이다. */
export type SolidFormOptions<TValues> = ReactiveFormOptions<
  TValues,
  Accessor<TValues | undefined>
>;

type SolidBindingHandlers<TElement extends HTMLElement> = {
  /** Forward text input events into the form. */
  onInput: (event: InputEvent & { /** DOM element that owns the event listener. */
  currentTarget: TElement }) => void;
  /** Forward change events, including checked and selection state, into the form. */
  onChange: (event: Event & { /** DOM element that owns the event listener. */
  currentTarget: TElement }) => void;
  /** Clear focus and mark the field touched. */
  onBlur: (event: FocusEvent & { /** DOM element that owns the event listener. */
  currentTarget: TElement }) => void;
  /** Record focus for this field. */
  onFocus: (event: FocusEvent & { /** DOM element that owns the event listener. */
  currentTarget: TElement }) => void;
};

/** `<input {...useRegister(...)} />`에 바로 spread할 수 있는 기본 binding props다. */
export type SolidInputRegisterProps = SolidBindingHandlers<HTMLInputElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Input kind; checkbox and radio use checked semantics, otherwise defaults to text. */
  readonly type: string;
  /** Current field value. */
  readonly value?: DomValue;
  /** Whether this checkbox or radio represents the current field value. */
  readonly checked?: boolean;
};

/** `useRegister<HTMLSelectElement>(...)`로 좁혀 `<select>`에 spread할 수 있는 binding props다. */
export type SolidSelectRegisterProps = SolidBindingHandlers<HTMLSelectElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: DomValue;
};

/** `useRegister<HTMLTextAreaElement>(...)`로 좁혀 `<textarea>`에 spread할 수 있는 binding props다. */
export type SolidTextareaRegisterProps = SolidBindingHandlers<HTMLTextAreaElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: string | number;
};

/** DOM-compatible custom component용 escape-hatch binding props다. */
export type SolidCustomRegisterProps<TElement extends HTMLElement = HTMLElement> = SolidBindingHandlers<TElement> & {
  /** DOM name string; tuple paths are JSON-serialized. */
  readonly name: string;
  /** Current field value. */
  readonly value?: unknown;
  /** Whether this checkbox or radio represents the current field value. */
  readonly checked?: boolean;
};

export type SolidRegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

/** element generic에 맞춘 Solid DOM-event-compatible field binding props다. */
export type SolidRegisterPropsForElement<TElement extends SolidRegisterElement> = TElement extends HTMLSelectElement
  ? SolidSelectRegisterProps
  : TElement extends HTMLTextAreaElement
    ? SolidTextareaRegisterProps
    : TElement extends HTMLInputElement
      ? SolidInputRegisterProps
      : SolidCustomRegisterProps<TElement>;

export type SolidRegisterProps = SolidRegisterPropsForElement<SolidRegisterElement>;

export type SolidRegisterPropsList<TElement extends SolidRegisterElement, TOptions extends readonly RegisterOptions[]> = {
  [Index in keyof TOptions]: TOptions[Index] extends RegisterOptions ? SolidRegisterPropsForElement<TElement> : never;
};

/** 한 field의 binding, value, meta, setter를 함께 제공한다. */
export type SolidFieldReturn<TProps extends SolidRegisterProps = SolidInputRegisterProps> = {
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

/** form 전체 상태에서 Solid UI가 자주 쓰는 aggregate state다. */
export type SolidFormStateReturn<TValues> = {
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

/** `useForm(form)`이 반환하는 form-bound helper 모음이다. */
export type SolidForm<TValues> = {
  /** Core form instance shared by all bound helpers. */
  form: Form<TValues>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement>(options: RegisterOptions): SolidRegisterPropsForElement<TElement>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
  /** Create one binding or an ordered list from single, array, or variadic options. */
  useRegister<TElement extends SolidRegisterElement = HTMLInputElement, TOptions extends readonly RegisterOptions[] = readonly RegisterOptions[]>(...options: TOptions): SolidRegisterPropsList<TElement, TOptions>;
  /** Create field bindings, reactive value and metadata, and a setter. */
  useField<TElement extends SolidRegisterElement = HTMLInputElement>(options: RegisterOptions): SolidFieldReturn<SolidRegisterPropsForElement<TElement>>;
  /** Subscribe to form-wide errors and lifecycle aggregates. */
  useFormState(): SolidFormStateReturn<TValues>;
  /** Create an event handler that prevents default submission before validating. */
  handleSubmit<TResult>(onValid: SubmitValidHandler<TValues, TResult>, onInvalid?: SubmitInvalidHandler): SubmitHandler<Event, TResult>;
};

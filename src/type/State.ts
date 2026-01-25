import type { ExtractKeys, InitState, StoreValue } from ".";

export type State<T extends InitState, BasicReturnType> = {
  (): T & { [x: string]: BasicReturnType | undefined };
  <K extends ExtractKeys<T>>(name: K): T[K];
  (name: string): BasicReturnType | undefined;
}

export type FieldStateValue = {
  value: StoreValue | undefined;
  error: string;
  touched: boolean;
  dirty: boolean;
  isValid: boolean;
}

export type FieldState<T extends InitState, K extends ExtractKeys<T> = ExtractKeys<T>> = Omit<FieldStateValue, "value"> & {
  value: T[K];
}

export type AllFieldsState<T extends InitState> = {
  [K in ExtractKeys<T>]: FieldState<T, K>;
}

export type TUseFields<T extends InitState> = {
  (): AllFieldsState<T>;
  <K extends ExtractKeys<T>>(name: K): FieldState<T, K>;
  (name: string): FieldStateValue;
}

import type { Resolver } from "@ilokesto/common-resolver/types";
import type { InitState, StoreValue } from "./Base";
import type { Validator } from "./Validate";

export interface IStore<T> {
  getStore: () => T;
  setStore: {
    (nextState: Partial<T> & { [x: string]: StoreValue }): void;
  };
  subscribe: (cb: () => void) => () => boolean;
}

export type InitObject<T extends InitState> = {
  initValue?: T
  resolver?: Resolver<T>
  validator?: Validator<T>
  validateOn?: Array<'blur' | 'submit' | 'change'>
  clearFormOn?: Array<'submit' | 'routeChange'>
}

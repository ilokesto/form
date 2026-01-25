import type { Resolver } from "@ilokesto/common-resolver/types";
import type { ExtractKeys, RegisterErrorObj, Validator, ValidInputTypes } from ".";
import type { IRegister } from "../funcs/register/Register";

export interface IStore<T> {
  getStore: () => T;
  setStore: {
    (nextState: Partial<T> & { [x: string]: StoreValue }): void;
  };
  subscribe: (cb: () => void) => () => boolean;
}

export type StoreValue = string | boolean | FileList;

export type InitState = {
  [x: string]: StoreValue;
};

export type InitObject<T extends InitState> = {
  initValue?: T
  resolver?: Resolver<T>
  validator?: Validator<T>
  validateOn?: Array<'blur' | 'submit' | 'change'>
  clearFormOn?: Array<'submit' | 'routeChange'>
}

export type SicilianEvent = { target: { name: string; value: string, type?: string, checked?: boolean, files?: FileList | null } };


type RegisterOptions<T extends InitState> = {
  validate?: RegisterErrorObj<T>
  type?: Exclude<ValidInputTypes, "radio">
}

type RegisterRadioOptions<T extends InitState> = {
  validate?: RegisterErrorObj<T>
  type: "radio"
  value: string
}

export type TRegister<T extends InitState> = {
  <K extends ExtractKeys<T>>(name: K, options?: RegisterOptions<T>): IRegister<T>
  <K extends ExtractKeys<T>>(name: K, options: RegisterRadioOptions<T>): IRegister<T>
  (name: string, options?: RegisterOptions<T>): IRegister<T>
  (name: string, options: RegisterRadioOptions<T>): IRegister<T>
}

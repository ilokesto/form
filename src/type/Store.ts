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


export type TRegister<T extends InitState> = {
  // radio 타입일 경우 - ExtractKeys<T> 버전
  <K extends ExtractKeys<T>>(params: { name: K; validate?: RegisterErrorObj<T>; type: 'radio'; value: string}): IRegister<T>,
  // radio 타입이 아닌 경우 - ExtractKeys<T> 버전
  <K extends ExtractKeys<T>>(params: { name: K; validate?: RegisterErrorObj<T>; type?: Exclude<ValidInputTypes, 'radio'> }): IRegister<T>,
  
  // radio 타입일 경우 - string 버전
  (params: { name: string; validate?: RegisterErrorObj<T>; type: 'radio'; value: string }): IRegister<T>,
  // radio 타입이 아닌 경우 - string 버전
  (params: { name: string; validate?: RegisterErrorObj<T>; type?: Exclude<ValidInputTypes, 'radio'> }): IRegister<T>;
}

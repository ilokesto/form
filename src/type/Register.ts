import type { ExtractKeys, InitState, ValidInputTypes } from "./Base";
import type { RegisterErrorObj } from "./Validate";
import type { IRegister } from "../funcs/register/Register";

export type RegisterOptions<T extends InitState> = {
  validate?: RegisterErrorObj<T>
  type?: Exclude<ValidInputTypes, "radio">
}

export type RegisterRadioOptions<T extends InitState> = {
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

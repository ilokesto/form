import type { Resolver } from "@ilokesto/common-resolver/types";
import { useEffect, type FormEvent } from "react";
import { HandleServerAction } from "../funcs/handleSubmit/HandleServerAction";
import { HandleSubmit } from "../funcs/handleSubmit/HandleSubmit";
import { HandleSubmitBuilder } from "../funcs/handleSubmit/HandleSubmitBuilder";
import type { IRegister } from "../funcs/register/Register";
import { RegisterBuilder } from "../funcs/register/RegisterBuilder";
import { RegisterOnBlur } from "../funcs/register/RegisterOnBlur";
import { RegisterOnChange } from "../funcs/register/RegisterOnChange";
import { RegisterOnFocus } from "../funcs/register/RegisterOnFocus";
import { Validate } from "../funcs/validate/Validate";
import type { ExtractKeys, InitObject, InitState, IStore, RegisterErrorObj, State, StoreValue, TRegister, Validator, ValidInputTypes } from "../type";
import { getObjByKeys } from "../utils/getObjByKeys";
import { SyncState } from "../utils/SyncState";
import { Store } from "./Store";

export class CreateForm<T extends InitState> {
  // Store 
  private ValueStore: IStore<T>
  private ErrorStore: IStore<T>
  private ErrorObjStore: IStore<Validator<T>>

  private resolver: Resolver<T>| undefined

  // Config
  private validateOn: InitObject<T>["validateOn"]
  private clearFormOn: InitObject<T>["clearFormOn"]

  // Public
  public useValues: State<T, StoreValue>;
  public useErrors: State<{ [key in keyof T]: string }, string>;
  public setValues: IStore<T>["setStore"];
  public setErrors: IStore<{ [key in keyof T]: string }>["setStore"];
  public initValue: T
  public clearForm: () => void

  private getDefaultValue = (type: ValidInputTypes): StoreValue | undefined => {
    if (type === "checkbox") return false
    if (type === "radio") return ""
    if (type === "file") return undefined
    return ""
  }

  private useStoreDefaultValue = (name: ExtractKeys<T> | string, storeDefaultValue: StoreValue | undefined) =>
    useEffect(() => {
      if (storeDefaultValue === undefined) return
      const storeValue = this.ValueStore.getStore()[name as ExtractKeys<T>]
      if (storeValue === undefined) {
        this.ValueStore.setStore({ [name]: storeDefaultValue } as unknown as Partial<T> & { [x: string]: StoreValue })
      }
    }, [name, storeDefaultValue])

  private createValidate = () =>
    new Validate(
      this.ValueStore,
      this.ErrorObjStore,
      this.ErrorStore.setStore,
      this.resolver
    )

  private buildRegister = (props: {
    name: ExtractKeys<T> | string
    validate?: RegisterErrorObj<T>
    type: ValidInputTypes
    value?: string
    inputValue: T[ExtractKeys<T>]
  }) =>
    new RegisterBuilder(props.name, props.value, this.ErrorObjStore, this.clearForm, props.validate, this.clearFormOn)
      .setRegisterOnChange(new RegisterOnChange(
        this.validateOn,
        this.ValueStore.setStore,
        this.ErrorStore.setStore,
        this.createValidate()
      ))
      .setRegisterOnFocus(new RegisterOnFocus(this.ErrorStore.setStore))
      .setRegisterOnBlur(new RegisterOnBlur(
        this.validateOn,
        this.createValidate()
      ))
      .setValue(props.inputValue)
      .setType(props.type)
      .build()

  constructor(props?: InitObject<T>) {
    const { initValue = {} as T, validator, resolver, validateOn, clearFormOn } = props ?? {}

    this.ValueStore = new Store(initValue)
    this.ErrorStore = new Store(getObjByKeys(initValue, ""))
    this.ErrorObjStore = new Store(validator ?? {})
    this.resolver = resolver;
    this.validateOn = validateOn ?? []
    this.clearFormOn = clearFormOn ?? []
    this.useValues = (name?: ExtractKeys<T> | string) => SyncState.doSync(this.ValueStore, name)
    this.useErrors = (name?: ExtractKeys<T> | string) => SyncState.doSync(this.ErrorStore, name)
    this.setValues = this.ValueStore.setStore
    this.setErrors = this.ErrorStore.setStore as IStore<{ [key in keyof T]: string }>["setStore"]
    this.initValue = initValue
    this.clearForm = () => {
      this.setValues(this.initValue)
      this.setErrors(getObjByKeys(this.initValue, ""))
    }
  }

  public useRegister : TRegister<T> = ({ name, validate, type = "text", value }: {name: ExtractKeys<T> | string, validate?: RegisterErrorObj<T>, type?: ValidInputTypes, value?: string}): IRegister<T> => {
    const currentValue = this.useValues(name) as T[ExtractKeys<T>] | undefined
    const storeDefaultValue = this.getDefaultValue(type)
    const inputValue = (currentValue ?? storeDefaultValue ?? "") as T[ExtractKeys<T>]

    this.useStoreDefaultValue(name, storeDefaultValue)

    return this.buildRegister({ name, validate, type, value, inputValue })
  }

  public handleSubmit = (SubmitFn: (data: T, event?: FormEvent) => (Promise<unknown> | unknown)) => (e: FormEvent) =>
    new HandleSubmitBuilder<T>()
      .setHandleSubmit(HandleSubmit)
      .setValueStore(this.ValueStore)
      .setErrorStore(this.ErrorStore)
      .setClearForm(this.clearForm)
      .setClearFormOn(this.clearFormOn)
      .setSubmitFn(SubmitFn)
      .setValidateOn(this.validateOn)
      .build()
      .doHandle(e)

  public handleServerAction = (SubmitFn: (data: T) => (Promise<unknown> | unknown)) => () =>
    new HandleSubmitBuilder<T>()
      .setHandleSubmit(HandleServerAction)
      .setValueStore(this.ValueStore)
      .setErrorStore(this.ErrorStore)
      .setClearForm(this.clearForm)
      .setClearFormOn(this.clearFormOn)
      .setSubmitFn(SubmitFn)
      .setValidateOn(this.validateOn)
      .build()
      .doHandle()
}

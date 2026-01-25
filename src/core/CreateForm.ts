import type { Resolver } from "@ilokesto/common-resolver/types";
import { useEffect, type FormEvent } from "react";
import type { IRegister } from "../funcs/register/Register";
import type { ExtractKeys, FieldMeta, FieldState, InitObject, InitState, IStore, RegisterErrorObj, StoreValue, TRegister, TUseFields, Validator, ValidInputTypes } from "../type";
import { HandleServerAction } from "../funcs/handleSubmit/HandleServerAction";
import { HandleSubmit } from "../funcs/handleSubmit/HandleSubmit";
import { HandleSubmitBuilder } from "../funcs/handleSubmit/HandleSubmitBuilder";
import { RegisterBuilder } from "../funcs/register/RegisterBuilder";
import { RegisterOnBlur } from "../funcs/register/RegisterOnBlur";
import { RegisterOnChange } from "../funcs/register/RegisterOnChange";
import { RegisterOnFocus } from "../funcs/register/RegisterOnFocus";
import { Validate } from "../funcs/validate/Validate";
import { getObjByKeys } from "../utils/getObjByKeys";
import { SyncState } from "../utils/SyncState";
import { FieldMetaStore } from "./FieldMetaStore";
import { Store } from "./Store";

export class CreateForm<T extends InitState> {
  // Store 
  private ValueStore: IStore<T>
  private ErrorStore: IStore<T>
  private ErrorObjStore: IStore<Validator<T>>
  private FieldMetaStore: FieldMetaStore<T>

  private resolver: Resolver<T>| undefined

  // Config
  private validateOn: InitObject<T>["validateOn"]
  private clearFormOn: InitObject<T>["clearFormOn"]

  // Public
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

  public useFields: TUseFields<T> = ((name?: ExtractKeys<T> | string) => {
    if (name) {
      const value = SyncState.doSync(this.ValueStore, name) as StoreValue | undefined
      const error = SyncState.doSync(this.ErrorStore, name) as string | undefined
      const meta = SyncState.doSync<Record<string, FieldMeta>>(this.FieldMetaStore, name) as FieldMeta | undefined

      return {
        value,
        error: error ?? "",
        touched: meta?.touched ?? false,
        dirty: meta?.dirty ?? false,
        isValid: meta?.isValid ?? true
      }
    }

    const values = SyncState.doSync(this.ValueStore) as T
    const errors = SyncState.doSync(this.ErrorStore) as Partial<Record<ExtractKeys<T>, string>>
    const metas = SyncState.doSync<Record<string, FieldMeta>>(this.FieldMetaStore)
    const result = {} as { [K in ExtractKeys<T>]: FieldState<T, K> }

    Object.keys(values).forEach((key) => {
      const fieldKey = key as ExtractKeys<T>
      const meta = metas[fieldKey]

      result[fieldKey] = {
        value: values[fieldKey],
        error: errors[fieldKey] ?? "",
        touched: meta?.touched ?? false,
        dirty: meta?.dirty ?? false,
        isValid: meta?.isValid ?? true
      }
    })

    return result
  }) as TUseFields<T>

  private setErrorStoreWithValidityUpdate: IStore<T>["setStore"] = (nextState) => {
    this.ErrorStore.setStore(nextState)

    Object.keys(nextState).forEach((name) => {
      const errorValue = nextState[name as ExtractKeys<T>]
      this.FieldMetaStore.updateField(name, { isValid: errorValue === "" })
    })
  }

  private createValidate = () =>
    new Validate(
      this.ValueStore,
      this.ErrorObjStore,
      this.setErrorStoreWithValidityUpdate,
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
        this.setErrorStoreWithValidityUpdate,
        this.FieldMetaStore.updateField,
        this.createValidate()
      ))
      .setRegisterOnFocus(new RegisterOnFocus(this.setErrorStoreWithValidityUpdate))
      .setRegisterOnBlur(new RegisterOnBlur(
        this.validateOn,
        this.FieldMetaStore.updateField,
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
    this.FieldMetaStore = new FieldMetaStore(initValue)
    this.resolver = resolver;
    this.validateOn = validateOn ?? []
    this.clearFormOn = clearFormOn ?? []
    this.setValues = this.ValueStore.setStore
    this.setErrors = this.setErrorStoreWithValidityUpdate as IStore<{ [key in keyof T]: string }>["setStore"]
    this.initValue = initValue
    this.clearForm = () => {
      this.setValues(this.initValue)
      this.setErrors(getObjByKeys(this.initValue, ""))
      this.FieldMetaStore.reset()
    }
  }

  public useRegister : TRegister<T> = (name: ExtractKeys<T> | string, options?: { validate?: RegisterErrorObj<T>; type?: ValidInputTypes; value?: string }): IRegister<T> => {
    const { validate, type = "text", value } = options ?? {}
    this.FieldMetaStore.ensureField(name)
    const currentValue = SyncState.doSync(this.ValueStore, name) as T[ExtractKeys<T>] | undefined
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

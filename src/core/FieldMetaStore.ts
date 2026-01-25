import type { ExtractKeys, InitState } from "../type";
import type { FieldMeta } from "../type/FieldMeta";
import { Store } from "./Store";

export class FieldMetaStore<T extends InitState> extends Store<Record<string, FieldMeta>> {
  private initialMeta: Record<string, FieldMeta>

  constructor(initState: T) {
    const initialMeta = FieldMetaStore.buildInitialMeta(initState)
    super(initialMeta)
    this.initialMeta = initialMeta
  }

  private static buildInitialMeta = <T extends InitState>(initState: T) => {
    const initialMeta: Record<string, FieldMeta> = {}

    Object.keys(initState).forEach((key) => {
      initialMeta[key] = FieldMetaStore.getDefaultMeta()
    })

    return initialMeta
  }

  private static getDefaultMeta = (): FieldMeta => ({
    touched: false,
    dirty: false,
    isValid: true
  })

  public ensureField = (name: ExtractKeys<T> | string) => {
    const current = this.getStore()
    if (current[name]) return

    const defaultMeta = FieldMetaStore.getDefaultMeta()
    this.initialMeta = { ...this.initialMeta, [name]: defaultMeta }
    this.setStore({ [name]: defaultMeta })
  }

  public updateField = (name: ExtractKeys<T> | string, nextMeta: Partial<FieldMeta>) => {
    const current = this.getStore()[name] ?? FieldMetaStore.getDefaultMeta()
    this.setStore({ [name]: { ...current, ...nextMeta } })
  }

  public reset = () => {
    this.setStore({ ...this.initialMeta })
  }
}

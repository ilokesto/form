import type { FieldMeta, InitObject, InitState, IStore, IValidate, SicilianEvent, StoreValue } from "../../type";

export interface IRegisterOnChange {
  onChange: (e: SicilianEvent) => void
}

export class RegisterOnChange<T extends InitState> implements IRegisterOnChange {
  constructor(
    private validateOn: InitObject<T>["validateOn"],
    private setValueStore: IStore<T>["setStore"],
    private setErrorStore: IStore<T>["setStore"],
    private updateFieldMeta: (name: string, nextMeta: Partial<FieldMeta>) => void,
    private validate: IValidate
  ) {}

  public onChange = (e: SicilianEvent) => {
    const { target: { name, value, type, checked, files }} = e
    if (type === "checkbox") {
      this.setValueStore({ [name] : checked } as Partial<T> & { [x: string]: StoreValue  });
    } else if (type === "file") {
      this.setValueStore({ [name] : files } as Partial<T> & { [x: string]: StoreValue  });
    } else {
      this.setValueStore({ [name] : value } as Partial<T> & { [x: string]: StoreValue  });
    }

    this.updateFieldMeta(name, { dirty: true })
    this.validateOn?.includes("change") && this.setErrorStore({ [name]: "" } as Partial<T> & { [x: string]: StoreValue });
    this.validateOn?.includes("change") && this.validate.doValidate(e);
  }
}

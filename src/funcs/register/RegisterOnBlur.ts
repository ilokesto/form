import type { FieldMeta, InitObject, InitState, IValidate, SicilianEvent } from "../../type"

export interface IRegisterOnBlur {
  onBlur: (e: SicilianEvent) => void
}

export class RegisterOnBlur<T extends InitState> implements IRegisterOnBlur {
  constructor(
    private validateOn: InitObject<T>["validateOn"],
    private updateFieldMeta: (name: string, nextMeta: Partial<FieldMeta>) => void,
    private validate: IValidate,
  ) {}

  public onBlur = (e: SicilianEvent) => {
    this.updateFieldMeta(e.target.name, { touched: true })
    this.validateOn?.includes("blur") ? this.validate.doValidate(e) : undefined
  }
}

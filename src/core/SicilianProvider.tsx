import { createContext, useContext, type ReactElement } from "react"
import type { ExtractKeys, InitState, RegisterErrorObj, TRegister, TUseFields, ValidInputTypes } from "../type"

export type SicilianProviderProps<T extends InitState> = {
  children: ReactElement,
  value: {
    useRegister: TRegister<T> ,
    name: ExtractKeys<T>,
    validate?: RegisterErrorObj<T>,
    type?: ValidInputTypes,
    useFields?: TUseFields<T>,
  }
}

const SicilianErrorHeader = "🚨 Sicilian Error : "
const SicilianError = (text: string) => SicilianErrorHeader + `${text} property has not been passed to the SicilianProvider, but you are trying to use the ${text} function.`
const polyfillWithErrorMessage = (errorMessage: string) => () => { throw new Error(SicilianError(errorMessage)) }
const getContextErrorMessage = () => { throw new Error(SicilianErrorHeader + 'useSicilianContext must be used within a SicilianProvider') }

const Context = createContext<SicilianProviderProps<any>["value"] | undefined>(undefined)

export const SicilianProvider = <T extends InitState>({ children, value }: SicilianProviderProps<T>) => <Context.Provider value={{
  ...value,
  useFields: value.useFields ?? polyfillWithErrorMessage("useFields")
}}>
  {children}
</Context.Provider>

export const useSicilianContext = () => useContext(Context) as Required<SicilianProviderProps<InitState>["value"]> ?? getContextErrorMessage()

export type ExtractKeys<T> = Extract<keyof T, string>

export type StoreValue = string | boolean | FileList

export type InitState = {
  [x: string]: StoreValue;
}

export type ValidInputTypes =
  | "button"
  | "checkbox"
  | "color"
  | "date"
  | "datetime-local"
  | "email"
  | "file"
  | "hidden"
  | "image"
  | "month"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "reset"
  | "search"
  | "submit"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week"

export type SicilianEvent = {
  target: {
    name: string
    value: string
    type?: string
    checked?: boolean
    files?: FileList | null
  }
}

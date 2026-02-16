export interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  color?: string;
}

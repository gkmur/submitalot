"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants";

interface SelectDropdownProps {
  name: FormFieldName;
  label: string;
  options: string[];
  required?: boolean;
  placeholder?: string;
}

export function SelectDropdown({ name, label, options, required, placeholder }: SelectDropdownProps) {
  const { register, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {helper && <p className="field-helper">{helper}</p>}
      <select id={name} className="select" {...register(name)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

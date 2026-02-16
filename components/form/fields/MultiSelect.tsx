"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface MultiSelectProps {
  name: FormFieldName;
  label: string;
  options: string[];
  required?: boolean;
}

export function MultiSelect({ name, label, options, required }: MultiSelectProps) {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const selected = (watch(name) as string[]) || [];
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
    setValue(name, next as never, { shouldValidate: true });
  }

  return (
    <div className="field-group">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div className="radio-group">
        {options.map((opt) => (
          <div className="radio-pill radio-pill--multi" key={opt}>
            <input
              type="checkbox"
              id={`${name}-${opt}`}
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            <label htmlFor={`${name}-${opt}`}>
              {opt}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants";

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
      <div className="checkbox-group">
        {options.map((opt) => (
          <label key={opt} className="checkbox-item">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

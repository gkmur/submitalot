"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import type { RadioOption } from "@/lib/constants/shared";
import { HELPER_TEXT } from "@/lib/constants/form";

interface RadioGroupProps {
  name: FormFieldName;
  label: string;
  options: RadioOption[];
  required?: boolean;
  onChange?: (value: string) => void;
}

export function RadioGroup({ name, label, options, required, onChange }: RadioGroupProps) {
  const { register, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];
  const registration = register(name);

  return (
    <div className="field-group" data-field-name={name}>
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div className="radio-group">
        {options.map((opt) => (
          <div className="radio-pill" key={opt.value}>
            <input
              type="radio"
              id={`${name}-${opt.value}`}
              value={opt.value}
              {...registration}
              onChange={(e) => {
                registration.onChange(e);
                onChange?.(e.target.value);
              }}
            />
            <label
              htmlFor={`${name}-${opt.value}`}
              style={opt.color ? { "--pill-color": opt.color } as React.CSSProperties : undefined}
            >
              {opt.label}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

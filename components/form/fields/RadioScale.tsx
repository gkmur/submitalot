"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import type { RadioOption } from "@/lib/constants";
import { HELPER_TEXT } from "@/lib/constants";

interface RadioScaleProps {
  name: FormFieldName;
  label: string;
  options: RadioOption[];
  required?: boolean;
}

export function RadioScale({ name, label, options, required }: RadioScaleProps) {
  const { register, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  return (
    <div className="field-group">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div className="segment-group">
        {options.map((opt, i) => (
          <div
            className={`segment-item${i === 0 ? " segment-item--first" : ""}${i === options.length - 1 ? " segment-item--last" : ""}`}
            key={opt.value}
          >
            <input
              type="radio"
              id={`${name}-${opt.value}`}
              value={opt.value}
              {...register(name)}
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

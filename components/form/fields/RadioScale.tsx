"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import type { RadioOption } from "@/lib/constants/shared";
import { HELPER_TEXT } from "@/lib/constants/form";

interface RadioScaleProps {
  name: FormFieldName;
  label: string;
  options: RadioOption[];
  required?: boolean;
  helperText?: string;
  legendLow?: string;
  legendHigh?: string;
  wrapLabels?: boolean;
  showSelectedDefinition?: boolean;
}

export function RadioScale({
  name,
  label,
  options,
  required,
  helperText,
  legendLow,
  legendHigh,
  wrapLabels,
  showSelectedDefinition,
}: RadioScaleProps) {
  const { register, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = helperText ?? HELPER_TEXT[name];
  const error = errors[name];
  const selectedValue = watch(name);
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <div className="field-group">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      {(legendLow || legendHigh) && (
        <div className="scale-legend" aria-hidden="true">
          <span>{legendLow}</span>
          <span>{legendHigh}</span>
        </div>
      )}
      <div className={`segment-group${wrapLabels ? " segment-group--wrap" : ""}`}>
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
              title={opt.value}
            >
              {opt.label}
            </label>
          </div>
        ))}
      </div>
      {showSelectedDefinition && selectedOption && (
        <p className="field-helper field-helper--selected">
          Selected: {selectedOption.value}
        </p>
      )}
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

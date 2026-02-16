"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface TextAreaProps {
  name: FormFieldName;
  label: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ name, label, required, placeholder, rows = 3 }: TextAreaProps) {
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
      <textarea
        id={name}
        className="textarea"
        placeholder={placeholder}
        rows={rows}
        {...register(name)}
      />
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

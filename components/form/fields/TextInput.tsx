"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface TextInputProps {
  name: FormFieldName;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "number";
  className?: string;
}

export function TextInput({ name, label, required, placeholder, type = "text", className }: TextInputProps) {
  const { register, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  return (
    <div className={`field-group ${className ?? ""}`}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {helper && <p className="field-helper">{helper}</p>}
      <input
        id={name}
        type={type}
        className={`input ${type === "number" ? "number-input" : ""}`}
        placeholder={placeholder}
        {...register(name, { valueAsNumber: type === "number" })}
      />
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

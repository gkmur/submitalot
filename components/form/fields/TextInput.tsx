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
  const message = formatFieldError(error?.message, type);

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
        {...register(name, {
          setValueAs:
            type === "number"
              ? (value) => {
                  if (value === "" || value == null) return undefined;
                  const parsed = Number(value);
                  return Number.isFinite(parsed) ? parsed : undefined;
                }
              : undefined,
        })}
      />
      {error && <p className="field-error">{message}</p>}
    </div>
  );
}

function formatFieldError(
  raw: unknown,
  type: TextInputProps["type"]
) {
  const message = typeof raw === "string" ? raw : "Invalid input";
  if (type !== "number") return message;
  if (/expected number/i.test(message) || /received nan/i.test(message)) {
    return "Enter a valid number.";
  }
  return message;
}

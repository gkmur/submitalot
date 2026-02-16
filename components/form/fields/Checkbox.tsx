"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface CheckboxProps {
  name: FormFieldName;
  label: string;
}

export function Checkbox({ name, label }: CheckboxProps) {
  const { register } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];

  return (
    <div className="field-group">
      <label className="toggle-field">
        <ToggleSwitch name={name} />
        <span className="field-label" style={{ margin: 0 }}>{label}</span>
      </label>
      {helper && <p className="field-helper">{helper}</p>}
    </div>
  );
}

function ToggleSwitch({ name }: { name: FormFieldName }) {
  const { watch, setValue } = useFormContext<ItemizationFormData>();
  const checked = watch(name) as boolean;

  return (
    <button
      type="button"
      className={`toggle ${checked ? "active" : ""}`}
      role="switch"
      aria-checked={checked}
      onClick={() => setValue(name, !checked as never, { shouldValidate: true })}
    />
  );
}

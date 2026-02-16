"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";

export interface SectionDef {
  id: string;
  title: string;
  requiredFields: FormFieldName[];
}

interface FormStepperProps {
  sections: SectionDef[];
  currentSection: number;
  onGoTo: (index: number) => void;
}

type SectionStatus = "empty" | "complete" | "error";

function useSectionStatus(section: SectionDef): SectionStatus {
  const { formState, control } = useFormContext<ItemizationFormData>();
  const { errors } = formState;
  const watchedValues = useWatch({
    control,
    name: section.requiredFields,
  });
  const values = Array.isArray(watchedValues) ? watchedValues : [watchedValues];

  const hasErrors = section.requiredFields.some(
    (f) => errors[f as keyof ItemizationFormData]
  );
  if (hasErrors) return "error";

  const allFilled = values.every((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return true;
    return !!value;
  });

  if (allFilled && section.requiredFields.length > 0) return "complete";
  return "empty";
}

function StepItem({
  section,
  index,
  isActive,
  isLast,
  onGoTo,
}: {
  section: SectionDef;
  index: number;
  isActive: boolean;
  isLast: boolean;
  onGoTo: (i: number) => void;
}) {
  const status = useSectionStatus(section);

  return (
    <li className="step-item">
      <button
        type="button"
        className={`step-link${isActive ? " step-active" : ""}`}
        onClick={() => onGoTo(index)}
        aria-current={isActive ? "step" : undefined}
      >
        <span className={`step-indicator step-indicator--${status}`} aria-hidden="true">
          {status === "complete" ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : status === "error" ? (
            <span className="step-indicator-warning">!</span>
          ) : (
            <span className="step-indicator-dot" />
          )}
        </span>
        <span className="step-label">{section.title}</span>
      </button>
      {!isLast && <div className="step-connector" aria-hidden="true" />}
    </li>
  );
}

export function FormStepper({ sections, currentSection, onGoTo }: FormStepperProps) {
  return (
    <nav className="form-stepper" aria-label="Form sections">
      <ol className="step-list">
        {sections.map((section, i) => (
          <StepItem
            key={section.id}
            section={section}
            index={i}
            isActive={i === currentSection}
            isLast={i === sections.length - 1}
            onGoTo={onGoTo}
          />
        ))}
      </ol>
    </nav>
  );
}

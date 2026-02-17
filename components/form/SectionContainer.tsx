"use client";

import { useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, SectionId } from "@/lib/types";
import { SECTION_FIELD_MAP } from "@/lib/constants/form";
import { focusFieldByName } from "@/lib/focus-field";

interface SectionContainerProps {
  isActive: boolean;
  direction: "forward" | "backward";
  children: React.ReactNode;
  sectionId: SectionId;
  title: string;
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const maybe = error as { message?: unknown };
  return typeof maybe.message === "string" && maybe.message ? maybe.message : null;
}

export function SectionContainer({
  isActive,
  direction,
  children,
  sectionId,
  title,
}: SectionContainerProps) {
  const { formState: { errors } } = useFormContext<ItemizationFormData>();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionFields = SECTION_FIELD_MAP[sectionId] as readonly FormFieldName[];
  const sectionErrors = sectionFields.flatMap((fieldName) => {
    const message = getErrorMessage(errors[fieldName]);
    if (!message) return [];
    return [{ fieldName, message }];
  });

  useEffect(() => {
    if (isActive && containerRef.current) {
      const heading = containerRef.current.querySelector<HTMLElement>(".section-heading");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="section-container"
      data-direction={direction}
      role="region"
      aria-label={title}
      id={`section-${sectionId}`}
      hidden={!isActive}
      inert={!isActive ? true : undefined}
    >
      {isActive && sectionErrors.length > 0 && (
        <div className="section-error-summary" role="alert" aria-live="polite">
          <p className="section-error-summary-title">Fix these fields to continue:</p>
          <ul className="section-error-summary-list">
            {sectionErrors.map((entry) => (
              <li key={entry.fieldName}>
                <button
                  type="button"
                  onClick={() => {
                    focusFieldByName(entry.fieldName);
                  }}
                >
                  {entry.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </div>
  );
}

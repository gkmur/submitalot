"use client";

import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { itemizationSchema } from "@/lib/schema";
import { FORM_DEFAULTS, SECTION_FIELD_MAP } from "@/lib/constants/form";
import type { ItemizationFormData, FormFieldName, SectionId, LinkedRecord } from "@/lib/types";
import { saveHistory, saveTemplate, buildCarryForwardValues, isStorageAvailable, type StoredSubmission, type LinkedRecordFieldName, type HistoryEntry, type Template } from "@/lib/storage";
import { scrubOrphanedFields } from "@/lib/conditional-logic";
import { HistoryDrawer } from "./HistoryDrawer";

import { FormStepper, type SectionDef } from "./FormStepper";
import { SectionContainer } from "./SectionContainer";

import { PrimaryDetails } from "./sections/PrimaryDetails";
import { GradingDetails } from "./sections/GradingDetails";
import { InventoryDetails } from "./sections/InventoryDetails";
import { LocationSection } from "./sections/LocationSection";
import { LogisticsSection } from "./sections/LogisticsSection";
import { PricingSection } from "./sections/PricingSection";
import { RestrictionsListing } from "./sections/RestrictionsListing";

const SECTION_DEFS: (SectionDef & { id: SectionId })[] = [
  { id: "primary", title: "Primary Details", requiredFields: ["brandPartner", "seller", "inventoryFile", "inventoryType"] as FormFieldName[] },
  { id: "grading", title: "Grading Details", requiredFields: ["productAssortment", "inventoryCondition", "overallListingRating"] as FormFieldName[] },
  { id: "inventory", title: "Inventory Details", requiredFields: ["categoryGroups", "inventoryExclusivity", "paperwork"] as FormFieldName[] },
  { id: "location", title: "Location", requiredFields: ["region"] as FormFieldName[] },
  { id: "logistics", title: "Logistics", requiredFields: ["minimumOrder", "packagingType", "inventoryAvailability", "fobOrExw"] as FormFieldName[] },
  { id: "pricing", title: "Pricing", requiredFields: ["currencyType", "inlandFreight", "marginTakeRate", "priceColumns", "maxPercentOffAsking"] as FormFieldName[] },
  { id: "restrictions", title: "Restrictions & Listing", requiredFields: ["listingDisaggregation"] as FormFieldName[] },
];

function getSectionPreview(
  sectionId: SectionId,
  data: Partial<ItemizationFormData>,
  linkedRecords?: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>
): string[] {
  const fields = SECTION_FIELD_MAP[sectionId];
  const previews: string[] = [];
  for (const f of fields) {
    if (previews.length >= 3) break;

    if ((f === "brandPartner" || f === "seller") && linkedRecords?.[f]?.[0]?.name) {
      previews.push(linkedRecords[f]?.[0]?.name ?? "");
      continue;
    }

    const val = data[f];
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === "string") {
      previews.push(val.length > 30 ? val.slice(0, 30) + "..." : val);
    } else if (typeof val === "number") {
      previews.push(String(val));
    } else if (typeof val === "boolean") {
      previews.push(val ? "Yes" : "No");
    } else if (Array.isArray(val)) {
      previews.push(`${val.length} selected`);
    }
  }
  return previews;
}

export function ItemizationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [lastSubmitted, setLastSubmitted] = useState<StoredSubmission | null>(null);
  const [keptSections, setKeptSections] = useState<Set<SectionId>>(new Set(SECTION_DEFS.map((s) => s.id)));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [storageOk, setStorageOk] = useState(false);
  useEffect(() => { setStorageOk(isStorageAvailable()); }, []);

  const linkedRecordsRef = useRef<Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  const methods = useForm<ItemizationFormData>({
    resolver: zodResolver(itemizationSchema) as unknown as Resolver<ItemizationFormData>,
    defaultValues: FORM_DEFAULTS as ItemizationFormData,
    mode: "onBlur",
    shouldUnregister: false,
  });

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentSection ? "forward" : "backward");
      setCurrentSection(index);
    },
    [currentSection]
  );

  const next = useCallback(() => {
    if (currentSection < SECTION_DEFS.length - 1) {
      setDirection("forward");
      setCurrentSection((s) => s + 1);
    }
  }, [currentSection]);

  const prev = useCallback(() => {
    if (currentSection > 0) {
      setDirection("backward");
      setCurrentSection((s) => s - 1);
    }
  }, [currentSection]);

  function handleRecordsChange(field: string, records: LinkedRecord[]) {
    linkedRecordsRef.current = { ...linkedRecordsRef.current, [field]: records };
  }

  async function onSubmit(data: ItemizationFormData) {
    setSubmitting(true);
    setError(null);

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          formData: data,
          linkedRecords: linkedRecordsRef.current,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409 || res.status === 422) {
          idempotencyKeyRef.current = null;
        }
        throw new Error(body.error || `Submission failed (${res.status})`);
      }

      const stored: StoredSubmission = {
        version: 1,
        formData: data,
        linkedRecords: { ...linkedRecordsRef.current },
      };
      saveHistory(data, linkedRecordsRef.current);
      setLastSubmitted(stored);
      setKeptSections(new Set(SECTION_DEFS.map((s) => s.id)));
      setSubmitted(true);
      idempotencyKeyRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCarryForward() {
    if (!lastSubmitted) return;
    const keptArray = [...keptSections] as SectionId[];
    const merged = buildCarryForwardValues(lastSubmitted, keptArray);
    const scrubbed = scrubOrphanedFields(merged, lastSubmitted.linkedRecords);

    // Build initial records for carried-forward linked record fields
    const keptFields = new Set<string>(keptArray.flatMap((s) => SECTION_FIELD_MAP[s]));
    const nextRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>> = {};
    for (const [field, records] of Object.entries(lastSubmitted.linkedRecords)) {
      if (keptFields.has(field) && records && records.length > 0) {
        nextRecords[field as LinkedRecordFieldName] = records;
      }
    }
    linkedRecordsRef.current = nextRecords;

    methods.reset(scrubbed as ItemizationFormData);
    setLoadGeneration((g) => g + 1);
    setCurrentSection(0);
    setSubmitted(false);
    idempotencyKeyRef.current = null;
  }

  function handleStartFresh() {
    linkedRecordsRef.current = {};
    methods.reset(FORM_DEFAULTS as ItemizationFormData);
    setLoadGeneration((g) => g + 1);
    setCurrentSection(0);
    setSubmitted(false);
    idempotencyKeyRef.current = null;
  }

  function handleCloneEntry(entry: HistoryEntry | Template) {
    const { formData, linkedRecords } = entry.data;
    const scrubbed = scrubOrphanedFields(formData, linkedRecords);
    linkedRecordsRef.current = linkedRecords ?? {};
    methods.reset(scrubbed as ItemizationFormData);
    setLoadGeneration((g) => g + 1);
    setCurrentSection(0);
    idempotencyKeyRef.current = null;
  }

  function handleSaveCurrentAsTemplate(name: string) {
    const data = methods.getValues();
    saveTemplate(name, data, linkedRecordsRef.current);
  }

  function toggleSection(id: SectionId) {
    setKeptSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (submitted && lastSubmitted) {
    return (
      <div className="success-screen">
        <svg className="success-checkmark" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="26" />
          <path d="M17 28L24 35L39 20" />
        </svg>
        <h2>Submitted!</h2>
        <p>Your inventory has been submitted for itemization.</p>

        <div className="carry-forward">
          <h3 className="carry-forward-title">Keep for next submission?</h3>
          <div className="carry-forward-list">
            {SECTION_DEFS.map((section) => {
              const previews = getSectionPreview(section.id, lastSubmitted.formData, lastSubmitted.linkedRecords);
              const kept = keptSections.has(section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`carry-forward-row${kept ? " carry-forward-row--kept" : ""}`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className={`carry-forward-toggle${kept ? " carry-forward-toggle--on" : ""}`}>
                    <span className="carry-forward-toggle-thumb" />
                  </span>
                  <span className="carry-forward-info">
                    <span className="carry-forward-section-title">{section.title}</span>
                    {previews.length > 0 && (
                      <span className="carry-forward-preview">{previews.join(" / ")}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="carry-forward-actions">
            <button type="button" className="carry-forward-link" onClick={() => setKeptSections(new Set())}>
              Clear all
            </button>
            <button type="button" className="carry-forward-submit" onClick={handleCarryForward}>
              Submit Another
            </button>
          </div>
          <button type="button" className="carry-forward-fresh" onClick={handleStartFresh}>
            Start completely fresh
          </button>
        </div>
      </div>
    );
  }

  const isFirst = currentSection === 0;
  const isLast = currentSection === SECTION_DEFS.length - 1;

  const initialRecords = linkedRecordsRef.current as Record<string, LinkedRecord[]>;

  const sectionComponents: ReactNode[] = [
    <PrimaryDetails key="primary" onRecordsChange={handleRecordsChange} initialRecords={initialRecords} loadGeneration={loadGeneration} />,
    <GradingDetails key="grading" />,
    <InventoryDetails key="inventory" />,
    <LocationSection key="location" />,
    <LogisticsSection key="logistics" />,
    <PricingSection key="pricing" />,
    <RestrictionsListing key="restrictions" onRecordsChange={handleRecordsChange} initialRecords={initialRecords} loadGeneration={loadGeneration} />,
  ];

  return (
    <FormProvider {...methods}>
      <div className="form-layout">
        <div className="form-sidebar">
          <FormStepper
            sections={SECTION_DEFS}
            currentSection={currentSection}
            onGoTo={goTo}
          />
          {storageOk && (
            <button type="button" className="drawer-trigger" onClick={() => setDrawerOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3.5h10M2 7h10M2 10.5h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
              History & Templates
            </button>
          )}
        </div>

        <div className="form-content">
          <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
            {SECTION_DEFS.map((section, i) => (
              <SectionContainer
                key={section.id}
                isActive={i === currentSection}
                direction={direction}
                sectionId={section.id}
                title={section.title}
              >
                {sectionComponents[i]}
              </SectionContainer>
            ))}

            {error && (
              <div className="field-error" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                {error}
              </div>
            )}

            <div className="form-nav">
              {!isFirst && (
                <button type="button" className="nav-btn nav-btn--back" onClick={prev}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
              )}

              <div className="nav-spacer" />

              {!isLast ? (
                <button type="button" className="nav-btn nav-btn--next" onClick={next}>
                  Next
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <button type="submit" className="nav-btn nav-btn--submit" disabled={submitting}>
                  {submitting ? <><span className="spinner" />Submitting...</> : "Review & Submit"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onClone={handleCloneEntry}
        onSaveTemplate={handleSaveCurrentAsTemplate}
        currentFormDirty={methods.formState.isDirty}
      />
    </FormProvider>
  );
}

"use client";

import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { itemizationSchema } from "@/lib/schema";
import { FORM_DEFAULTS } from "@/lib/constants";
import type { ItemizationFormData } from "@/lib/types";

import { PrimaryDetails } from "./sections/PrimaryDetails";
import { GradingDetails } from "./sections/GradingDetails";
import { InventoryDetails } from "./sections/InventoryDetails";
import { LocationSection } from "./sections/LocationSection";
import { LogisticsSection } from "./sections/LogisticsSection";
import { QualificationSection } from "./sections/QualificationSection";
import { PricingSection } from "./sections/PricingSection";
import { RestrictionsListing } from "./sections/RestrictionsListing";

export function ItemizationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<ItemizationFormData>({
    resolver: zodResolver(itemizationSchema) as Resolver<ItemizationFormData>,
    defaultValues: FORM_DEFAULTS as ItemizationFormData,
    mode: "onBlur",
  });

  async function onSubmit(data: ItemizationFormData) {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Submission failed (${res.status})`);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="success-screen">
        <h2>Submitted!</h2>
        <p>Your inventory has been submitted for itemization.</p>
        <button
          type="button"
          onClick={() => {
            methods.reset(FORM_DEFAULTS as ItemizationFormData);
            setSubmitted(false);
          }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        <PrimaryDetails />
        <GradingDetails />
        <InventoryDetails />
        <LocationSection />
        <LogisticsSection />
        <QualificationSection />
        <PricingSection />
        <RestrictionsListing />

        {error && (
          <div className="field-error" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        <div className="submit-row">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Inventory"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

"use client";

import { useFormContext } from "react-hook-form";
import type { ItemizationFormData } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants";

export function StarRating() {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const value = watch("overallListingRating") || 0;
  const helper = HELPER_TEXT.overallListingRating;
  const error = errors.overallListingRating;

  return (
    <div className="field-group">
      <span className="field-label">
        Overall Listing Rating
        <span className="required">*</span>
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= value ? "active" : ""}
            onClick={() => setValue("overallListingRating", star, { shouldValidate: true })}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}

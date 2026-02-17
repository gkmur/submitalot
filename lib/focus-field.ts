"use client";

function focusElement(el: HTMLElement) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof el.focus === "function") {
    el.focus({ preventScroll: true });
  }
}

export function focusFieldByName(fieldName: string): boolean {
  if (typeof document === "undefined") return false;

  const byName = document.querySelector<HTMLElement>(`[name="${fieldName}"]`);
  if (byName) {
    focusElement(byName);
    return true;
  }

  const byId = document.getElementById(fieldName);
  if (byId) {
    focusElement(byId);
    return true;
  }

  const group = document.querySelector<HTMLElement>(`[data-field-name="${fieldName}"]`);
  if (group) {
    const focusable = group.querySelector<HTMLElement>(
      "input, button, textarea, select, [tabindex]"
    );
    if (focusable) {
      focusElement(focusable);
      return true;
    }
    focusElement(group);
    return true;
  }

  return false;
}

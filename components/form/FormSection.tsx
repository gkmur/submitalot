"use client";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="form-section">
      <h2 className="section-heading">{title}</h2>
      {children}
    </section>
  );
}

"use client";

import { useRef, useEffect } from "react";

interface SectionContainerProps {
  isActive: boolean;
  direction: "forward" | "backward";
  children: React.ReactNode;
  sectionId: string;
  title: string;
}

export function SectionContainer({
  isActive,
  direction,
  children,
  sectionId,
  title,
}: SectionContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      {children}
    </div>
  );
}

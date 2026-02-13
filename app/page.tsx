import { ItemizationForm } from "@/components/form/ItemizationForm";

export default function Home() {
  return (
    <main className="form-container">
      <header className="form-header">
        <p className="brand-subhead">Inventory Submission Portal</p>
        <div className="brand-lockup" aria-label="Ghost">
          <span className="brand-mark-wrap">
            <img className="brand-mark" src="/logo-no-letters.png" alt="Ghost symbol" />
          </span>
          <span className="brand-rule" aria-hidden="true" />
          <span className="brand-caption">Ghost</span>
        </div>
        <h1>
          <span className="headline-line">Inventory</span>
          <span className="headline-line headline-line--offset">Submission</span>
        </h1>
        <p className="brand-description">Submit new inventory for itemization and listing.</p>
      </header>
      <ItemizationForm />
    </main>
  );
}

import { ItemizationForm } from "@/components/form/ItemizationForm";

export default function Home() {
  return (
    <main className="form-container">
      <header className="form-header">
        <p className="brand-subhead">Inventory Submission Portal</p>
        <div className="brand-title-row">
          <img className="brand-mark" src="/logo-no-letters.png" alt="Ghost symbol" />
          <h1>Inventory Submission</h1>
        </div>
        <p className="brand-description">Submit new inventory for itemization and listing.</p>
      </header>
      <ItemizationForm />
    </main>
  );
}

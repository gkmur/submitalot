import { ItemizationForm } from "@/components/form/ItemizationForm";

export default function Home() {
  return (
    <main className="form-container">
      <header className="form-header">
        <h1>Inventory Submission</h1>
        <p>Submit new inventory for itemization and listing.</p>
      </header>
      <ItemizationForm />
    </main>
  );
}

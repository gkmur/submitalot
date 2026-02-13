import { ItemizationForm } from "@/components/form/ItemizationForm";

export default function Home() {
  return (
    <main className="form-container">
      <header className="form-header">
        <p className="brand-subhead">Inventory Submission Portal</p>
        <div className="brand-lockup" aria-label="Ghost">
          <svg className="ghost-mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
            <circle cx="32" cy="32" r="30" className="ghost-mark-solid" />
            <path
              className="ghost-mark-cutout"
              d="M32 9.5c6.4 0 8.2 8.3 13.6 13.7C51 28.7 59.2 30.6 59.2 32s-8.2 3.3-13.6 8.8C40.2 46.2 38.4 54.5 32 54.5s-8.2-8.3-13.6-13.7C13 35.3 4.8 33.4 4.8 32s8.2-3.3 13.6-8.8C23.8 17.8 25.6 9.5 32 9.5Z"
            />
          </svg>
          <span className="brand-wordmark">ghost</span>
        </div>
        <h1>Powering the resale economy</h1>
        <p>Submit new inventory for itemization and listing.</p>
      </header>
      <ItemizationForm />
    </main>
  );
}

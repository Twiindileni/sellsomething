import React from "react";
import InfoPageLayout from "../components/InfoPageLayout";
import { TERMS_TEXT } from "../content/legal";

export default function TermsPage() {
  return (
    <InfoPageLayout
      title="Terms & Conditions"
      subtitle="The rules for using Sell Something, operated by Sheka Investment CC."
    >
      <section className="info-section">
        <pre className="legal-text">{TERMS_TEXT}</pre>
      </section>
    </InfoPageLayout>
  );
}

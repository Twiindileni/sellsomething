import React from "react";
import InfoPageLayout from "../components/InfoPageLayout";
import { PRIVACY_TEXT } from "../content/legal";

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle="How Sheka Investment CC collects, uses, and protects your information."
    >
      <section className="info-section">
        <pre className="legal-text">{PRIVACY_TEXT}</pre>
      </section>
    </InfoPageLayout>
  );
}

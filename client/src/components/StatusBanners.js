import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function SuccessBanner({ children, className = "", style }) {
  return (
    <div className={`success-banner ${className}`.trim()} style={style}>
      <CheckCircle2 size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
      {children}
    </div>
  );
}

export function ErrorBanner({ children, className = "", style }) {
  return (
    <div className={`error-banner ${className}`.trim()} style={style}>
      <AlertTriangle size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
      {children}
    </div>
  );
}

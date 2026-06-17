import React from "react";
import { Link } from "react-router-dom";
import { BRAND, COMPANY } from "../config/site";

/**
 * @param {"nav" | "footer" | "auth"} variant
 * @param {boolean} link - wrap in home link (default true for nav/footer)
 */
export default function BrandLogo({ variant = "nav", link = variant !== "auth", onClick }) {
  const isDarkSurface = variant === "nav" || variant === "footer";

  const content = isDarkSurface ? (
    <>
      <img
        src={BRAND.iconMark}
        alt=""
        className={`brand-logo-mark brand-logo-mark--${variant}`}
        aria-hidden="true"
      />
      <span className={`brand-logo-text brand-logo-text--${variant}`}>
        Sell<span>Something</span>
      </span>
    </>
  ) : (
    <img
      src={BRAND.logo}
      alt={COMPANY.brand}
      className="brand-logo-horizontal brand-logo-horizontal--auth"
    />
  );

  const className = `brand-logo brand-logo--${variant}${isDarkSurface ? " brand-logo--lockup" : ""}${variant === "nav" ? " navbar-logo" : ""}${variant === "footer" ? " site-footer-logo" : ""}`;

  if (link) {
    return (
      <Link to="/" className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

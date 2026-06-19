import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

/**
 * Branded login gate — replaces browser alert() for messaging, reviews, etc.
 */
export default function LoginPromptModal({
  onClose,
  icon = <MessageCircle size={32} strokeWidth={1.5} color="currentColor" />,
  title = "Log in to continue",
  message = "Create a free account or log in to use this feature.",
  highlight,
}) {
  const navigate = useNavigate();

  function goLogin() {
    onClose();
    navigate("/login");
  }

  function goSignup() {
    onClose();
    navigate("/signup");
  }

  return (
    <div
      className="login-prompt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      onClick={onClose}
    >
      <div className="login-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="login-prompt-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="login-prompt-icon-wrap" aria-hidden="true">
          <span className="login-prompt-icon">{icon}</span>
        </div>

        <h2 id="login-prompt-title" className="login-prompt-title">{title}</h2>

        {highlight && (
          <p className="login-prompt-highlight">{highlight}</p>
        )}

        <p className="login-prompt-message">{message}</p>

        <ul className="login-prompt-benefits">
          <li>Safe in-app messaging</li>
          <li>Escrow-protected purchases</li>
          <li>Free to join</li>
        </ul>

        <div className="login-prompt-actions">
          <button type="button" className="login-prompt-primary" onClick={goLogin}>
            Log In
          </button>
          <button type="button" className="login-prompt-secondary" onClick={goSignup}>
            Create Account
          </button>
        </div>

        <button type="button" className="login-prompt-dismiss" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}

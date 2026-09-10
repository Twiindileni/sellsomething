import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function CampaignPopupModal() {
  const [campaign, setCampaign] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay to let the page render first
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("campaign_popups")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Campaign popup error:", error.message);
          return;
        }

        if (data) {
          const seenKey = `seen_campaign_${data.id}`;
          if (!localStorage.getItem(seenKey)) {
            setCampaign(data);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Campaign popup fetch failed:", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen || !campaign) return null;

  function closePopup() {
    localStorage.setItem(`seen_campaign_${campaign.id}`, "true");
    setIsOpen(false);
  }

  function handleButtonClick(e) {
    e.preventDefault();
    closePopup();
    if (campaign.link_url) {
      // Use window.location for Android WebView compatibility (no target=_blank)
      if (campaign.link_url.startsWith("http")) {
        window.open(campaign.link_url, "_self");
      } else {
        window.location.href = campaign.link_url;
      }
    }
  }

  return (
    <div
      className="campaign-popup-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={closePopup}
    >
      <div
        className="campaign-popup-modal"
        style={{
          backgroundColor: '#fff', borderRadius: '16px',
          maxWidth: '400px', width: '100%', overflow: 'hidden',
          position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            border: 'none', borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', fontSize: '20px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10,
            flexShrink: 0
          }}
          aria-label="Close"
        >
          &times;
        </button>

        {campaign.image_url && (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'cover', display: 'block' }}
          />
        )}

        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--ink)', fontSize: '1.3rem' }}>{campaign.title}</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 1rem' }}>
            {campaign.body}
          </p>

          {(campaign.was_price || campaign.new_price) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '1rem', margin: '0.5rem 0 1.25rem', flexWrap: 'wrap'
            }}>
              {campaign.was_price && (
                <span style={{
                  fontSize: '1.1rem', color: '#999',
                  textDecoration: 'line-through', fontWeight: 500
                }}>
                  N$ {Number(campaign.was_price).toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                </span>
              )}
              {campaign.new_price && (
                <span style={{
                  fontSize: '1.6rem', color: 'var(--accent)',
                  fontWeight: 800, letterSpacing: '-0.5px'
                }}>
                  N$ {Number(campaign.new_price).toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                </span>
              )}
              {campaign.was_price && campaign.new_price && (
                <span style={{
                  background: '#ef4444', color: '#fff',
                  borderRadius: '20px', padding: '2px 10px',
                  fontSize: '0.8rem', fontWeight: 700
                }}>
                  {Math.round((1 - campaign.new_price / campaign.was_price) * 100)}% OFF
                </span>
              )}
            </div>
          )}

          {campaign.link_url && (
            <button
              onClick={handleButtonClick}
              style={{
                display: 'block', width: '100%',
                backgroundColor: 'var(--accent)', color: '#fff',
                padding: '14px', borderRadius: '8px', border: 'none',
                fontWeight: '600', marginTop: '0.5rem', cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {campaign.button_text || "Learn More"}
            </button>
          )}

          <button
            onClick={closePopup}
            style={{
              display: 'block', width: '100%', background: 'none',
              border: 'none', color: 'var(--muted)', marginTop: '0.75rem',
              cursor: 'pointer', fontSize: '0.9rem', padding: '8px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

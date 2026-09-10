import React, { useState, useEffect } from "react";
import supabase from "../lib/supabase";

export default function CampaignPopupModal() {
  const [campaign, setCampaign] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchCampaign() {
      const { data, error } = await supabase
        .from("campaign_popups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        const seenKey = `seen_campaign_${data.id}`;
        if (!localStorage.getItem(seenKey)) {
          setCampaign(data);
          setIsOpen(true);
        }
      }
    }
    fetchCampaign();
  }, []);

  if (!isOpen || !campaign) return null;

  function closePopup() {
    localStorage.setItem(`seen_campaign_${campaign.id}`, "true");
    setIsOpen(false);
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
          position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            border: 'none', borderRadius: '50%', width: '30px', height: '30px',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}
        >
          &times;
        </button>

        {campaign.image_url && (
          <img 
            src={campaign.image_url} 
            alt={campaign.title} 
            style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'cover' }} 
          />
        )}
        
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--ink)' }}>{campaign.title}</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {campaign.body}
          </p>
          
          {campaign.link_url && (
            <a 
              href={campaign.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={closePopup}
              style={{
                display: 'block', backgroundColor: 'var(--accent)', color: '#fff',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                fontWeight: '600', marginTop: '1.5rem'
              }}
            >
              {campaign.button_text || "Learn More"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

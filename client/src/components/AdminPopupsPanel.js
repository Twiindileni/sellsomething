import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";
import { LayoutTemplate, Plus, CheckCircle, Trash2, Edit2 } from "lucide-react";

export default function AdminPopupsPanel() {
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentPopup, setCurrentPopup] = useState(null);

  const loadPopups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("campaign_popups")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (sbError) throw sbError;
      setPopups(data || []);
    } catch (err) {
      setError(err.message || "Failed to load popups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPopups();
  }, [loadPopups]);

  function handleAddNew() {
    setCurrentPopup({ title: "", body: "", image_url: "", link_url: "", button_text: "", is_active: false });
    setIsEditing(true);
  }

  function handleEdit(popup) {
    setCurrentPopup({ ...popup });
    setIsEditing(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this popup?")) return;
    try {
      const { error } = await supabase.from("campaign_popups").delete().eq("id", id);
      if (error) throw error;
      loadPopups();
    } catch (err) {
      alert("Error deleting popup: " + err.message);
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      const { error } = await supabase.from("campaign_popups").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      loadPopups();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (currentPopup.id) {
        const { error } = await supabase
          .from("campaign_popups")
          .update({
            title: currentPopup.title,
            body: currentPopup.body,
            image_url: currentPopup.image_url,
            link_url: currentPopup.link_url,
            button_text: currentPopup.button_text,
            is_active: currentPopup.is_active
          })
          .eq("id", currentPopup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_popups")
          .insert([{
            title: currentPopup.title,
            body: currentPopup.body,
            image_url: currentPopup.image_url,
            link_url: currentPopup.link_url,
            button_text: currentPopup.button_text,
            is_active: currentPopup.is_active
          }]);
        if (error) throw error;
      }
      setIsEditing(false);
      setCurrentPopup(null);
      loadPopups();
    } catch (err) {
      alert("Error saving popup: " + err.message);
    }
  }

  if (isEditing && currentPopup) {
    return (
      <div className="admin-table-panel" style={{ padding: '2rem' }}>
        <h3 className="admin-table-title" style={{ marginBottom: '1.5rem' }}>
          {currentPopup.id ? "Edit Campaign Popup" : "New Campaign Popup"}
        </h3>
        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Title</label>
            <input 
              required
              className="form-input"
              value={currentPopup.title}
              onChange={e => setCurrentPopup({...currentPopup, title: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Body Text</label>
            <textarea 
              required
              className="form-input"
              rows="4"
              value={currentPopup.body}
              onChange={e => setCurrentPopup({...currentPopup, body: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Image URL (optional)</label>
            <input 
              className="form-input"
              type="url"
              value={currentPopup.image_url}
              onChange={e => setCurrentPopup({...currentPopup, image_url: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Link URL (optional)</label>
            <input 
              className="form-input"
              type="url"
              value={currentPopup.link_url}
              onChange={e => setCurrentPopup({...currentPopup, link_url: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Button Text (if link provided)</label>
            <input 
              className="form-input"
              value={currentPopup.button_text}
              placeholder="e.g. Learn More"
              onChange={e => setCurrentPopup({...currentPopup, button_text: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="admin-row-action" style={{ background: 'var(--accent)', color: '#fff' }}>
              Save Popup
            </button>
            <button type="button" className="admin-row-action" style={{ background: 'var(--smoke)', color: 'var(--ink)' }} onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-table-panel">
      <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="admin-table-title">Campaign Popups</h3>
        <button className="admin-row-action" style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleAddNew}>
          <Plus size={16} /> Add New
        </button>
      </div>
      
      {error && <div className="error-wrap" style={{ margin: '1rem' }}>{error}</div>}
      
      <div className="admin-table-wrapper">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#a3aed1' }}>Loading...</div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {popups.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td>
                    <span className={`admin-badge ${p.is_active ? 'success' : 'neutral'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="admin-row-action" 
                        style={{ background: p.is_active ? 'var(--smoke)' : '#10b981', color: p.is_active ? 'var(--ink)' : '#fff' }}
                        onClick={() => handleToggleActive(p.id, p.is_active)}
                        title={p.is_active ? "Deactivate" : "Activate"}
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button className="admin-row-action" onClick={() => handleEdit(p)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="admin-row-action" style={{ background: '#ef4444', color: '#fff' }} onClick={() => handleDelete(p.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {popups.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No popups found. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

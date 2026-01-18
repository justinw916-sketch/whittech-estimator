import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Building, DollarSign, FileText } from 'lucide-react';

function Settings() {
  const { companySettings, refreshSettings, dbService } = useApp();
  const [settings, setSettings] = useState({
    company_name: '', address: '', phone: '', email: '', website: '',
    default_labor_rate: 75, default_markup_percent: 20, tax_rate: 0, proposal_terms: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (companySettings) setSettings(companySettings);
  }, [companySettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await dbService.updateCompanySettings(settings);
      await refreshSettings();
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Company Settings</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      {saveMessage && <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>{saveMessage}</div>}
      <div className="settings-content">
        <div className="settings-section">
          <div className="section-header"><Building size={24} /><h3>Company Information</h3></div>
          <div className="form-grid">
            <div className="form-group full-width"><label>Company Name *</label><input type="text" name="company_name" value={settings.company_name} onChange={handleChange} required /></div>
            <div className="form-group full-width"><label>Address</label><textarea name="address" value={settings.address} onChange={handleChange} rows="3" /></div>
            <div className="form-group"><label>Phone</label><input type="tel" name="phone" value={settings.phone} onChange={handleChange} /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={settings.email} onChange={handleChange} /></div>
            <div className="form-group full-width"><label>Website</label><input type="url" name="website" value={settings.website} onChange={handleChange} /></div>
          </div>
        </div>
        <div className="settings-section">
          <div className="section-header"><DollarSign size={24} /><h3>Default Pricing</h3></div>
          <div className="form-grid">
            <div className="form-group"><label>Default Labor Rate ($/hr)</label><input type="number" name="default_labor_rate" value={settings.default_labor_rate} onChange={handleChange} min="0" step="0.01" /></div>
            <div className="form-group"><label>Default Markup (%)</label><input type="number" name="default_markup_percent" value={settings.default_markup_percent} onChange={handleChange} min="0" step="1" /></div>
            <div className="form-group"><label>Tax Rate (%)</label><input type="number" name="tax_rate" value={settings.tax_rate} onChange={handleChange} min="0" step="0.01" /><small>Currently for reference only</small></div>
          </div>
        </div>
        <div className="settings-section">
          <div className="section-header"><FileText size={24} /><h3>Proposal Terms & Conditions</h3></div>
          <div className="form-group"><textarea name="proposal_terms" value={settings.proposal_terms} onChange={handleChange} rows="6" /></div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
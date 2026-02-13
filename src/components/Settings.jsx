import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Building, DollarSign, FileText, Database, Plus, Edit2, Trash2, Download, Upload, X, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

function Settings() {
  const { companySettings, refreshSettings, dbService } = useApp();
  const [activeTab, setActiveTab] = useState('company');

  // Company Settings State
  const [settings, setSettings] = useState({
    company_name: '', address: '', phone: '', email: '', website: '',
    default_labor_rate: 75, default_markup_percent: 20, tax_rate: 0, proposal_terms: '',
    default_material_markup_pct: 0, default_labor_markup_pct: 0,
    default_overhead_pct: 10, default_profit_pct: 10, default_material_tax_rate: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Material Library State
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    category: '', item_name: '', description: '', unit: 'EA',
    material_cost: 0, typical_labor_hours: 0, manufacturer: '', part_number: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (companySettings) setSettings(companySettings);
  }, [companySettings]);

  useEffect(() => {
    if (dbService && activeTab === 'materials') {
      loadMaterials();
      loadCategories();
    }
  }, [dbService, activeTab]);

  const loadMaterials = () => {
    const mats = dbService.getMaterialsLibrary();
    setMaterials(mats);
  };

  const loadCategories = () => {
    const cats = dbService.getCategories();
    setCategories(cats);
  };

  // Company Settings Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['default_labor_rate', 'default_markup_percent', 'tax_rate',
      'default_material_markup_pct', 'default_labor_markup_pct',
      'default_overhead_pct', 'default_profit_pct', 'default_material_tax_rate'];
    if (numericFields.includes(name)) {
      setSettings(prev => ({ ...prev, [name]: value === '' ? '' : (parseFloat(value) || 0) }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
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

  // Material Library Handlers
  const openAddModal = () => {
    setEditingMaterial(null);
    setMaterialForm({
      category: categories[0]?.name || '', item_name: '', description: '', unit: 'EA',
      material_cost: 0, typical_labor_hours: 0, manufacturer: '', part_number: ''
    });
    setShowModal(true);
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setMaterialForm({
      category: material.category || '',
      item_name: material.item_name || '',
      description: material.description || '',
      unit: material.unit || 'EA',
      material_cost: material.material_cost || 0,
      typical_labor_hours: material.typical_labor_hours || 0,
      manufacturer: material.manufacturer || '',
      part_number: material.part_number || ''
    });
    setShowModal(true);
  };

  const handleMaterialFormChange = (e) => {
    const { name, value } = e.target;
    setMaterialForm(prev => ({ ...prev, [name]: value }));
  };

  const saveMaterial = async () => {
    try {
      if (editingMaterial) {
        await dbService.updateMaterialInLibrary(editingMaterial.id, materialForm);
      } else {
        await dbService.addToMaterialsLibrary(materialForm);
      }
      loadMaterials();
      setShowModal(false);
      setSaveMessage(editingMaterial ? 'Material updated!' : 'Material added!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error: ' + error.message);
    }
  };

  const deleteMaterial = async (id) => {
    try {
      await dbService.deleteMaterialFromLibrary(id);
      loadMaterials();
      setDeleteConfirm(null);
      setSaveMessage('Material deleted!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error: ' + error.message);
    }
  };

  // Excel Export/Import
  const exportToExcel = () => {
    const data = dbService.getAllMaterialsForExport();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    XLSX.writeFile(wb, 'material_library.xlsx');
    setSaveMessage('Materials exported to Excel!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const importFromExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const imported = await dbService.bulkImportMaterials(data);
        loadMaterials();
        setSaveMessage(`Imported ${imported} materials!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('Import error: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <Building size={18} /> Company
          </button>
          <button
            className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <Database size={18} /> Material Library
          </button>
        </div>
        {activeTab === 'company' && (
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
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
              <div className="form-group"><label>Default Markup % (Legacy)</label><input type="number" name="default_markup_percent" value={settings.default_markup_percent} onChange={handleChange} min="0" step="1" /></div>
              <div className="form-group"><label>Material Markup %</label><input type="number" name="default_material_markup_pct" value={settings.default_material_markup_pct || 0} onChange={handleChange} min="0" step="1" /></div>
              <div className="form-group"><label>Labor Markup %</label><input type="number" name="default_labor_markup_pct" value={settings.default_labor_markup_pct || 0} onChange={handleChange} min="0" step="1" /></div>
              <div className="form-group"><label>Overhead %</label><input type="number" name="default_overhead_pct" value={settings.default_overhead_pct ?? 10} onChange={handleChange} min="0" step="1" /></div>
              <div className="form-group"><label>Profit %</label><input type="number" name="default_profit_pct" value={settings.default_profit_pct ?? 10} onChange={handleChange} min="0" step="1" /></div>
              <div className="form-group"><label>Default Material Tax Rate %</label><input type="number" name="default_material_tax_rate" value={settings.default_material_tax_rate || 0} onChange={handleChange} min="0" step="0.01" /></div>
              <div className="form-group"><label>Tax Rate % (Legacy)</label><input type="number" name="tax_rate" value={settings.tax_rate} onChange={handleChange} min="0" step="0.01" /></div>
            </div>
          </div>
          <div className="settings-section">
            <div className="section-header"><FileText size={24} /><h3>Proposal Terms & Conditions</h3></div>
            <div className="form-group"><textarea name="proposal_terms" value={settings.proposal_terms} onChange={handleChange} rows="6" /></div>
          </div>
        </div>
      )}

      {/* Material Library Tab */}
      {activeTab === 'materials' && (
        <div className="settings-content">
          <div className="materials-toolbar">
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={18} /> Add Material
            </button>
            <div className="toolbar-right">
              <label className="btn btn-secondary">
                <Upload size={18} /> Import Excel
                <input type="file" accept=".xlsx,.xls" onChange={importFromExcel} hidden />
              </label>
              <button className="btn btn-secondary" onClick={exportToExcel}>
                <Download size={18} /> Export Excel
              </button>
            </div>
          </div>

          <div className="materials-table-wrapper">
            <table className="materials-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item Name</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Cost</th>
                  <th>Labor Hrs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(mat => (
                  <tr key={mat.id}>
                    <td>{mat.category}</td>
                    <td>{mat.item_name}</td>
                    <td className="desc-cell">{mat.description}</td>
                    <td>{mat.unit}</td>
                    <td>${mat.material_cost?.toFixed(2)}</td>
                    <td>{mat.typical_labor_hours}h</td>
                    <td className="actions-cell">
                      <button className="icon-btn small" onClick={() => openEditModal(mat)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      {deleteConfirm === mat.id ? (
                        <>
                          <button className="icon-btn small danger" onClick={() => deleteMaterial(mat.id)} title="Confirm Delete">
                            <Check size={16} />
                          </button>
                          <button className="icon-btn small" onClick={() => setDeleteConfirm(null)} title="Cancel">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button className="icon-btn small danger" onClick={() => setDeleteConfirm(mat.id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={materialForm.category} onChange={handleMaterialFormChange}>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Item Name *</label>
                <input type="text" name="item_name" value={materialForm.item_name} onChange={handleMaterialFormChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={materialForm.description} onChange={handleMaterialFormChange} rows="2" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit</label>
                  <select name="unit" value={materialForm.unit} onChange={handleMaterialFormChange}>
                    <option value="EA">EA</option>
                    <option value="FT">FT</option>
                    <option value="LF">LF</option>
                    <option value="SF">SF</option>
                    <option value="SY">SY</option>
                    <option value="BOX">BOX</option>
                    <option value="RL">RL</option>
                    <option value="PK">PK</option>
                    <option value="SPL">SPL</option>
                    <option value="LS">LS</option>
                    <option value="HR">HR</option>
                    <option value="DAY">DAY</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Material Cost ($)</label>
                  <input type="number" name="material_cost" value={materialForm.material_cost} onChange={handleMaterialFormChange} min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Labor Hours</label>
                  <input type="number" name="typical_labor_hours" value={materialForm.typical_labor_hours} onChange={handleMaterialFormChange} min="0" step="0.1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Manufacturer</label>
                  <input type="text" name="manufacturer" value={materialForm.manufacturer} onChange={handleMaterialFormChange} />
                </div>
                <div className="form-group">
                  <label>Part Number</label>
                  <input type="text" name="part_number" value={materialForm.part_number} onChange={handleMaterialFormChange} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMaterial} disabled={!materialForm.item_name}>
                <Save size={18} /> {editingMaterial ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
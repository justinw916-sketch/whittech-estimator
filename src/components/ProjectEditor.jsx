import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import LineItemTable from './LineItemTable';
import ProposalGenerator from './ProposalGenerator';
import MaterialSidebar from './MaterialSidebar';
import { ArrowLeft, Save, FileText, Download, Database, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

function ProjectEditor({ project, onBack }) {
  const { refreshProjects, companySettings, dbService } = useApp();
  const [projectData, setProjectData] = useState({
    project_number: '', name: '', client_name: '', client_company: '', client_email: '',
    client_phone: '', client_address: '', description: '', status: 'draft', notes: '',
    material_tax_rate: companySettings?.default_material_tax_rate || 0,
    contingency_pct: 5
  });
  const [lineItems, setLineItems] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (project) {
      setProjectData(project);
      setProjectId(project.id);
      loadLineItems(project.id);
    } else {
      generateProjectNumber();
    }
  }, [project]);

  const generateProjectNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setProjectData(prev => ({ ...prev, project_number: `EST-${year}${month}-${random}` }));
  };

  const loadLineItems = async (id) => {
    const items = dbService.getLineItems(id);
    setLineItems(items || []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['material_tax_rate', 'contingency_pct'];
    if (numericFields.includes(name)) {
      // Allow empty string for editing, parse on save
      setProjectData(prev => ({ ...prev, [name]: value === '' ? '' : (parseFloat(value) || 0) }));
    } else {
      setProjectData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await dbService.updateProject(projectId, projectData);
        await dbService.calculateProjectTotal(projectId);
      } else {
        const newId = await dbService.createProject(projectData);
        setProjectId(newId);
        await dbService.calculateProjectTotal(newId);
      }
      await refreshProjects();
      alert('Project saved successfully!');
    } catch (error) {
      alert('Error saving project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, projectData, dbService, refreshProjects]);

  const handleExportExcel = async () => {
    if (!lineItems || lineItems.length === 0) {
      alert('No line items to export.');
      return;
    }

    try {
      // Prepare data for export
      const data = lineItems.map(item => {
        const matBase = item.quantity * item.material_cost;
        const matMarkup = matBase * ((item.material_markup_pct || 0) / 100);
        const labBase = item.quantity * item.labor_hours * item.labor_rate;
        const labMarkup = labBase * ((item.labor_markup_pct || 0) / 100);
        const subtotal = (matBase + matMarkup) + (labBase + labMarkup);
        const oh = subtotal * ((item.overhead_pct || 0) / 100);
        const pft = (subtotal + oh) * ((item.profit_pct || 0) / 100);
        const total = subtotal + oh + pft;

        return {
          Category: item.category,
          Description: item.description,
          Quantity: item.quantity,
          Unit: item.unit,
          'Material Cost': item.material_cost,
          'Mat Markup %': item.material_markup_pct || 0,
          'Labor Hours': item.labor_hours,
          'Labor Rate': item.labor_rate,
          'Lab Markup %': item.labor_markup_pct || 0,
          'OH %': item.overhead_pct || 0,
          'Profit %': item.profit_pct || 0,
          Total: total
        };
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Estimate");

      // Save file
      XLSX.writeFile(wb, `${projectData.project_number}-Estimate.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('No data found in Excel file.');
          return;
        }

        let addedCount = 0;
        for (const row of data) {
          // Map approximate column names to line item fields
          // Basic validation: needs at least a Description
          const description = row['Description'] || row['description'] || row['Item'] || row['item'];

          if (!description) continue;

          const newItem = {
            project_id: projectId,
            category: row['Category'] || row['category'] || 'Uncategorized',
            description: description,
            quantity: parseFloat(row['Quantity'] || row['quantity'] || 1) || 1,
            unit: row['Unit'] || row['unit'] || 'EA',
            material_cost: parseFloat(row['Material Cost'] || row['Material'] || row['material'] || 0) || 0,
            labor_hours: parseFloat(row['Labor Hours'] || row['Labor'] || row['labor'] || 0) || 0,
            labor_rate: parseFloat(row['Labor Rate'] || row['Rate'] || row['rate'] || companySettings?.default_labor_rate || 75) || 75,
            markup_percent: parseFloat(row['Markup %'] || row['Markup'] || row['markup'] || companySettings?.default_markup_percent || 20) || 20,
            material_markup_pct: parseFloat(row['Mat Markup %'] || row['Material Markup %'] || companySettings?.default_material_markup_pct || 0),
            labor_markup_pct: parseFloat(row['Lab Markup %'] || row['Labor Markup %'] || companySettings?.default_labor_markup_pct || 0),
            overhead_pct: parseFloat(row['OH %'] || row['Overhead %'] || (companySettings?.default_overhead_pct ?? 10)),
            profit_pct: parseFloat(row['Profit %'] || (companySettings?.default_profit_pct ?? 10)),
            notes: row['Notes'] || row['notes'] || ''
          };

          await dbService.createLineItem(newItem);
          addedCount++;
        }

        refreshLineItems();
        alert(`Successfully imported ${addedCount} line items.`);
      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing Excel: ' + error.message);
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const refreshLineItems = () => {
    if (projectId) {
      loadLineItems(projectId);
      refreshProjects();
    }
  };

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Toggle sidebar with Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleSidebarSelect = async (material) => {
    // If not on lineitems tab, switch to it
    if (activeTab !== 'lineitems') {
      setActiveTab('lineitems');
    }

    // Add item directly
    try {
      if (projectId) {
        await dbService.createLineItem({
          project_id: projectId,
          category: material.category,
          description: material.item_name,
          quantity: 1,
          unit: material.unit,
          material_cost: material.material_cost,
          labor_hours: material.typical_labor_hours,
          labor_rate: companySettings?.default_labor_rate || 75,
          markup_percent: companySettings?.default_markup_percent || 20,
          material_markup_pct: companySettings?.default_material_markup_pct || 0,
          labor_markup_pct: companySettings?.default_labor_markup_pct || 0,
          overhead_pct: companySettings?.default_overhead_pct ?? 10,
          profit_pct: companySettings?.default_profit_pct ?? 10,
          spec_url: material.spec_url || null
        });
        refreshLineItems();
      }
    } catch (err) {
      console.error('Error adding from sidebar:', err);
    }
  };

  return (
    <div className={`project-editor ${showSidebar ? 'sidebar-open' : ''}`}>
      <div className="editor-main">
        <div className="editor-header">
          <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={20} /> Back to Projects</button>
          <div className="editor-actions">
            <button className={`btn ${showSidebar ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowSidebar(!showSidebar)}>
              <Database size={20} /> Library
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={20} /> Import Excel
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} disabled={!projectId} />
            </label>
            <button className="btn btn-secondary" onClick={handleExportExcel} disabled={!projectId}><Download size={20} /> Export Excel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}><Save size={20} /> {isSaving ? 'Saving...' : 'Save Project'}</button>
          </div>
        </div>
        <div className="editor-tabs">
          <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Project Details</button>
          <button className={`tab ${activeTab === 'lineitems' ? 'active' : ''}`} onClick={() => setActiveTab('lineitems')} disabled={!projectId}>Line Items</button>
          <button className={`tab ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => setActiveTab('proposal')} disabled={!projectId}>Generate Proposal</button>
        </div>
        <div className="editor-content">
          {activeTab === 'details' && (
            <div className="project-details-form">
              <div className="form-section">
                <h3>Project Information</h3>
                <div className="form-grid">
                  <div className="form-group"><label>Project Number</label><input type="text" name="project_number" value={projectData.project_number} onChange={handleInputChange} readOnly /></div>
                  <div className="form-group"><label>Project Name *</label><input type="text" name="name" value={projectData.name} onChange={handleInputChange} required /></div>
                  <div className="form-group full-width"><label>Description</label><textarea name="description" value={projectData.description} onChange={handleInputChange} rows="3" /></div>
                  <div className="form-group"><label>Status</label><select name="status" value={projectData.status} onChange={handleInputChange}><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="won">Won</option><option value="lost">Lost</option><option value="rejected">Rejected</option></select></div>
                </div>
              </div>
              <div className="form-section">
                <h3>Client Information</h3>
                <div className="form-grid">
                  <div className="form-group"><label>Client Name</label><input type="text" name="client_name" value={projectData.client_name} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Company</label><input type="text" name="client_company" value={projectData.client_company} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Email</label><input type="email" name="client_email" value={projectData.client_email} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Phone</label><input type="tel" name="client_phone" value={projectData.client_phone} onChange={handleInputChange} /></div>
                  <div className="form-group full-width"><label>Address</label><textarea name="client_address" value={projectData.client_address} onChange={handleInputChange} rows="2" /></div>
                </div>
              </div>
              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group"><textarea name="notes" value={projectData.notes} onChange={handleInputChange} rows="4" /></div>
              </div>
              <div className="form-section">
                <h3>Pricing & Tax</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Material Sales Tax %</label>
                    <input type="number" name="material_tax_rate" value={projectData.material_tax_rate || 0} onChange={handleInputChange} step="0.01" min="0" />
                  </div>
                  <div className="form-group">
                    <label>Contingency %</label>
                    <input type="number" name="contingency_pct" value={projectData.contingency_pct || 0} onChange={handleInputChange} step="1" min="0" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'lineitems' && projectId && <LineItemTable projectId={projectId} lineItems={lineItems} onRefresh={refreshLineItems} projectData={projectData} />}
          {activeTab === 'proposal' && projectId && <ProposalGenerator projectId={projectId} projectData={projectData} lineItems={lineItems} />}
        </div>
      </div>

      <MaterialSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onSelectMaterial={handleSidebarSelect}
      />
    </div>
  );
}

export default ProjectEditor;

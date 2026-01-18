import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LineItemTable from './LineItemTable';
import ProposalGenerator from './ProposalGenerator';
import { ArrowLeft, Save, FileText, Download } from 'lucide-react';

function ProjectEditor({ project, onBack }) {
  const { refreshProjects, companySettings, dbService } = useApp();
  const [projectData, setProjectData] = useState({
    project_number: '', name: '', client_name: '', client_company: '', client_email: '',
    client_phone: '', client_address: '', description: '', status: 'draft', notes: ''
  });
  const [lineItems, setLineItems] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [projectId, setProjectId] = useState(null);

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
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        await dbService.updateProject(projectId, projectData);
      } else {
        const newId = await dbService.createProject(projectData);
        setProjectId(newId);
      }
      await refreshProjects();
      alert('Project saved successfully!');
    } catch (error) {
      alert('Error saving project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    // Note: Excel export requires additional implementation for browser
    alert('Excel export is not yet available in browser mode.');
  };

  const refreshLineItems = () => {
    if (projectId) {
      loadLineItems(projectId);
      refreshProjects();
    }
  };

  return (
    <div className="project-editor">
      <div className="editor-header">
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={20} /> Back to Projects</button>
        <div className="editor-actions">
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
                <div className="form-group"><label>Status</label><select name="status" value={projectData.status} onChange={handleInputChange}><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
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
          </div>
        )}
        {activeTab === 'lineitems' && projectId && <LineItemTable projectId={projectId} lineItems={lineItems} onRefresh={refreshLineItems} />}
        {activeTab === 'proposal' && projectId && <ProposalGenerator projectId={projectId} projectData={projectData} lineItems={lineItems} />}
      </div>
    </div>
  );
}

export default ProjectEditor;

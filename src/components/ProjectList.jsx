import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Trash2, Edit, DollarSign, Calendar } from 'lucide-react';

function ProjectList({ onProjectSelect, onNewProject }) {
  const { projects, refreshProjects, dbService } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || project.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      await dbService.deleteProject(projectId);
      refreshProjects();
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="project-list-container">
      <div className="list-header">
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={onNewProject}>
          <Plus size={20} /> New Project
        </button>
      </div>
      <div className="list-controls">
        <div className="search-box">
          <Search size={20} />
          <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="filter-buttons">
          {['all', 'draft', 'sent', 'approved'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <p>No projects found</p>
            <button className="btn btn-secondary" onClick={onNewProject}>Create Your First Project</button>
          </div>
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className="project-card" onClick={() => onProjectSelect(project)}>
              <div className="project-card-header">
                <h3>{project.name}</h3>
                <span className={`status-badge ${project.status}`}>{project.status}</span>
              </div>
              <div className="project-card-body">
                <div className="project-info"><span className="info-label">Client:</span><span className="info-value">{project.client_name || 'N/A'}</span></div>
                <div className="project-info"><Calendar size={16} /><span className="info-value">{formatDate(project.date_created)}</span></div>
                <div className="project-total"><DollarSign size={16} /><span className="total-amount">{formatCurrency(project.total_amount)}</span></div>
              </div>
              <div className="project-card-actions">
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onProjectSelect(project); }} title="Edit"><Edit size={18} /></button>
                <button className="icon-btn danger" onClick={(e) => handleDelete(e, project.id)} title="Delete"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectList;
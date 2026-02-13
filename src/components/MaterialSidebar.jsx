import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, Plus, Database } from 'lucide-react';

function MaterialSidebar({ isOpen, onClose, onSelectMaterial }) {
    const { dbService } = useApp();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (dbService) {
            const cats = dbService.getCategories();
            setCategories([{ name: 'All' }, ...cats]);
            loadMaterials();
        }
    }, [dbService]);

    useEffect(() => {
        loadMaterials();
    }, [query, activeCategory]);

    const loadMaterials = () => {
        if (!dbService) return;

        let materials = [];
        if (query.trim()) {
            materials = dbService.searchMaterials(query);
            // Also filter by category if one is selected
            if (activeCategory !== 'All') {
                materials = materials.filter(m => m.category === activeCategory);
            }
        } else {
            materials = dbService.getMaterialsLibrary(activeCategory === 'All' ? null : activeCategory);
        }
        setResults(materials);
    };

    if (!isOpen) return null;

    return (
        <div className="material-sidebar">
            <div className="sidebar-header">
                <h3><Database size={20} /> Material Library</h3>
                <button className="icon-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="sidebar-search">
                <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search catalog..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="sidebar-categories">
                {categories.map(cat => (
                    <button
                        key={cat.name}
                        className={`category-chip ${activeCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.name)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="sidebar-results">
                {results.length === 0 ? (
                    <div className="no-results">No materials found.</div>
                ) : (
                    results.map(material => (
                        <div key={material.id} className="material-card">
                            <div className="material-header">
                                <h4>{material.item_name}</h4>
                                <div className="material-actions">
                                    <button
                                        className="icon-btn success small"
                                        onClick={() => onSelectMaterial(material)}
                                        title="Add to Estimate"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="material-desc">{material.description}</p>
                            <div className="material-meta">
                                <span className="price">${material.material_cost.toFixed(2)}</span>
                                <span className="labor">{material.typical_labor_hours}h labor</span>
                                <span className="unit">per {material.unit}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default MaterialSidebar;

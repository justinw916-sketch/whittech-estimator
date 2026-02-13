import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Package, X } from 'lucide-react';

function QuickAdd({ isOpen, onClose, onSelectMaterial }) {
    const { dbService } = useApp();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [allMaterials, setAllMaterials] = useState([]);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Load all materials on mount
    useEffect(() => {
        if (isOpen && dbService) {
            const materials = dbService.getMaterialsLibrary();
            setAllMaterials(materials);
            setResults(materials.slice(0, 20));
        }
    }, [isOpen, dbService]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search as user types
    useEffect(() => {
        if (!dbService) return;

        if (query.trim() === '') {
            setResults(allMaterials.slice(0, 20));
        } else {
            const filtered = dbService.searchMaterials(query);
            setResults(filtered);
        }
        setSelectedIndex(0);
    }, [query, dbService, allMaterials]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && results.length > 0) {
            const selectedItem = listRef.current.children[selectedIndex];
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, results]);

    const handleSelect = useCallback((material) => {
        onSelectMaterial({
            category: material.category,
            description: material.item_name,
            unit: material.unit,
            material_cost: material.material_cost,
            labor_hours: material.typical_labor_hours
        });
        onClose();
    }, [onSelectMaterial, onClose]);

    const handleKeyDown = useCallback((e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
            default:
                break;
        }
    }, [results, selectedIndex, onClose, handleSelect]);

    if (!isOpen) return null;

    return (
        <div className="quick-add-overlay" onClick={onClose}>
            <div className="quick-add-modal" onClick={e => e.stopPropagation()}>
                <div className="quick-add-header">
                    <Search size={20} className="search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search materials... (e.g., outlet, drywall, toilet)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="quick-add-input"
                    />
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="quick-add-results" ref={listRef}>
                    {results.length === 0 ? (
                        <div className="no-results">
                            No materials found. Try a different search term.
                        </div>
                    ) : (
                        results.map((material, index) => (
                            <div
                                key={material.id}
                                className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSelect(material)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="result-icon">
                                    <Package size={18} />
                                </div>
                                <div className="result-content">
                                    <div className="result-name">{material.item_name}</div>
                                    <div className="result-meta">
                                        <span className="result-category">{material.category}</span>
                                        <span className="result-cost">${material.material_cost.toFixed(2)}</span>
                                        {material.typical_labor_hours > 0 && (
                                            <span className="result-labor">{material.typical_labor_hours}h labor</span>
                                        )}
                                    </div>
                                </div>
                                <div className="result-unit">{material.unit}</div>
                            </div>
                        ))
                    )}
                </div>

                <div className="quick-add-footer">
                    <span className="hint">↑↓ Navigate</span>
                    <span className="hint">↵ Select</span>
                    <span className="hint">Esc Close</span>
                </div>
            </div>
        </div>
    );
}

export default QuickAdd;

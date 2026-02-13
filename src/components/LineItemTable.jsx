import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Copy, Search, FileText, Eraser } from 'lucide-react';
import QuickAdd from './QuickAdd';

function LineItemTable({ projectId, lineItems, onRefresh, projectData }) {
  const { categories, companySettings, dbService } = useApp();
  const [rows, setRows] = useState([]);
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTargetRow, setQuickAddTargetRow] = useState(null);
  const tableRef = useRef(null);
  const inputRefs = useRef({});
  const updateTimers = useRef({});

  const createEmptyRow = useCallback((index) => ({
    id: `temp-${Date.now()}-${index}`,
    isNew: true,
    category: categories[0]?.name || '',
    description: '',
    quantity: 1,
    unit: 'EA',
    material_cost: 0,
    labor_hours: 0,
    labor_rate: companySettings?.default_labor_rate || 75,
    markup_percent: companySettings?.default_markup_percent || 20,
    material_markup_pct: companySettings?.default_material_markup_pct || 0,
    labor_markup_pct: companySettings?.default_labor_markup_pct || 0,
    overhead_pct: companySettings?.default_overhead_pct ?? 10,
    profit_pct: companySettings?.default_profit_pct ?? 10,
    project_id: projectId
  }), [categories, companySettings, projectId]);

  // Initialize with existing items + empty rows to make 20 minimum
  useEffect(() => {
    const savedItems = lineItems.map(item => ({ ...item, isNew: false }));
    const emptyCount = Math.max(0, 20 - savedItems.length);
    const emptyRows = Array.from({ length: emptyCount }, (_, i) => createEmptyRow(i));
    setRows([...savedItems, ...emptyRows]);
  }, [lineItems, createEmptyRow]);

  const columns = [
    { key: 'category', label: 'Category', type: 'select', width: '140px' },
    { key: 'description', label: 'Description', type: 'text', width: '200px' },
    { key: 'spec_url', label: 'Spec', type: 'link', width: '50px' },
    { key: 'quantity', label: 'Qty', type: 'number', width: '70px', step: '0.01' },
    { key: 'unit', label: 'Unit', type: 'select', width: '70px' },
    { key: 'material_cost', label: 'Material $', type: 'number', width: '100px', step: '0.01' },
    { key: 'material_markup_pct', label: 'Mat M%', type: 'number', width: '70px', step: '1' },
    { key: 'labor_hours', label: 'Labor Hrs', type: 'number', width: '90px', step: '0.25' },
    { key: 'labor_rate', label: 'Labor Rate', type: 'number', width: '100px', step: '0.01' },
    { key: 'labor_markup_pct', label: 'Lab M%', type: 'number', width: '70px', step: '1' },
    { key: 'overhead_pct', label: 'OH %', type: 'number', width: '70px', step: '1' },
    { key: 'profit_pct', label: 'Profit %', type: 'number', width: '70px', step: '1' }
  ];

  const units = ['EA', 'FT', 'LF', 'SF', 'SY', 'BOX', 'RL', 'PK', 'SPL', 'HR', 'DAY', 'LS'];

  const handleCellChange = async (rowIndex, key, value) => {
    const newRows = [...rows];
    const row = newRows[rowIndex];

    if (key === 'quantity' || key === 'material_cost' || key === 'labor_hours' ||
      key === 'labor_rate' || key === 'markup_percent' || key === 'material_markup_pct' ||
      key === 'labor_markup_pct' || key === 'overhead_pct' || key === 'profit_pct') {
      value = parseFloat(value) || 0;
    }

    row[key] = value;
    setRows(newRows);

    // Auto-save: if row has content and is new, create it
    if (row.isNew && row.description.trim()) {
      try {
        const result = await dbService.createLineItem({
          project_id: projectId,
          category: row.category,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          material_cost: row.material_cost,
          labor_hours: row.labor_hours,
          labor_rate: row.labor_rate,
          markup_percent: row.markup_percent,
          material_markup_pct: row.material_markup_pct,
          labor_markup_pct: row.labor_markup_pct,
          overhead_pct: row.overhead_pct,
          profit_pct: row.profit_pct,
          notes: ''
        });
        if (result.success) {
          row.id = result.lineItem.id;
          row.isNew = false;
          setRows([...newRows]);
          onRefresh();
        }
      } catch (err) {
        console.error('Error auto-saving:', err);
      }
    } else if (!row.isNew) {
      // Debounced update for existing rows
      const timerId = row.id;
      if (updateTimers.current[timerId]) {
        clearTimeout(updateTimers.current[timerId]);
      }
      updateTimers.current[timerId] = setTimeout(async () => {
        try {
          await dbService.updateLineItem(row.id, row);
          onRefresh();
        } catch (err) {
          console.error('Error updating:', err);
        }
        delete updateTimers.current[timerId];
      }, 500);
    }
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    const maxRow = rows.length - 1;
    const maxCol = columns.length - 1;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Move left/up
          if (colIndex > 0) {
            setFocusedCell({ row: rowIndex, col: colIndex - 1 });
          } else if (rowIndex > 0) {
            setFocusedCell({ row: rowIndex - 1, col: maxCol });
          }
        } else {
          // Move right/down
          if (colIndex < maxCol) {
            setFocusedCell({ row: rowIndex, col: colIndex + 1 });
          } else if (rowIndex < maxRow) {
            setFocusedCell({ row: rowIndex + 1, col: 0 });
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (rowIndex < maxRow) {
          setFocusedCell({ row: rowIndex + 1, col: colIndex });
        }
        break;
      case 'ArrowDown':
        if (rowIndex < maxRow) {
          e.preventDefault();
          setFocusedCell({ row: rowIndex + 1, col: colIndex });
        }
        break;
      case 'ArrowUp':
        if (rowIndex > 0) {
          e.preventDefault();
          setFocusedCell({ row: rowIndex - 1, col: colIndex });
        }
        break;
      default:
        break;
    }
  };

  // Focus management
  useEffect(() => {
    const key = `${focusedCell.row}-${focusedCell.col}`;
    const input = inputRefs.current[key];
    if (input) {
      input.focus();
      if (input.select) input.select();
    }
  }, [focusedCell]);

  const handleDeleteRow = async (rowIndex) => {
    const row = rows[rowIndex];
    if (!row.isNew) {
      await dbService.deleteLineItem(row.id);
      onRefresh();
    }
    const newRows = rows.filter((_, i) => i !== rowIndex);
    // Ensure minimum 20 rows
    if (newRows.length < 20) {
      newRows.push(createEmptyRow(newRows.length));
    }
    setRows(newRows);
  };

  const handleDuplicateRow = async (rowIndex) => {
    const row = rows[rowIndex];
    const newRow = { ...row, id: `temp-${Date.now()}`, isNew: true };
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);

    // Auto-save the duplicate immediately if it has content
    if (newRow.description && !row.isNew) {
      try {
        const result = await dbService.createLineItem({
          project_id: projectId,
          category: newRow.category,
          description: newRow.description,
          quantity: newRow.quantity,
          unit: newRow.unit,
          material_cost: newRow.material_cost,
          labor_hours: newRow.labor_hours,
          labor_rate: newRow.labor_rate,
          markup_percent: newRow.markup_percent,
          material_markup_pct: newRow.material_markup_pct,
          labor_markup_pct: newRow.labor_markup_pct,
          overhead_pct: newRow.overhead_pct,
          profit_pct: newRow.profit_pct,
          notes: newRow.notes || ''
        });
        if (result.success) {
          newRow.id = result.lineItem.id;
          newRow.isNew = false;
          setRows([...newRows]);
          onRefresh();
        }
      } catch (err) {
        console.error('Error auto-saving duplicate:', err);
      }
    }
  };

  const handleAddRows = () => {
    const newRows = Array.from({ length: 10 }, (_, i) => createEmptyRow(rows.length + i));
    setRows([...rows, ...newRows]);
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear ALL line items? This cannot be undone.')) return;
    // Delete all saved rows from DB
    for (const row of rows) {
      if (!row.isNew) {
        try { await dbService.deleteLineItem(row.id); } catch (e) { console.error(e); }
      }
    }
    // Reset to 20 empty rows
    const emptyRows = Array.from({ length: 20 }, (_, i) => createEmptyRow(i));
    setRows(emptyRows);
    onRefresh();
  };

  // Handle material selection from QuickAdd
  const handleMaterialSelect = async (rowIndex, material) => {
    const newRows = [...rows];
    const row = newRows[rowIndex];

    row.category = material.category;
    row.description = material.description;
    row.unit = material.unit;
    row.material_cost = material.material_cost;
    row.labor_hours = material.labor_hours;

    setRows(newRows);

    // Auto-save if it's a new row
    if (row.isNew && material.description) {
      try {
        const result = await dbService.createLineItem({
          project_id: projectId,
          category: row.category,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          material_cost: row.material_cost,
          labor_hours: row.labor_hours,
          labor_rate: row.labor_rate,
          markup_percent: row.markup_percent,
          material_markup_pct: row.material_markup_pct,
          labor_markup_pct: row.labor_markup_pct,
          overhead_pct: row.overhead_pct,
          profit_pct: row.profit_pct,
          notes: ''
        });
        if (result.success) {
          row.id = result.lineItem.id;
          row.isNew = false;
          setRows([...newRows]);
          onRefresh();
        }
      } catch (err) {
        console.error('Error auto-saving:', err);
      }
    } else if (!row.isNew) {
      try {
        await dbService.updateLineItem(row.id, row);
        onRefresh();
      } catch (err) {
        console.error('Error updating:', err);
      }
    }

    // Move to qty field for quick editing
    setFocusedCell({ row: rowIndex, col: 3 });
  };

  // Global Ctrl+K handler
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickAddTargetRow(focusedCell.row);
        setQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [focusedCell.row]);

  const calculateItemTotal = (item) => {
    const matBase = (item.quantity || 0) * (item.material_cost || 0);
    const matMarkup = matBase * ((item.material_markup_pct || 0) / 100);
    const materialTotal = matBase + matMarkup;

    const labBase = (item.quantity || 0) * (item.labor_hours || 0) * (item.labor_rate || 0);
    const labMarkup = labBase * ((item.labor_markup_pct || 0) / 100);
    const laborTotal = labBase + labMarkup;

    const subtotal = materialTotal + laborTotal;
    const overhead = subtotal * ((item.overhead_pct || 0) / 100);
    const profit = (subtotal + overhead) * ((item.profit_pct || 0) / 100);
    return subtotal + overhead + profit;
  };

  const calculateTotals = () => {
    const taxRate = (projectData?.material_tax_rate || 0) / 100;
    const contingencyPct = (projectData?.contingency_pct || 0) / 100;
    let materialBase = 0, materialMarkup = 0, laborBase = 0, laborMarkup = 0;
    let overheadTotal = 0, profitTotal = 0, grandTotal = 0;

    rows.forEach(item => {
      if (item.description) {
        const matBase = (item.quantity || 0) * (item.material_cost || 0);
        const matMkup = matBase * ((item.material_markup_pct || 0) / 100);
        materialBase += matBase;
        materialMarkup += matMkup;

        const labBase = (item.quantity || 0) * (item.labor_hours || 0) * (item.labor_rate || 0);
        const labMkup = labBase * ((item.labor_markup_pct || 0) / 100);
        laborBase += labBase;
        laborMarkup += labMkup;

        const subtotal = (matBase + matMkup) + (labBase + labMkup);
        const oh = subtotal * ((item.overhead_pct || 0) / 100);
        const pft = (subtotal + oh) * ((item.profit_pct || 0) / 100);
        overheadTotal += oh;
        profitTotal += pft;
        grandTotal += subtotal + oh + pft;
      }
    });

    const materialTaxTotal = (materialBase + materialMarkup) * taxRate;
    const preContingency = grandTotal + materialTaxTotal;
    const contingencyAmount = preContingency * contingencyPct;
    const finalTotal = preContingency + contingencyAmount;

    return {
      materialBase, materialMarkup, materialTaxTotal,
      laborBase, laborMarkup,
      overheadTotal, profitTotal,
      contingencyAmount, contingencyPct: projectData?.contingency_pct || 0,
      taxRate: projectData?.material_tax_rate || 0,
      grandTotal: finalTotal
    };
  };

  const totals = calculateTotals();
  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;

  const renderCell = (row, rowIndex, col, colIndex) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const isFocused = focusedCell.row === rowIndex && focusedCell.col === colIndex;

    const commonProps = {
      ref: (el) => { inputRefs.current[cellKey] = el; },
      onFocus: () => setFocusedCell({ row: rowIndex, col: colIndex }),
      onKeyDown: (e) => handleKeyDown(e, rowIndex, colIndex),
      className: `cell-input ${isFocused ? 'focused' : ''}`
    };

    if (col.type === 'select' && col.key === 'category') {
      return (
        <select
          {...commonProps}
          value={row[col.key]}
          onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      );
    }

    if (col.type === 'select' && col.key === 'unit') {
      return (
        <select
          {...commonProps}
          value={row[col.key]}
          onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
        >
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      );
    }

    if (col.type === 'link') {
      return (
        <div className="cell-input" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {row.spec_url ? (
            <a
              href={row.spec_url}
              target="_blank"
              rel="noopener noreferrer"
              title="View Spec"
              style={{ color: 'var(--primary-color)', display: 'flex' }}
              onClick={(e) => e.stopPropagation()}
            >
              <FileText size={16} />
            </a>
          ) : (
            <span style={{ opacity: 0.2 }}><FileText size={16} /></span>
          )}
        </div>
      );
    }

    return (
      <input
        {...commonProps}
        type={col.type}
        value={row[col.key]}
        onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
        step={col.step}
        min={col.type === 'number' ? '0' : undefined}
      />
    );
  };

  return (
    <div className="line-items-container">
      <div className="line-items-header">
        <h3>Line Items <span className="row-count">({rows.filter(r => r.description).length} items)</span></h3>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={handleClearAll} title="Clear all line items">
            <Eraser size={16} /> Clear Form
          </button>
          <button className="btn btn-secondary" onClick={() => { setQuickAddTargetRow(focusedCell.row); setQuickAddOpen(true); }}>
            <Search size={16} /> Quick Add (Ctrl+K)
          </button>
          <span className="keyboard-hint">Tab/Enter to navigate</span>
        </div>
      </div>

      <div className="table-container spreadsheet-table" ref={tableRef}>
        <table className="line-items-table">
          <thead>
            <tr>
              <th className="row-num-header">#</th>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
              ))}
              <th style={{ width: '80px' }}>Total</th>
              <th style={{ width: '60px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className={`data-row ${row.isNew ? 'new-row' : 'saved-row'}`}>
                <td className="row-num">{rowIndex + 1}</td>
                {columns.map((col, colIndex) => (
                  <td key={col.key} className="editable-cell">
                    {renderCell(row, rowIndex, col, colIndex)}
                  </td>
                ))}
                <td className="total-cell">{formatCurrency(calculateItemTotal(row))}</td>
                <td className="actions-cell">
                  <button
                    className="icon-btn small"
                    onClick={() => handleDuplicateRow(rowIndex)}
                    title="Duplicate row"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="icon-btn danger small"
                    onClick={() => handleDeleteRow(rowIndex)}
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan="6" className="totals-label">Materials:</td>
              <td colSpan="7" className="totals-value">{formatCurrency(totals.materialBase)}</td>
              <td colSpan="2"></td>
            </tr>
            {totals.materialMarkup > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Material Markup:</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.materialMarkup)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            {totals.taxRate > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Material Sales Tax ({totals.taxRate}%):</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.materialTaxTotal)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            <tr className="totals-row">
              <td colSpan="6" className="totals-label">Labor:</td>
              <td colSpan="7" className="totals-value">{formatCurrency(totals.laborBase)}</td>
              <td colSpan="2"></td>
            </tr>
            {totals.laborMarkup > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Labor Markup:</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.laborMarkup)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            {totals.overheadTotal > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Overhead:</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.overheadTotal)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            {totals.profitTotal > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Profit:</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.profitTotal)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            {totals.contingencyAmount > 0 && (
              <tr className="totals-row">
                <td colSpan="6" className="totals-label">Contingency ({totals.contingencyPct}%):</td>
                <td colSpan="7" className="totals-value">{formatCurrency(totals.contingencyAmount)}</td>
                <td colSpan="2"></td>
              </tr>
            )}
            <tr className="totals-row grand-total">
              <td colSpan="6" className="totals-label">GRAND TOTAL:</td>
              <td colSpan="7" className="totals-value">{formatCurrency(totals.grandTotal)}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="table-actions">
        <button className="btn btn-secondary" onClick={handleAddRows}>
          <Plus size={18} /> Add 10 More Rows
        </button>
      </div>

      <QuickAdd
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelectMaterial={(material) => {
          const targetRow = quickAddTargetRow !== null ? quickAddTargetRow : focusedCell.row;
          handleMaterialSelect(targetRow, material);
        }}
      />
    </div>
  );
}

export default LineItemTable;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Copy, Search } from 'lucide-react';
import QuickAdd from './QuickAdd';

function LineItemTable({ projectId, lineItems, onRefresh }) {
  const { categories, companySettings, dbService } = useApp();
  const [rows, setRows] = useState([]);
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTargetRow, setQuickAddTargetRow] = useState(null);
  const tableRef = useRef(null);
  const inputRefs = useRef({});

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
    { key: 'quantity', label: 'Qty', type: 'number', width: '70px', step: '0.01' },
    { key: 'unit', label: 'Unit', type: 'select', width: '70px' },
    { key: 'material_cost', label: 'Material $', type: 'number', width: '100px', step: '0.01' },
    { key: 'labor_hours', label: 'Labor Hrs', type: 'number', width: '90px', step: '0.25' },
    { key: 'labor_rate', label: 'Labor Rate', type: 'number', width: '100px', step: '0.01' },
    { key: 'markup_percent', label: 'Markup %', type: 'number', width: '90px', step: '1' }
  ];

  const units = ['EA', 'FT', 'LF', 'SF', 'SY', 'HR', 'DAY', 'LS'];

  const handleCellChange = async (rowIndex, key, value) => {
    const newRows = [...rows];
    const row = newRows[rowIndex];

    if (key === 'quantity' || key === 'material_cost' || key === 'labor_hours' ||
      key === 'labor_rate' || key === 'markup_percent') {
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
      // Update existing row (debounced would be better, but simple for now)
      try {
        await dbService.updateLineItem(row.id, row);
        onRefresh();
      } catch (err) {
        console.error('Error updating:', err);
      }
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

  const handleDuplicateRow = (rowIndex) => {
    const row = rows[rowIndex];
    const newRow = { ...row, id: `temp-${Date.now()}`, isNew: true };
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
  };

  const handleAddRows = () => {
    const newRows = Array.from({ length: 10 }, (_, i) => createEmptyRow(rows.length + i));
    setRows([...rows, ...newRows]);
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
    setFocusedCell({ row: rowIndex, col: 2 });
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
    const materialTotal = (item.quantity || 0) * (item.material_cost || 0);
    const laborTotal = (item.quantity || 0) * (item.labor_hours || 0) * (item.labor_rate || 0);
    const subtotal = materialTotal + laborTotal;
    return subtotal * (1 + (item.markup_percent || 0) / 100);
  };

  const calculateTotals = () => {
    let materialTotal = 0, laborTotal = 0, grandTotal = 0;
    rows.forEach(item => {
      if (item.description) { // Only count rows with descriptions
        materialTotal += (item.quantity || 0) * (item.material_cost || 0);
        laborTotal += (item.quantity || 0) * (item.labor_hours || 0) * (item.labor_rate || 0);
        grandTotal += calculateItemTotal(item);
      }
    });
    return { materialTotal, laborTotal, grandTotal };
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
              <td colSpan="5" className="totals-label">Material Total:</td>
              <td colSpan="4" className="totals-value">{formatCurrency(totals.materialTotal)}</td>
              <td colSpan="2"></td>
            </tr>
            <tr className="totals-row">
              <td colSpan="5" className="totals-label">Labor Total:</td>
              <td colSpan="4" className="totals-value">{formatCurrency(totals.laborTotal)}</td>
              <td colSpan="2"></td>
            </tr>
            <tr className="totals-row grand-total">
              <td colSpan="5" className="totals-label">GRAND TOTAL:</td>
              <td colSpan="4" className="totals-value">{formatCurrency(totals.grandTotal)}</td>
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

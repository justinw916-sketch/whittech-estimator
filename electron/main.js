const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const DatabaseManager = require('./database');
const XLSX = require('xlsx');
const fs = require('fs');

let mainWindow;
let db;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'WhitTech Estimator',
        icon: path.join(__dirname, '../assets/icon.png')
    });

    // Load app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Initialize database
    db = new DatabaseManager();
    
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.close();
        app.quit();
    }
});

// IPC Handlers - Projects
ipcMain.handle('create-project', async (event, projectData) => {
    try {
        const id = db.createProject(projectData);
        return { success: true, id };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-projects', async () => {
    try {
        const projects = db.getProjects();
        return { success: true, projects };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-project', async (event, id) => {
    try {
        const project = db.getProject(id);
        return { success: true, project };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-project', async (event, id, projectData) => {
    try {
        db.updateProject(id, projectData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-project', async (event, id) => {
    try {
        db.deleteProject(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handlers - Line Items
ipcMain.handle('create-line-item', async (event, lineItemData) => {
    try {
        const id = db.createLineItem(lineItemData);
        db.calculateProjectTotal(lineItemData.project_id);
        return { success: true, id };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-line-items', async (event, projectId) => {
    try {
        const lineItems = db.getLineItems(projectId);
        return { success: true, lineItems };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-line-item', async (event, id, lineItemData) => {
    try {
        db.updateLineItem(id, lineItemData);
        const projectId = lineItemData.project_id;
        db.calculateProjectTotal(projectId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-line-item', async (event, id, projectId) => {
    try {
        db.deleteLineItem(id);
        db.calculateProjectTotal(projectId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handlers - Materials Library
ipcMain.handle('add-to-materials-library', async (event, materialData) => {
    try {
        db.addToMaterialsLibrary(materialData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-materials-library', async (event, category) => {
    try {
        const materials = db.getMaterialsLibrary(category);
        return { success: true, materials };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handlers - Categories
ipcMain.handle('get-categories', async () => {
    try {
        const categories = db.getCategories();
        return { success: true, categories };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handlers - Company Settings
ipcMain.handle('get-company-settings', async () => {
    try {
        const settings = db.getCompanySettings();
        return { success: true, settings };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-company-settings', async (event, settings) => {
    try {
        db.updateCompanySettings(settings);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Excel Export
ipcMain.handle('export-to-excel', async (event, projectId) => {
    try {
        const project = db.getProject(projectId);
        const lineItems = db.getLineItems(projectId);
        
        // Create worksheet data
        const worksheetData = [
            ['Project Name:', project.name],
            ['Client:', project.client_name],
            ['Date:', new Date(project.date_created).toLocaleDateString()],
            [],
            ['Category', 'Description', 'Quantity', 'Unit', 'Material Cost', 'Labor Hours', 'Labor Rate', 'Markup %', 'Total']
        ];
        
        lineItems.forEach(item => {
            const materialTotal = item.quantity * item.material_cost;
            const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
            const subtotal = materialTotal + laborTotal;
            const itemTotal = subtotal * (1 + item.markup_percent / 100);
            
            worksheetData.push([
                item.category,
                item.description,
                item.quantity,
                item.unit,
                item.material_cost,
                item.labor_hours,
                item.labor_rate,
                item.markup_percent,
                itemTotal.toFixed(2)
            ]);
        });
        
        // Add total
        worksheetData.push([]);
        worksheetData.push(['', '', '', '', '', '', '', 'TOTAL:', project.total_amount.toFixed(2)]);
        
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Estimate');
        
        // Show save dialog
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Estimate to Excel',
            defaultPath: `${project.name}-estimate.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });
        
        if (!result.canceled) {
            XLSX.writeFile(workbook, result.filePath);
            return { success: true, filePath: result.filePath };
        }
        
        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Excel Import
ipcMain.handle('import-from-excel', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Import from Excel',
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
            properties: ['openFile']
        });
        
        if (result.canceled) {
            return { success: false, canceled: true };
        }
        
        const workbook = XLSX.readFile(result.filePaths[0]);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

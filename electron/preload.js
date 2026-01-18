const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Projects
    createProject: (projectData) => ipcRenderer.invoke('create-project', projectData),
    getProjects: () => ipcRenderer.invoke('get-projects'),
    getProject: (id) => ipcRenderer.invoke('get-project', id),
    updateProject: (id, projectData) => ipcRenderer.invoke('update-project', id, projectData),
    deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
    
    // Line Items
    createLineItem: (lineItemData) => ipcRenderer.invoke('create-line-item', lineItemData),
    getLineItems: (projectId) => ipcRenderer.invoke('get-line-items', projectId),
    updateLineItem: (id, lineItemData) => ipcRenderer.invoke('update-line-item', id, lineItemData),
    deleteLineItem: (id, projectId) => ipcRenderer.invoke('delete-line-item', id, projectId),
    
    // Materials Library
    addToMaterialsLibrary: (materialData) => ipcRenderer.invoke('add-to-materials-library', materialData),
    getMaterialsLibrary: (category) => ipcRenderer.invoke('get-materials-library', category),
    
    // Categories
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // Company Settings
    getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
    updateCompanySettings: (settings) => ipcRenderer.invoke('update-company-settings', settings),
    
    // Import/Export
    exportToExcel: (projectId) => ipcRenderer.invoke('export-to-excel', projectId),
    importFromExcel: () => ipcRenderer.invoke('import-from-excel')
});

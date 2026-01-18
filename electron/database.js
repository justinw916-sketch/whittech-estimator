const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseManager {
    constructor() {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'whittech-estimator.db');
        
        console.log('Database path:', dbPath);
        
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeDatabase();
    }

    initializeDatabase() {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        this.db.exec(schema);
        console.log('Database initialized successfully');
    }

    // Projects
    createProject(projectData) {
        const stmt = this.db.prepare(`
            INSERT INTO projects (project_number, name, client_name, client_company, 
                                 client_email, client_phone, client_address, description, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            projectData.project_number,
            projectData.name,
            projectData.client_name,
            projectData.client_company,
            projectData.client_email,
            projectData.client_phone,
            projectData.client_address,
            projectData.description,
            projectData.notes
        );
        
        return result.lastInsertRowid;
    }

    getProjects() {
        const stmt = this.db.prepare('SELECT * FROM projects ORDER BY date_created DESC');
        return stmt.all();
    }

    getProject(id) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        return stmt.get(id);
    }

    updateProject(id, projectData) {
        const stmt = this.db.prepare(`
            UPDATE projects 
            SET name = ?, client_name = ?, client_company = ?, client_email = ?, 
                client_phone = ?, client_address = ?, description = ?, notes = ?,
                status = ?, date_modified = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        return stmt.run(
            projectData.name,
            projectData.client_name,
            projectData.client_company,
            projectData.client_email,
            projectData.client_phone,
            projectData.client_address,
            projectData.description,
            projectData.notes,
            projectData.status,
            id
        );
    }

    deleteProject(id) {
        const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
        return stmt.run(id);
    }

    // Line Items
    createLineItem(lineItemData) {
        const stmt = this.db.prepare(`
            INSERT INTO line_items (project_id, category, description, quantity, unit,
                                   material_cost, labor_hours, labor_rate, markup_percent, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            lineItemData.project_id,
            lineItemData.category,
            lineItemData.description,
            lineItemData.quantity,
            lineItemData.unit,
            lineItemData.material_cost,
            lineItemData.labor_hours,
            lineItemData.labor_rate,
            lineItemData.markup_percent,
            lineItemData.notes
        );
        
        return result.lastInsertRowid;
    }

    getLineItems(projectId) {
        const stmt = this.db.prepare('SELECT * FROM line_items WHERE project_id = ? ORDER BY sort_order, id');
        return stmt.all(projectId);
    }

    updateLineItem(id, lineItemData) {
        const stmt = this.db.prepare(`
            UPDATE line_items 
            SET category = ?, description = ?, quantity = ?, unit = ?,
                material_cost = ?, labor_hours = ?, labor_rate = ?, 
                markup_percent = ?, notes = ?
            WHERE id = ?
        `);
        
        return stmt.run(
            lineItemData.category,
            lineItemData.description,
            lineItemData.quantity,
            lineItemData.unit,
            lineItemData.material_cost,
            lineItemData.labor_hours,
            lineItemData.labor_rate,
            lineItemData.markup_percent,
            lineItemData.notes,
            id
        );
    }

    deleteLineItem(id) {
        const stmt = this.db.prepare('DELETE FROM line_items WHERE id = ?');
        return stmt.run(id);
    }

    // Calculate project total
    calculateProjectTotal(projectId) {
        const lineItems = this.getLineItems(projectId);
        
        let total = 0;
        lineItems.forEach(item => {
            const materialTotal = item.quantity * item.material_cost;
            const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
            const subtotal = materialTotal + laborTotal;
            const itemTotal = subtotal * (1 + item.markup_percent / 100);
            total += itemTotal;
        });
        
        // Update project total
        const stmt = this.db.prepare('UPDATE projects SET total_amount = ? WHERE id = ?');
        stmt.run(total, projectId);
        
        return total;
    }

    // Materials Library
    addToMaterialsLibrary(materialData) {
        const stmt = this.db.prepare(`
            INSERT INTO materials_library (category, item_name, description, unit,
                                          material_cost, typical_labor_hours, manufacturer, part_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        return stmt.run(
            materialData.category,
            materialData.item_name,
            materialData.description,
            materialData.unit,
            materialData.material_cost,
            materialData.typical_labor_hours,
            materialData.manufacturer,
            materialData.part_number
        );
    }

    getMaterialsLibrary(category = null) {
        let stmt;
        if (category) {
            stmt = this.db.prepare('SELECT * FROM materials_library WHERE category = ? ORDER BY item_name');
            return stmt.all(category);
        } else {
            stmt = this.db.prepare('SELECT * FROM materials_library ORDER BY category, item_name');
            return stmt.all();
        }
    }

    // Categories
    getCategories() {
        const stmt = this.db.prepare('SELECT * FROM categories ORDER BY sort_order');
        return stmt.all();
    }

    // Company Settings
    getCompanySettings() {
        const stmt = this.db.prepare('SELECT * FROM company_settings WHERE id = 1');
        return stmt.get();
    }

    updateCompanySettings(settings) {
        const stmt = this.db.prepare(`
            UPDATE company_settings 
            SET company_name = ?, address = ?, phone = ?, email = ?, website = ?,
                default_labor_rate = ?, default_markup_percent = ?, tax_rate = ?, proposal_terms = ?
            WHERE id = 1
        `);
        
        return stmt.run(
            settings.company_name,
            settings.address,
            settings.phone,
            settings.email,
            settings.website,
            settings.default_labor_rate,
            settings.default_markup_percent,
            settings.tax_rate,
            settings.proposal_terms
        );
    }

    close() {
        this.db.close();
    }
}

module.exports = DatabaseManager;

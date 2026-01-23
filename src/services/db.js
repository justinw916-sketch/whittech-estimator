import initSqlJs from 'sql.js';
import localforage from 'localforage';

let db = null;
const DB_NAME = 'whittech-estimator.db';

export const dbService = {
    async init() {
        if (db) return db;

        try {
            const SQL = await initSqlJs({
                locateFile: file => `/${file}`
            });

            const savedDb = await localforage.getItem(DB_NAME);

            if (savedDb) {
                db = new SQL.Database(new Uint8Array(savedDb));
                console.log('Loaded existing database from IndexedDB');
                // Run migrations for existing databases
                this.migrateData();
            } else {
                db = new SQL.Database();
                console.log('Created new in-memory database');
                this.initSchema();
                this.seedData();
            }

            return db;
        } catch (err) {
            console.error('Failed to initialize database:', err);
            throw err;
        }
    },

    migrateData() {
        // Check for old categories to trigger migration
        const oldCategory = this.queryOne('SELECT COUNT(*) as count FROM categories WHERE name = ?', ['Plumbing']);

        if (oldCategory && oldCategory.count > 0) {
            console.log('Migrating: Detected legacy categories. Clearing database for Low Voltage conversion...');
            db.run('DELETE FROM categories');
            db.run('DELETE FROM materials_library');
            // Re-seed with new data
            this.seedCategories();
            this.seedMaterialsLibrary();
        } else {
            // Normal startup checks
            const categoryCount = this.queryOne('SELECT COUNT(*) as count FROM categories');
            if (!categoryCount || categoryCount.count === 0) {
                console.log('Seeding initial categories...');
                this.seedCategories();
            }

            const materialCount = this.queryOne('SELECT COUNT(*) as count FROM materials_library');
            if (!materialCount || materialCount.count === 0) {
                console.log('Seeding initial materials...');
                this.seedMaterialsLibrary();
            }
        }

        this.save();
    },

    seedCategories() {
        const categories = [
            ['Structured Cabling', 1],
            ['Access Control', 2],
            ['Video Surveillance', 3],
            ['Intrusion Detection', 4],
            ['Audio/Visual', 5],
            ['Network Infrastructure', 6],
            ['Conduit & Pathway', 7],
            ['Fiber Optics', 8],
            ['Labor', 9],
            ['General / Misc', 10]
        ];

        categories.forEach(([name, sort_order]) => {
            try {
                db.run('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)', [name, sort_order]);
            } catch (e) { }
        });
    },

    seedMaterialsLibrary() {
        const materials = [
            // Structured Cabling
            ['Structured Cabling', 'Cat6 Cable (1000ft)', 'Cat6 Plenum Rated Cable, 1000ft Box (Blue/White)', 'BOX', 285.00, 2.0],
            ['Structured Cabling', 'Cat6A Cable (1000ft)', 'Cat6A Plenum Rated Cable, 1000ft Spool', 'SPL', 380.00, 2.5],
            ['Structured Cabling', 'Cat6 Keystone Jack', 'Cat6 RJ45 Keystone Jack, Blue', 'EA', 3.50, 0.15],
            ['Structured Cabling', 'Cat6A Keystone Jack', 'Cat6A RJ45 Shielded Keystone Jack', 'EA', 6.50, 0.2],
            ['Structured Cabling', 'Patch Panel 24-Port', '24-Port Modular Patch Panel (Unloaded)', 'EA', 45.00, 0.5],
            ['Structured Cabling', 'Patch Panel 48-Port', '48-Port Modular Patch Panel (Unloaded)', 'EA', 85.00, 1.0],
            ['Structured Cabling', 'Faceplate 2-Port', 'Single Gang 2-Port Faceplate', 'EA', 1.25, 0.1],
            ['Structured Cabling', 'Faceplate 4-Port', 'Single Gang 4-Port Faceplate', 'EA', 1.25, 0.1],
            ['Structured Cabling', 'J-Hook 2"', '2-inch J-Hook with beam clamp', 'EA', 4.50, 0.15],
            ['Structured Cabling', 'Velcro Strap (Roll)', '75ft Velcro Electrical Cable Strap', 'RL', 15.00, 0],
            ['Structured Cabling', 'Patch Cord 3ft', 'Cat6 Patch Cord 3ft Blue', 'EA', 3.50, 0],
            ['Structured Cabling', 'Patch Cord 7ft', 'Cat6 Patch Cord 7ft Blue', 'EA', 4.50, 0],

            // Conduit & Pathway
            ['Conduit & Pathway', 'EMT Conduit 1/2"', '1/2" EMT Conduit (10ft)', 'EA', 7.50, 0.3],
            ['Conduit & Pathway', 'EMT Conduit 3/4"', '3/4" EMT Conduit (10ft)', 'EA', 12.00, 0.4],
            ['Conduit & Pathway', 'EMT Conduit 1"', '1" EMT Conduit (10ft)', 'EA', 18.00, 0.5],
            ['Conduit & Pathway', 'Connector 3/4"', '3/4" EMT Set Screw Connector', 'EA', 0.75, 0.05],
            ['Conduit & Pathway', 'Coupling 3/4"', '3/4" EMT Set Screw Coupling', 'EA', 0.85, 0.05],
            ['Conduit & Pathway', '4-Square Box', '4" Square Deep Box', 'EA', 4.50, 0.25],
            ['Conduit & Pathway', 'Uni-Strut', '1-5/8" Deep Unistrut (10ft)', 'EA', 28.00, 0.3],
            ['Conduit & Pathway', 'Surface Raceway', 'Wiremold 700 Series (10ft)', 'EA', 35.00, 0.5],

            // Access Control
            ['Access Control', 'Card Reader', 'HID Signo 40 Card Reader', 'EA', 225.00, 0.75],
            ['Access Control', 'Electric Strike', 'HES 5000 Electric Strike', 'EA', 185.00, 1.5],
            ['Access Control', 'Mag Lock', '1200lb Electromagnetic Lock', 'EA', 210.00, 1.5],
            ['Access Control', 'Request to Exit (Motion)', 'Bosch REX Motion Sensor', 'EA', 95.00, 0.75],
            ['Access Control', 'Door Contact', 'Recessed Door Contact 3/4"', 'EA', 15.00, 0.5],
            ['Access Control', 'Composite Cable', 'Access Control Composite Cable Plnm (500ft)', 'BOX', 450.00, 2.0],
            ['Access Control', 'Controller 4-Door', '4-Door Access Controller Board', 'EA', 1200.00, 2.0],
            ['Access Control', 'Power Supply', 'Altronix 4-Output Power Supply', 'EA', 180.00, 1.0],

            // Video Surveillance
            ['Video Surveillance', 'IP Dome Camera', '4MP Indoor/Outdoor Dome Camera', 'EA', 250.00, 1.0],
            ['Video Surveillance', 'IP Bullet Camera', '8MP 4K Bullet Camera', 'EA', 320.00, 1.0],
            ['Video Surveillance', '360 Fisheye', '12MP 360 Degree Fisheye Camera', 'EA', 550.00, 1.0],
            ['Video Surveillance', 'PTZ Camera', '25x Optical Zoom PTZ Camera', 'EA', 1200.00, 2.0],
            ['Video Surveillance', 'NVR 16-Ch', '16-Channel 4K NVR 4TB HDD', 'EA', 850.00, 1.5],
            ['Video Surveillance', 'Camera Mount', 'Pendant/Wall Mount Bracket', 'EA', 45.00, 0.5],

            // Network Infrastructure
            ['Network Infrastructure', 'Network Rack 42U', '2-Post 42U Open Frame Rack', 'EA', 250.00, 2.0],
            ['Network Infrastructure', 'Wall Mount Cabinet', '12U Wall Mount Privacy Cabinet', 'EA', 350.00, 2.5],
            ['Network Infrastructure', 'Cable Manager', '2U Horizontal Cable Manager', 'EA', 35.00, 0.1],
            ['Network Infrastructure', 'PDU', 'Rack Mount PDU 12-Outlet', 'EA', 85.00, 0.25],
            ['Network Infrastructure', 'UPS 1500VA', 'Rack Mount UPS 1500VA', 'EA', 450.00, 0.5],
            ['Network Infrastructure', 'PoE Switch 24-Port', '24-Port PoE+ Managed Switch', 'EA', 650.00, 0.5],

            // Intrusion Detection
            ['Intrusion Detection', 'Motion Detector', 'Dual Tech Motion Detector', 'EA', 45.00, 0.5],
            ['Intrusion Detection', 'Glass Break', 'Acoustic Glass Break Sensor', 'EA', 55.00, 0.5],
            ['Intrusion Detection', 'Keypad', 'LCD Touchscreen Keypad', 'EA', 220.00, 0.75],
            ['Intrusion Detection', 'Siren', '30W Indoor/Outdoor Siren', 'EA', 35.00, 0.5],

            // Audio/Visual
            ['Audio/Visual', 'TV Mount', 'Tilting Wall Mount 55-85"', 'EA', 85.00, 1.0],
            ['Audio/Visual', 'HDMI Extender', 'HDBaseT 4K HDMI Extender Set', 'EA', 250.00, 0.5],
            ['Audio/Visual', 'Ceiling Speaker', '6.5" Ceiling Speaker 70V', 'EA', 85.00, 0.75],
            ['Audio/Visual', 'Volume Control', 'Wall Mount Volume Control', 'EA', 45.00, 0.5],
            ['Audio/Visual', 'HDMI Cable 6ft', 'Primum High Speed HDMI', 'EA', 12.00, 0],

            // Fiber Optics
            ['Fiber Optics', 'Fiber Cable OM3', '6-Strand OM3 Armored Plenum (ft)', 'FT', 1.25, 0.05],
            ['Fiber Optics', 'LIU Enclosure', '1U Rack Mount Fiber Enclosure', 'EA', 120.00, 1.0],
            ['Fiber Optics', 'Adapter Panel', 'LC Adapter Panel 6-Duplex', 'EA', 35.00, 0.1],
            ['Fiber Optics', 'LC Connector', 'LC OM3 UniCam Connector', 'EA', 15.00, 0.25],

            // General / Misc
            ['General / Misc', 'Firestop Putty pad', 'Firestop Putty Pad 7x7', 'EA', 12.00, 0.25],
            ['General / Misc', 'Fire Caulk', 'Fire Barrier Sealant Tube', 'EA', 18.00, 0.1],
            ['General / Misc', 'Pull String', 'Poly Pull Line (Bucket)', 'EA', 45.00, 0],
            ['General / Misc', 'Label Tape', 'Brother TZ Tape 3/4"', 'EA', 22.00, 0],
            ['General / Misc', 'Zip Ties (100)', '8" Plenum Zip Ties 100pk', 'PK', 12.00, 0]
        ];

        materials.forEach(([category, item_name, description, unit, material_cost, labor_hours]) => {
            try {
                db.run(`INSERT OR IGNORE INTO materials_library 
                    (category, item_name, description, unit, material_cost, typical_labor_hours) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [category, item_name, description, unit, material_cost, labor_hours]);
            } catch (e) { }
        });
    },

    async save() {
        if (!db) return;
        const data = db.export();
        await localforage.setItem(DB_NAME, data);
    },

    initSchema() {
        const schema = `
      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_number TEXT UNIQUE,
        name TEXT NOT NULL,
        client_name TEXT,
        client_company TEXT,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        description TEXT,
        date_created TEXT DEFAULT CURRENT_TIMESTAMP,
        date_modified TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'draft',
        total_amount REAL DEFAULT 0,
        notes TEXT
      );

      -- Line items table
      CREATE TABLE IF NOT EXISTS line_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        category TEXT,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT DEFAULT 'EA',
        material_cost REAL DEFAULT 0,
        labor_hours REAL DEFAULT 0,
        labor_rate REAL DEFAULT 75,
        markup_percent REAL DEFAULT 20,
        notes TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Materials library table
      CREATE TABLE IF NOT EXISTS materials_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        item_name TEXT NOT NULL,
        description TEXT,
        unit TEXT DEFAULT 'EA',
        material_cost REAL DEFAULT 0,
        typical_labor_hours REAL DEFAULT 0,
        manufacturer TEXT,
        part_number TEXT,
        date_added TEXT DEFAULT CURRENT_TIMESTAMP,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Company settings table
      CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT DEFAULT 'WhitTech.AI',
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo_path TEXT,
        default_labor_rate REAL DEFAULT 75,
        default_markup_percent REAL DEFAULT 20,
        tax_rate REAL DEFAULT 0,
        proposal_terms TEXT DEFAULT 'Payment due within 30 days. 50% deposit required to commence work.'
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `;
        db.run(schema);
        this.save();
    },

    seedData() {
        // Insert default company settings
        db.run("INSERT OR IGNORE INTO company_settings (id, company_name) VALUES (1, 'WhitTech.AI')");

        // Insert default categories
        const categories = [
            ['Electrical', 1],
            ['Plumbing', 2],
            ['HVAC', 3],
            ['Framing', 4],
            ['Drywall', 5],
            ['Flooring', 6],
            ['Roofing', 7],
            ['Painting', 8],
            ['General', 9],
            ['Labor', 10]
        ];

        categories.forEach(([name, sort_order]) => {
            try {
                db.run('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)', [name, sort_order]);
            } catch (e) { }
        });

        // Seed materials library with 50+ common construction items
        const materials = [
            // Electrical
            ['Electrical', 'Duplex Outlet', 'Standard 15A duplex receptacle', 'EA', 3.50, 0.5],
            ['Electrical', 'GFCI Outlet', '15A GFCI receptacle', 'EA', 18.00, 0.75],
            ['Electrical', 'Single Pole Switch', 'Standard light switch', 'EA', 2.50, 0.5],
            ['Electrical', '3-Way Switch', 'Three-way light switch', 'EA', 5.00, 0.75],
            ['Electrical', 'Dimmer Switch', 'LED dimmer switch', 'EA', 25.00, 0.75],
            ['Electrical', 'Light Fixture - Basic', 'Standard ceiling fixture', 'EA', 35.00, 0.75],
            ['Electrical', 'Recessed Light', '6" LED recessed can', 'EA', 45.00, 1.0],
            ['Electrical', 'Ceiling Fan', 'Standard ceiling fan with light', 'EA', 150.00, 1.5],
            ['Electrical', 'Breaker - 15A', 'Single pole 15A breaker', 'EA', 8.00, 0.25],
            ['Electrical', 'Breaker - 20A', 'Single pole 20A breaker', 'EA', 10.00, 0.25],
            ['Electrical', 'Romex 14/2', '14/2 NM-B wire', 'FT', 0.45, 0.02],
            ['Electrical', 'Romex 12/2', '12/2 NM-B wire', 'FT', 0.65, 0.02],
            ['Electrical', 'Electrical Panel 200A', '200A main breaker panel', 'EA', 350.00, 4.0],

            // Plumbing
            ['Plumbing', 'PEX Pipe 1/2"', '1/2" PEX tubing', 'FT', 0.75, 0.05],
            ['Plumbing', 'PEX Pipe 3/4"', '3/4" PEX tubing', 'FT', 1.25, 0.05],
            ['Plumbing', 'Copper Pipe 1/2"', '1/2" Type L copper', 'FT', 3.50, 0.1],
            ['Plumbing', 'Toilet', 'Standard toilet with seat', 'EA', 200.00, 2.0],
            ['Plumbing', 'Bathroom Sink', 'Pedestal sink', 'EA', 150.00, 1.5],
            ['Plumbing', 'Kitchen Faucet', 'Single handle kitchen faucet', 'EA', 125.00, 1.0],
            ['Plumbing', 'Bathroom Faucet', 'Single handle lavatory faucet', 'EA', 75.00, 0.75],
            ['Plumbing', 'Water Heater 50 Gal', '50 gallon electric water heater', 'EA', 450.00, 3.0],
            ['Plumbing', 'Garbage Disposal', '1/2 HP garbage disposal', 'EA', 120.00, 1.0],
            ['Plumbing', 'Shut-off Valve', '1/2" quarter turn valve', 'EA', 12.00, 0.25],

            // HVAC
            ['HVAC', 'Ductwork - Flex 6"', '6" insulated flex duct', 'FT', 2.50, 0.1],
            ['HVAC', 'Ductwork - Flex 8"', '8" insulated flex duct', 'FT', 3.50, 0.1],
            ['HVAC', 'Supply Register', '6x10 supply register', 'EA', 15.00, 0.25],
            ['HVAC', 'Return Grille', '14x20 return air grille', 'EA', 20.00, 0.25],
            ['HVAC', 'Thermostat - Basic', 'Non-programmable thermostat', 'EA', 35.00, 0.5],
            ['HVAC', 'Thermostat - Smart', 'WiFi smart thermostat', 'EA', 150.00, 1.0],
            ['HVAC', 'HVAC Filter 16x25', '16x25x1 pleated filter', 'EA', 8.00, 0.1],

            // Framing
            ['Framing', '2x4x8 Stud', '2x4 8ft SPF stud', 'EA', 4.50, 0.1],
            ['Framing', '2x4x10', '2x4 10ft SPF lumber', 'EA', 6.00, 0.1],
            ['Framing', '2x6x8', '2x6 8ft SPF lumber', 'EA', 7.50, 0.15],
            ['Framing', '2x6x10', '2x6 10ft SPF lumber', 'EA', 9.50, 0.15],
            ['Framing', '2x10x12', '2x10 12ft SPF lumber', 'EA', 18.00, 0.2],
            ['Framing', 'Plywood 1/2" CDX', '4x8 1/2" CDX plywood', 'EA', 35.00, 0.25],
            ['Framing', 'Plywood 3/4" CDX', '4x8 3/4" CDX plywood', 'EA', 48.00, 0.25],
            ['Framing', 'OSB 7/16"', '4x8 7/16" OSB sheathing', 'EA', 18.00, 0.2],

            // Drywall
            ['Drywall', 'Drywall 1/2" 4x8', '1/2" x 4x8 drywall sheet', 'EA', 14.00, 0.25],
            ['Drywall', 'Drywall 5/8" 4x8', '5/8" x 4x8 drywall sheet', 'EA', 18.00, 0.25],
            ['Drywall', 'Drywall Mud', '5 gal joint compound', 'EA', 18.00, 0],
            ['Drywall', 'Drywall Tape', '500ft paper tape', 'EA', 8.00, 0],
            ['Drywall', 'Drywall Screws', '1-5/8" screws (1lb)', 'EA', 8.00, 0],
            ['Drywall', 'Corner Bead', '8ft metal corner bead', 'EA', 3.50, 0.1],

            // Flooring
            ['Flooring', 'LVP Flooring', 'Luxury vinyl plank', 'SF', 3.50, 0.05],
            ['Flooring', 'Carpet w/ Pad', 'Standard carpet with pad', 'SF', 4.00, 0.03],
            ['Flooring', 'Tile - Ceramic', '12x12 ceramic tile', 'SF', 2.50, 0.15],
            ['Flooring', 'Tile - Porcelain', '12x24 porcelain tile', 'SF', 4.50, 0.2],
            ['Flooring', 'Hardwood Oak', '3/4" solid oak flooring', 'SF', 8.00, 0.1],
            ['Flooring', 'Underlayment', 'Foam underlayment', 'SF', 0.35, 0.01],

            // Roofing
            ['Roofing', 'Shingles - 3 Tab', '3-tab asphalt shingles (bundle)', 'EA', 30.00, 0.5],
            ['Roofing', 'Shingles - Architectural', 'Architectural shingles (bundle)', 'EA', 40.00, 0.5],
            ['Roofing', 'Roofing Felt 15#', '15# felt paper (roll)', 'EA', 25.00, 0.25],
            ['Roofing', 'Drip Edge', '10ft drip edge', 'EA', 8.00, 0.1],

            // Painting
            ['Painting', 'Interior Paint', 'Premium interior latex (gal)', 'EA', 45.00, 0],
            ['Painting', 'Exterior Paint', 'Premium exterior latex (gal)', 'EA', 55.00, 0],
            ['Painting', 'Primer', 'All-purpose primer (gal)', 'EA', 35.00, 0],
            ['Painting', 'Caulk', 'Paintable caulk tube', 'EA', 5.00, 0.05],

            // General
            ['General', 'Insulation R-13', 'R-13 fiberglass batts (bundle)', 'EA', 45.00, 0.5],
            ['General', 'Insulation R-19', 'R-19 fiberglass batts (bundle)', 'EA', 55.00, 0.5],
            ['General', 'Concrete Mix', '80lb bag concrete', 'EA', 6.00, 0.25],
            ['General', 'Rebar #4', '#4 rebar 20ft', 'EA', 12.00, 0.1],
            ['General', 'Permit Fee', 'Building permit', 'LS', 500.00, 0],
            ['General', 'Dumpster Rental', '20 yard dumpster (week)', 'EA', 450.00, 0]
        ];

        materials.forEach(([category, item_name, description, unit, material_cost, labor_hours]) => {
            try {
                db.run(`INSERT OR IGNORE INTO materials_library 
                    (category, item_name, description, unit, material_cost, typical_labor_hours) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [category, item_name, description, unit, material_cost, labor_hours]);
            } catch (e) { }
        });

        this.save();
    },

    // ========== Projects ==========

    async createProject(projectData) {
        const sql = `
      INSERT INTO projects (project_number, name, client_name, client_company, 
                           client_email, client_phone, client_address, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db.run(sql, [
            projectData.project_number || null,
            projectData.name,
            projectData.client_name || null,
            projectData.client_company || null,
            projectData.client_email || null,
            projectData.client_phone || null,
            projectData.client_address || null,
            projectData.description || null,
            projectData.notes || null
        ]);
        const result = this.queryOne('SELECT last_insert_rowid() as id');
        await this.save();
        return result.id;
    },

    getProjects() {
        return this.queryAll('SELECT * FROM projects ORDER BY date_created DESC');
    },

    getProject(id) {
        return this.queryOne('SELECT * FROM projects WHERE id = ?', [id]);
    },

    async updateProject(id, projectData) {
        const sql = `
      UPDATE projects 
      SET name = ?, client_name = ?, client_company = ?, client_email = ?, 
          client_phone = ?, client_address = ?, description = ?, notes = ?,
          status = ?, date_modified = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
        db.run(sql, [
            projectData.name,
            projectData.client_name || null,
            projectData.client_company || null,
            projectData.client_email || null,
            projectData.client_phone || null,
            projectData.client_address || null,
            projectData.description || null,
            projectData.notes || null,
            projectData.status || 'draft',
            id
        ]);
        await this.save();
        return true;
    },

    async deleteProject(id) {
        // Delete line items first (cascade)
        db.run('DELETE FROM line_items WHERE project_id = ?', [id]);
        db.run('DELETE FROM projects WHERE id = ?', [id]);
        await this.save();
        return true;
    },

    // ========== Line Items ==========

    async createLineItem(lineItemData) {
        const sql = `
      INSERT INTO line_items (project_id, category, description, quantity, unit,
                             material_cost, labor_hours, labor_rate, markup_percent, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db.run(sql, [
            lineItemData.project_id,
            lineItemData.category || null,
            lineItemData.description,
            lineItemData.quantity || 1,
            lineItemData.unit || 'EA',
            lineItemData.material_cost || 0,
            lineItemData.labor_hours || 0,
            lineItemData.labor_rate || 75,
            lineItemData.markup_percent || 20,
            lineItemData.notes || null
        ]);
        const result = this.queryOne('SELECT last_insert_rowid() as id');
        await this.save();
        return result.id;
    },

    getLineItems(projectId) {
        return this.queryAll('SELECT * FROM line_items WHERE project_id = ? ORDER BY sort_order, id', [projectId]);
    },

    async updateLineItem(id, lineItemData) {
        const sql = `
      UPDATE line_items 
      SET category = ?, description = ?, quantity = ?, unit = ?,
          material_cost = ?, labor_hours = ?, labor_rate = ?, 
          markup_percent = ?, notes = ?
      WHERE id = ?
    `;
        db.run(sql, [
            lineItemData.category || null,
            lineItemData.description,
            lineItemData.quantity || 1,
            lineItemData.unit || 'EA',
            lineItemData.material_cost || 0,
            lineItemData.labor_hours || 0,
            lineItemData.labor_rate || 75,
            lineItemData.markup_percent || 20,
            lineItemData.notes || null,
            id
        ]);
        await this.save();
        return true;
    },

    async deleteLineItem(id) {
        db.run('DELETE FROM line_items WHERE id = ?', [id]);
        await this.save();
        return true;
    },

    async calculateProjectTotal(projectId) {
        const lineItems = this.getLineItems(projectId);

        let total = 0;
        lineItems.forEach(item => {
            const materialTotal = item.quantity * item.material_cost;
            const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
            const subtotal = materialTotal + laborTotal;
            const itemTotal = subtotal * (1 + item.markup_percent / 100);
            total += itemTotal;
        });

        db.run('UPDATE projects SET total_amount = ? WHERE id = ?', [total, projectId]);
        await this.save();

        return total;
    },

    // ========== Materials Library ==========

    async addToMaterialsLibrary(materialData) {
        const sql = `
      INSERT INTO materials_library (category, item_name, description, unit,
                                    material_cost, typical_labor_hours, manufacturer, part_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db.run(sql, [
            materialData.category || null,
            materialData.item_name,
            materialData.description || null,
            materialData.unit || 'EA',
            materialData.material_cost || 0,
            materialData.typical_labor_hours || 0,
            materialData.manufacturer || null,
            materialData.part_number || null
        ]);
        await this.save();
        return true;
    },

    getMaterialsLibrary(category = null) {
        if (category) {
            return this.queryAll('SELECT * FROM materials_library WHERE category = ? ORDER BY item_name', [category]);
        } else {
            return this.queryAll('SELECT * FROM materials_library ORDER BY category, item_name');
        }
    },

    searchMaterials(query) {
        const searchTerm = `%${query}%`;
        return this.queryAll(
            `SELECT * FROM materials_library 
             WHERE item_name LIKE ? OR description LIKE ? OR category LIKE ?
             ORDER BY 
               CASE WHEN item_name LIKE ? THEN 0 ELSE 1 END,
               item_name
             LIMIT 20`,
            [searchTerm, searchTerm, searchTerm, `${query}%`]
        );
    },

    // ========== Categories ==========

    getCategories() {
        return this.queryAll('SELECT * FROM categories ORDER BY sort_order');
    },

    // ========== Company Settings ==========

    getCompanySettings() {
        return this.queryOne('SELECT * FROM company_settings WHERE id = 1');
    },

    async updateCompanySettings(settings) {
        const sql = `
      UPDATE company_settings 
      SET company_name = ?, address = ?, phone = ?, email = ?, website = ?,
          default_labor_rate = ?, default_markup_percent = ?, tax_rate = ?, proposal_terms = ?
      WHERE id = 1
    `;
        db.run(sql, [
            settings.company_name || '',
            settings.address || '',
            settings.phone || '',
            settings.email || '',
            settings.website || '',
            settings.default_labor_rate || 75,
            settings.default_markup_percent || 20,
            settings.tax_rate || 0,
            settings.proposal_terms || ''
        ]);
        await this.save();
        return true;
    },

    // ========== Helper Methods ==========

    queryAll(sql, params = []) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    },

    queryOne(sql, params = []) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return result;
    }
};

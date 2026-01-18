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

-- Insert default company settings
INSERT OR IGNORE INTO company_settings (id, company_name) VALUES (1, 'WhitTech.AI');

-- Categories table for organization
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Insert default categories
INSERT OR IGNORE INTO categories (name, sort_order) VALUES 
    ('Access Control', 1),
    ('IP Cameras', 2),
    ('Intrusion Detection', 3),
    ('Structured Cabling', 4),
    ('Labor', 5),
    ('Equipment', 6),
    ('Misc', 7);

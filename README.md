# WhitTech Estimator

Professional construction estimating desktop application built with Electron, React, and SQLite.

## Installation

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npm rebuild better-sqlite3 --runtime=electron --target=28.1.0 --dist-url=https://electronjs.org/headers

# Run in development mode
npm run dev
```

## Building for Production

```bash
# Build for current platform
npm run package

# Build for Windows
npm run package:win

# Build for macOS  
npm run package:mac

# Build for Linux
npm run package:linux
```

## Features

✅ Project management with client information
✅ Line item estimating with material + labor costs
✅ Automatic markup calculations
✅ Professional PDF proposal generation
✅ Excel import/export
✅ Company branding & settings
✅ Local SQLite database (no internet required)
✅ Modern, professional dark theme UI

## First Time Setup

1. Run `npm install` to install all dependencies
2. Run `npm run dev` to start the development server
3. Go to Settings and enter your company information
4. Create your first project!

## Technology Stack

- **Frontend:** React 18 + Vite
- **Desktop:** Electron 28
- **Database:** SQLite (better-sqlite3)
- **PDF:** jsPDF + jsPDF-autotable
- **Icons:** Lucide React
- **Styling:** Custom CSS Variables

## Project Structure

```
whittech-estimator/
├── assets/              # App icons
├── database/            # SQLite schema
├── electron/            # Electron main process
│   ├── main.js         # Main entry point
│   ├── preload.js      # IPC bridge
│   └── database.js     # Database manager
├── src/                 # React application
│   ├── components/     # React components
│   ├── context/        # React context
│   ├── App.jsx         # Main app component
│   └── *.css           # Stylesheets
└── package.json         # Dependencies & scripts
```

## License

MIT License - WhitTech.AI

## Support

For support, please contact: justin@whittech.ai

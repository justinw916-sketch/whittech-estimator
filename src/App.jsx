import React, { useState, useCallback, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import ProjectList from './components/ProjectList';
import ProjectEditor from './components/ProjectEditor';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle fullscreen change events (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setCurrentView('editor');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
  };

  return (
    <AppProvider>
      <div className={`app ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <a href="/dashboard" className="back-btn" target="_parent" aria-label="Back to Dashboard" title="Back to Dashboard">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </a>
              <div>
                <h1 className="app-title">WhitTech Estimator</h1>
                <span className="app-subtitle">Professional Construction Estimating</span>
              </div>
            </div>
            <nav className="main-nav">
              <button
                className={`nav-button ${currentView === 'projects' ? 'active' : ''}`}
                onClick={() => setCurrentView('projects')}
              >
                Projects
              </button>
              <button
                className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                Settings
              </button>
              <button
                className="nav-button fullscreen-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </nav>
          </div>
        </header>

        <main className="app-main">
          {currentView === 'projects' && (
            <ProjectList
              onProjectSelect={handleProjectSelect}
              onNewProject={handleNewProject}
            />
          )}

          {currentView === 'editor' && (
            <ProjectEditor
              project={selectedProject}
              onBack={handleBackToProjects}
            />
          )}

          {currentView === 'settings' && (
            <Settings />
          )}
        </main>
      </div>
    </AppProvider>
  );
}

export default App;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/db';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      await dbService.init();
      setDbReady(true);
      await loadInitialData();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [projectsResult, categoriesResult, settingsResult] = await Promise.all([
        Promise.resolve(dbService.getProjects()),
        Promise.resolve(dbService.getCategories()),
        Promise.resolve(dbService.getCompanySettings())
      ]);
      setProjects(projectsResult || []);
      setCategories(categoriesResult || []);
      setCompanySettings(settingsResult);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProjects = async () => {
    const result = dbService.getProjects();
    setProjects(result || []);
  };

  const refreshSettings = async () => {
    const result = dbService.getCompanySettings();
    setCompanySettings(result);
  };

  const value = {
    projects,
    categories,
    companySettings,
    loading,
    dbReady,
    refreshProjects,
    refreshSettings,
    dbService // Expose dbService for components
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

import { useState, useEffect } from 'react';

type RoutePreference = 'best' | 'dex' | 'amm';

const STORAGE_KEY = 'nv.route';

export const useRoutePreference = (): [RoutePreference, (route: RoutePreference) => void] => {
  const [route, setRouteState] = useState<RoutePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as RoutePreference) || 'best';
  });

  const setRoute = (newRoute: RoutePreference) => {
    setRouteState(newRoute);
    localStorage.setItem(STORAGE_KEY, newRoute);
  };

  // Sync with storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setRouteState(e.newValue as RoutePreference);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return [route, setRoute];
};
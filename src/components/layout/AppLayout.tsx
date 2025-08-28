import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-brand-surface">
      <Sidebar />
      <div className="w-px bg-gradient-to-b from-transparent via-brand-text/10 to-transparent"></div>
      <div className="flex-1 flex flex-col bg-brand-bg/50">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

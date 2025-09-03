import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  return (
    <div className="flex min-h-dvh bg-brand-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-brand-bg/50 ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto pt-24 px-6 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

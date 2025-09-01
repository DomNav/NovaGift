import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { Create } from '@/pages/Create';
import { Fund } from '@/pages/Fund';
import { Open } from '@/pages/Open';
import { Activity } from '@/pages/Activity';
import { Studio } from '@/pages/Studio';
import { Settings } from '@/pages/Settings';
import { Projects } from '@/pages/Projects';
import { ProjectDetail } from '@/pages/ProjectDetail';
import ProjectsIndex from '@/pages/studio/projects/ProjectsIndex';
import ProjectDetailsPage from '@/pages/studio/projects/ProjectDetails';
import ContactsPage from '@/pages/ContactsPage';
import { QrClaimPage } from '@/pages/QrClaimPage';
import { ClaimPage } from '@/pages/claim/ClaimPage';
import { ClaimSuccess } from '@/pages/claim/ClaimSuccess';
import SkinStore from '@/pages/SkinStore';
import KaleSkins from '@/pages/KaleSkins';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000, // 10 seconds
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  try {
    console.log('NovaGift App: Initializing...');
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public claim routes (no layout) */}
                <Route path="/claim/:id" element={<ClaimPage />} />
                <Route path="/claim/:id/success" element={<ClaimSuccess />} />
                <Route path="/qr-claim" element={<QrClaimPage />} />
                
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Create />} />
                  <Route path="fund" element={<Fund />} />
                  <Route path="open" element={<Open />} />
                  <Route path="open/:id" element={<Open />} />
                  <Route path="activity" element={<Activity />} />
                  <Route path="studio" element={<Studio />} />
                  {/* Legacy routes remain for now */}
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id" element={<ProjectDetail />} />
                  <Route path="contacts" element={<ContactsPage />} />

                  {/* New Studio Projects module */}
                  <Route path="studio/projects" element={<ProjectsIndex />} />
                  <Route path="studio/projects/:id" element={<ProjectDetailsPage />} />
                  
                  {/* Studio sub-pages */}
                  <Route path="skins" element={<SkinStore />} />
                  <Route path="kale-skins" element={<KaleSkins />} />
                  
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
              <Toast />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('NovaGift App: Error during initialization:', error);
    return <div style={{ padding: '20px', color: 'red' }}>Error loading app: {String(error)}</div>;
  }
}

export default App;

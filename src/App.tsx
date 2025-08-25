import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/hooks/useToast'
import { Toast } from '@/components/ui/Toast'
import { AppLayout } from '@/components/layout/AppLayout'
import { Create } from '@/pages/Create'
import { Fund } from '@/pages/Fund'
import { Open } from '@/pages/Open'
import { Activity } from '@/pages/Activity'
import { Studio } from '@/pages/Studio'
import { Settings } from '@/pages/Settings'

function App() {
  try {
    console.log('NovaGift App: Initializing...')
    return (
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Create />} />
                <Route path="fund" element={<Fund />} />
                <Route path="open" element={<Open />} />
                <Route path="activity" element={<Activity />} />
                <Route path="studio" element={<Studio />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            <Toast />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    )
  } catch (error) {
    console.error('NovaGift App: Error during initialization:', error)
    return <div style={{ padding: '20px', color: 'red' }}>Error loading app: {String(error)}</div>
  }
}

export default App
import React, { useState } from 'react';
import { 
  QueryClient, 
  QueryClientProvider 
} from '@tanstack/react-query';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';

const queryClient = new QueryClient();

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  return (
    <QueryClientProvider client={queryClient}>
      {view === 'landing' ? (
        <Landing onStart={() => setView('dashboard')} />
      ) : (
        <Dashboard onBack={() => setView('landing')} />
      )}
    </QueryClientProvider>
  );
}

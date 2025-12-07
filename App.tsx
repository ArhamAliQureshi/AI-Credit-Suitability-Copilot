import React, { useState } from 'react';
import Layout from './components/Layout';
import AdvisorView from './views/AdvisorView';
import ConfigView from './views/ConfigView';
import { SuitabilityProvider } from './context/SuitabilityContext';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'config'>('advisor');

  return (
    <SuitabilityProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'advisor' ? <AdvisorView /> : <ConfigView />}
      </Layout>
    </SuitabilityProvider>
  );
};

export default App;

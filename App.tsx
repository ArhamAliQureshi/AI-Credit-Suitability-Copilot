import React, { useState } from 'react';
import Layout from './components/Layout';
import AdvisorView from './views/AdvisorView';
import ConfigView from './views/ConfigView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'config'>('advisor');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'advisor' ? <AdvisorView /> : <ConfigView />}
    </Layout>
  );
};

export default App;
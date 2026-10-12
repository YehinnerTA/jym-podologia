import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { setupIonicReact } from '@ionic/react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { CompanyProvider } from './features/company/context/CompanyContext';
import { AppRoutes } from './routes/AppRoutes';

/* Ionic Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme */
import './theme/variables.css';
import './theme/global.css';

setupIonicReact();

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <Router>
          <AppRoutes />
        </Router>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;
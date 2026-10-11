import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ShowcaseLanding } from './pages/ShowcaseLanding';
import { Dashboard } from './pages/Dashboard';
import { Areas } from './pages/Areas';
import { Residents } from './pages/Residents';
import { AlertsLog } from './pages/AlertsLog';
import { TestAlert } from './pages/TestAlert';
import { PublicRegister } from './pages/PublicRegister';
import { Login } from './pages/Login';
import { AuthService } from './services/auth';
import { ApiService } from './services/api';
import { Area, Resident, Alert, OperatorRole } from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState(AuthService.getUser());
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [areas, setAreas] = useState<Area[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [areasData, resData, alertsData] = await Promise.all([
        ApiService.getAreas(),
        ApiService.getResidents(),
        ApiService.getAlerts()
      ]);
      setAreas(areasData);
      setResidents(resData);
      setAlerts(alertsData);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  const handleRoleChange = (newRole: OperatorRole) => {
    if (user) {
      const updated = AuthService.login(user.email, newRole);
      setUser(updated);
    }
  };

  const handleQuickSubscribe = async (phone: string) => {
    try {
      const targetAreaId = areas[0]?.areaId || 'area-yamuna-bazar';
      await ApiService.publicRegister({
        name: 'Protected Community Citizen',
        phone: phone,
        areaId: targetAreaId,
        consent: true
      });
      loadData();
    } catch (err) {
      console.warn('Quick subscribe fallback handled:', err);
    }
  };

  // If public registration selected
  if (currentTab === 'register') {
    return <PublicRegister areas={areas} onBackToApp={() => setCurrentTab('overview')} />;
  }

  // If logged out
  if (!user) {
    return (
      <Login
        onLoginSuccess={() => {
          setUser(AuthService.getUser());
          setCurrentTab('overview');
          loadData();
        }}
      />
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="aeline-app-container">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        role={user.role}
        onRoleChange={handleRoleChange}
      />

      <main className="aeline-content-area">
        {loading ? (
          <div className="loading-state-container">
            <div className="loading-leaf-spin">🌱</div>
            <span>Loading Flood Alert Telemetry...</span>
          </div>
        ) : (
          <>
            {currentTab === 'overview' && (
              <ShowcaseLanding
                areas={areas}
                alerts={alerts}
                onNavigate={(tab) => setCurrentTab(tab)}
                onQuickSubscribe={handleQuickSubscribe}
              />
            )}

            {currentTab === 'dashboard' && (
              <div className="page-wrapper container">
                <Dashboard
                  areas={areas}
                  residents={residents}
                  alerts={alerts}
                  onNavigateToTest={() => setCurrentTab('test-alert')}
                  onNavigateToAreas={() => setCurrentTab('areas')}
                />
              </div>
            )}

            {currentTab === 'areas' && (
              <div className="page-wrapper container">
                <Areas
                  areas={areas}
                  onRefresh={loadData}
                  isAdmin={isAdmin}
                />
              </div>
            )}

            {currentTab === 'residents' && (
              <div className="page-wrapper container">
                <Residents
                  residents={residents}
                  areas={areas}
                  onRefresh={loadData}
                  isAdmin={isAdmin}
                />
              </div>
            )}

            {currentTab === 'alerts' && (
              <div className="page-wrapper container">
                <AlertsLog
                  alerts={alerts}
                  areas={areas}
                />
              </div>
            )}

            {currentTab === 'test-alert' && (
              <div className="page-wrapper container">
                <TestAlert
                  areas={areas}
                  onAlertTriggered={loadData}
                  isAdmin={isAdmin}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;

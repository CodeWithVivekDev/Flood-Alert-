import React from 'react';
import { 
  ShieldCheck, 
  UserCheck,
  ChevronRight,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { AuthService } from '../services/auth';
import { OperatorRole } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  role: OperatorRole;
  onRoleChange: (newRole: OperatorRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  role,
  onRoleChange
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'dashboard', label: 'Live Dashboard' },
    { id: 'areas', label: 'River Basins' },
    { id: 'residents', label: 'Residents' },
    { id: 'alerts', label: 'Alerts Log' },
    { id: 'test-alert', label: 'Simulation Lab' }
  ];

  const handleSelect = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="aeline-top-nav">
      <div className="nav-inner-container">
        {/* Brand Logo */}
        <div className="nav-brand" onClick={() => handleSelect('overview')}>
          <div className="brand-logo-leaf">
            <span className="leaf-glyph">🌊</span>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-main-title">Flood Alert</span>
            <span className="brand-sub-tag">बाढ़ बोल • COMMUNITY WARNING</span>
          </div>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="nav-center-menu">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`nav-link-pill ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="nav-right-actions">
          {/* Role Pill Switcher */}
          <button
            onClick={() => onRoleChange(role === 'admin' ? 'viewer' : 'admin')}
            className={`role-pill-modern ${role === 'admin' ? 'role-admin' : 'role-viewer'}`}
            title="Click to toggle Admin / Viewer mode"
          >
            {role === 'admin' ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
            <span>{role.toUpperCase()}</span>
          </button>

          {/* Standout Electric Lime CTA Button (Reference Style) */}
          <button
            onClick={() => handleSelect('register')}
            className="btn-lime-cta"
            title="Register new resident or open public siren sign-up"
          >
            <span>Get Protected</span>
            <ChevronRight size={15} />
          </button>

          {/* User Signout */}
          <button
            onClick={onLogout}
            className="btn-signout"
            title={`Signed in as ${AuthService.getUser()?.email} • Sign Out`}
          >
            <LogOut size={16} />
          </button>

          {/* Mobile hamburger */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`mobile-nav-link ${currentTab === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => handleSelect('register')}
            className="mobile-nav-link cta"
          >
            Citizen Sign-Up
          </button>
        </div>
      )}
    </header>
  );
};

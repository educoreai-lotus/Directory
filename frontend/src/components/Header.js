import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDesignSystem } from '../context/DesignSystemContext';
import { getLogoUrl } from '../services/designTokenService';
import './Header.css';

const navigationItems = [
  { label: 'Home', path: '/' },
  { label: 'Register', path: '/register' },
  { label: 'Login', path: '/login' }
];

const blurMap = {
  'backdrop-blur-none': 'blur(0px)',
  'backdrop-blur-sm': 'blur(4px)',
  'backdrop-blur': 'blur(8px)',
  'backdrop-blur-md': 'blur(12px)',
  'backdrop-blur-lg': 'blur(16px)',
  'backdrop-blur-xl': 'blur(24px)'
};

const resolveBackdropBlur = (value) => {
  if (!value) return 'blur(12px)';
  return blurMap[value] || 'blur(12px)';
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tokens, mode, toggleMode, loading, error } = useDesignSystem();

  // Hooks must be called before any conditional returns
  const logoSources = useMemo(
    () => ({
      logo1: getLogoUrl('logo1'),
      logo2: getLogoUrl('logo2')
    }),
    []
  );

  // Show nothing only while actively loading (not if there's an error - use fallbacks)
  if (loading) {
    return null;
  }

  // Early return if tokens are not loaded
  if (!tokens) {
    return null;
  }

  const headerConfig = tokens?.components?.header || {};
  const modeHeader = tokens?.modes?.[mode]?.header || {};
  const navigationTokens = modeHeader?.navigation || {};
  const createButtonTokens = modeHeader?.createButton || {};
  const themeToggleTokens = modeHeader?.themeToggle || {};
  const spacing = headerConfig?.spacing || {};

  const logoZone = tokens?.layout?.logoZone || {};
  const logoImageStyle = {
    height: logoZone?.image?.height || '100%',
    width: logoZone?.image?.width || 'auto',
    minWidth: logoZone?.image?.minWidth || '120px',
    maxWidth: logoZone?.image?.maxWidth || '200px',
    minHeight: logoZone?.image?.minHeight || '32px',
    maxHeight: logoZone?.image?.maxHeight || headerConfig?.height || '80px'
  };

  const headerStyle = {
    width: headerConfig?.width || '100%',
    height: headerConfig?.height || '80px',
    minWidth: headerConfig?.minWidth || '320px',
    maxWidth: headerConfig?.maxWidth || '1280px',
    minHeight: headerConfig?.minHeight || '80px',
    maxHeight: headerConfig?.maxHeight || '80px',
    fontFamily: headerConfig?.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: headerConfig?.fontSize || '16px',
    lineHeight: headerConfig?.lineHeight || '24px',
    letterSpacing: headerConfig?.letterSpacing || '0',
    background: headerConfig?.surface?.[mode] || modeHeader?.background || 'rgba(255, 255, 255, 0.95)',
    borderBottom: modeHeader?.border || '1px solid #e2e8f0',
    boxShadow: headerConfig?.shadow?.[mode] || modeHeader?.shadow || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: headerConfig?.zIndex || 50,
    position: headerConfig?.position || 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backdropFilter: resolveBackdropBlur(headerConfig?.backdropBlur || modeHeader?.backdropBlur),
    '--header-padding-mobile': spacing?.padding?.mobile || '16px',
    '--header-padding-tablet': spacing?.padding?.tablet || '24px',
    '--header-padding-desktop': spacing?.padding?.desktop || '32px',
    '--header-gap-mobile': spacing?.gap?.mobile || '8px',
    '--header-gap-tablet': spacing?.gap?.tablet || '12px',
    '--header-gap-desktop': spacing?.gap?.desktop || '16px',
    '--header-max-width': modeHeader?.maxWidth || '1280px'
  };

  const buttonStyle = {
    background: createButtonTokens?.gradient || navigationTokens?.active?.background || '#047857',
    color: createButtonTokens?.text || '#ffffff',
    borderRadius: createButtonTokens?.borderRadius || headerConfig?.radius || '12px',
    padding: createButtonTokens?.padding || '8px 16px',
    fontSize: createButtonTokens?.fontSize || '14px',
    fontWeight: createButtonTokens?.fontWeight || 500,
    boxShadow: createButtonTokens?.shadow || headerConfig?.shadow?.[mode] || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    gap: createButtonTokens?.gap || '8px'
  };

  const toggleStyle = {
    width: themeToggleTokens?.size || '40px',
    height: themeToggleTokens?.size || '40px',
    background: themeToggleTokens?.background || '#f1f5f9',
    border: themeToggleTokens?.border || '1px solid #e2e8f0',
    borderRadius: themeToggleTokens?.borderRadius || '50%',
    color: themeToggleTokens?.text || '#475569'
  };

  return (
    <header className="app-header" style={headerStyle}>
        <div className="header-inner">
          <div
            className="logo-wrapper"
            style={{
              gap: logoZone?.parent?.gap || '16px',
              padding: logoZone?.parent?.spacing || '16px 0'
            }}
          >
            <img
              src={logoSources.logo1}
              alt="EDUCORE Symbol"
              className="header-logo primary-logo"
              loading="lazy"
              style={logoImageStyle}
            />
            <img
              src={logoSources.logo2}
              alt="EDUCORE Wordmark"
              className="header-logo secondary-logo"
              loading="lazy"
              style={logoImageStyle}
            />
          </div>

          <nav className="header-nav">
            {navigationItems.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              const navStyle = {
                color: isActive
                  ? navigationTokens?.active?.text || modeHeader?.text || '#1e293b'
                  : navigationTokens?.inactive?.text || modeHeader?.text || '#475569',
                background: isActive
                  ? navigationTokens?.active?.background || 'transparent'
                  : navigationTokens?.inactive?.background || 'transparent',
                borderRadius: navigationTokens?.borderRadius || '8px',
                fontSize: navigationTokens?.fontSize || '14px',
                fontWeight: navigationTokens?.fontWeight || 500,
                padding: navigationTokens?.padding || '12px',
                gap: navigationTokens?.gap || '8px'
              };

              return (
                <button
                  key={item.path}
                  className="nav-item"
                  style={navStyle}
                  onClick={() => navigate(item.path)}
                  type="button"
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="nav-indicator"
                      style={{ background: navigationTokens?.hover?.underline || navigationTokens?.active?.text || modeHeader?.text || '#047857' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              style={toggleStyle}
              onClick={toggleMode}
              aria-label="Toggle theme"
              disabled={loading}
            >
              {mode === 'light' ? '🌞' : '🌙'}
            </button>

            <button
              type="button"
              className="header-cta"
              style={buttonStyle}
              onClick={() => navigate('/register')}
            >
              <span>Register Company</span>
            </button>
          </div>
        </div>
      </header>
  );
}

export default Header;



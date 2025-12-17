import React, { useState, useMemo } from 'react';
import { useDesignSystem } from '../context/DesignSystemContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

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
  const { tokens, mode, toggleMode, loading } = useDesignSystem();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Logo selection: light mode → logo2, dark mode → logo1
  // Must be called before any conditional returns (React Hooks rule)
  const logoSources = useMemo(() => {
    const logoVariant = mode === 'light' ? 'logo2' : 'logo1';
    return {
      src: `/${logoVariant}.png`,
      alt: 'EDUCORE Directory'
    };
  }, [mode]);

  // Show nothing only while actively loading
  if (loading) {
    return null;
  }

  // Early return if tokens are not loaded
  if (!tokens) {
    return null;
  }

  const headerConfig = tokens?.components?.header || {};
  const modeHeader = tokens?.modes?.[mode]?.header || {};
  const modeTokens = tokens?.modes?.[mode] || tokens?.modes?.light || {};
  const themeToggleTokens = modeHeader?.themeToggle || {};
  const spacing = headerConfig?.spacing || {};
  const logoZone = tokens?.layout?.logoZone || {};

  // Header background should change with dark mode
  const headerBackground = mode === 'dark' 
    ? (headerConfig?.surface?.dark || modeHeader?.background || 'rgba(15, 23, 42, 0.95)')
    : (headerConfig?.surface?.light || modeHeader?.background || 'rgba(255, 255, 255, 0.95)');
  
  const headerBorder = mode === 'dark'
    ? (modeHeader?.border || '1px solid rgba(255, 255, 255, 0.1)')
    : (modeHeader?.border || '1px solid #e2e8f0');

  const headerStyle = {
    width: headerConfig?.width || '100%',
    height: headerConfig?.height || '80px',
    minHeight: headerConfig?.minHeight || '80px',
    maxHeight: headerConfig?.maxHeight || '80px',
    background: headerBackground,
    borderBottom: headerBorder,
    boxShadow: headerConfig?.shadow?.[mode] || modeHeader?.shadow || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: headerConfig?.zIndex || 50,
    position: headerConfig?.position || 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backdropFilter: resolveBackdropBlur(headerConfig?.backdropBlur || modeHeader?.backdropBlur),
    '--header-padding-mobile': spacing?.padding?.mobile || '16px',
    '--header-padding-tablet': spacing?.padding?.tablet || '24px',
    '--header-padding-desktop': spacing?.padding?.desktop || '32px'
  };

  const userMenuStyle = {
    background: modeHeader?.background || 'rgba(255, 255, 255, 0.95)',
    border: modeHeader?.border || '1px solid #e2e8f0',
    boxShadow: headerConfig?.shadow?.[mode] || modeHeader?.shadow || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    borderRadius: tokens?.global?.borderRadius?.scale?.card || '8px',
    padding: tokens?.global?.spacing?.padding?.card?.sm || '16px',
    minWidth: '200px'
  };

  const userButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens?.global?.spacing?.scale?.sm || '8px',
    padding: `${tokens?.global?.spacing?.scale?.sm || '8px'} ${tokens?.global?.spacing?.scale?.md || '16px'}`,
    background: 'transparent',
    border: `1px solid ${modeTokens?.border?.default || '#e2e8f0'}`,
    borderRadius: tokens?.global?.borderRadius?.scale?.button || '6px',
    color: modeTokens?.text?.primary || '#1e293b',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    fontSize: tokens?.global?.typography?.fontSize?.base?.size || '16px',
    fontWeight: tokens?.global?.typography?.fontWeight?.medium || 500
  };

  const toggleStyle = {
    width: themeToggleTokens?.size || '40px',
    height: themeToggleTokens?.size || '40px',
    background: themeToggleTokens?.background || '#f1f5f9',
    border: themeToggleTokens?.border || '1px solid #e2e8f0',
    borderRadius: themeToggleTokens?.borderRadius || '50%',
    color: themeToggleTokens?.text || '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease'
  };

  const toggleHoverStyle = {
    background: themeToggleTokens?.backgroundHover || '#d1fae5',
    transform: 'scale(1.05)'
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // Logo container style from design tokens - positioned on LEFT
  const logoContainerStyle = {
    ...logoZone?.container || {},
    height: logoZone?.container?.height || headerConfig?.height || '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed to flex-start for left alignment
    marginLeft: '0',
    marginRight: logoZone?.margin?.right || spacing?.gap?.desktop || '16px'
  };

  const logoImageStyle = {
    ...logoZone?.image || {},
    height: logoZone?.image?.height || logoZone?.image?.maxHeight || '80px',
    maxHeight: logoZone?.image?.maxHeight || '80px',
    minHeight: logoZone?.image?.minHeight || '32px',
    width: logoZone?.image?.width || 'auto',
    maxWidth: logoZone?.image?.maxWidth || '200px',
    minWidth: logoZone?.image?.minWidth || '120px',
    objectFit: logoZone?.image?.objectFit || 'contain',
    transition: logoZone?.image?.transition || 'all 300ms ease-in-out'
  };

  return (
    <header className="app-header" style={headerStyle}>
      <div className="header-inner">
        {/* Project Logo - Left Side */}
        <div className="logo-container" style={{
          ...logoContainerStyle,
          marginRight: logoZone?.margin?.right || spacing?.gap?.desktop || '16px',
          marginLeft: '0',
          justifyContent: 'flex-start'
        }}>
          <img
            src={logoSources.src}
            alt={logoSources.alt}
            style={logoImageStyle}
            onError={(e) => {
              console.error('Failed to load logo:', logoSources.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
        
        <div style={{ flex: 1 }}></div>
        
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* User Info - Only show when authenticated and user exists */}
          {isAuthenticated && user && user.id && (
            <div className="user-menu-container" style={{ position: 'relative' }}>
              <button
                type="button"
                className="user-button"
                style={userButtonStyle}
                onClick={() => setShowUserMenu(!showUserMenu)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = modeTokens?.button?.secondary?.backgroundHover || '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.fullName || user.email || 'User'}
                    className="user-avatar-img"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${modeTokens?.border?.default || '#e2e8f0'}`,
                      boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))'
                    }}
                    onError={(e) => {
                      // Fallback to avatar initial if image fails to load
                      e.target.style.display = 'none';
                      const fallback = e.target.nextSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="user-avatar"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: modeTokens?.gradient?.primary || 'linear-gradient(135deg, #065f46, #047857)',
                    display: user.profilePhotoUrl ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="user-name">
                  {user.fullName || user.email}
                </span>
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  style={{ 
                    transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease'
                  }}
                >
                  <path 
                    d="M3 4.5L6 7.5L9 4.5" 
                    stroke={modeTokens?.text?.secondary || '#475569'} 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="menu-backdrop"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 49
                    }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div 
                    className="user-menu"
                    style={{
                      ...userMenuStyle,
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      zIndex: 51,
                      marginTop: '8px'
                    }}
                  >
                    <div style={{ 
                      paddingBottom: '12px', 
                      borderBottom: `1px solid ${modeTokens?.border?.default || '#e2e8f0'}`,
                      marginBottom: '12px'
                    }}>
                      <div style={{ 
                        fontSize: tokens?.global?.typography?.fontSize?.sm?.size || '14px',
                        color: modeTokens?.text?.muted || '#64748b',
                        marginBottom: '4px'
                      }}>
                        {user.email}
                      </div>
                      <div style={{ 
                        fontSize: tokens?.global?.typography?.fontSize?.base?.size || '16px',
                        fontWeight: tokens?.global?.typography?.fontWeight?.semibold || 600,
                        color: modeTokens?.text?.primary || '#1e293b'
                      }}>
                        {user.fullName || 'User'}
                      </div>
                      {user.isHR && (
                        <div style={{ 
                          fontSize: tokens?.global?.typography?.fontSize?.xs?.size || '12px',
                          color: modeTokens?.text?.link || '#047857',
                          marginTop: '4px',
                          fontWeight: tokens?.global?.typography?.fontWeight?.medium || 500
                        }}>
                          HR Manager
                        </div>
                      )}
                      {(user.isAdmin || user.role === 'DIRECTORY_ADMIN') && (
                        <div style={{ 
                          fontSize: tokens?.global?.typography?.fontSize?.xs?.size || '12px',
                          color: modeTokens?.text?.link || '#047857',
                          marginTop: '4px',
                          fontWeight: tokens?.global?.typography?.fontWeight?.medium || 500
                        }}>
                          Directory Admin
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: `${tokens?.global?.spacing?.scale?.sm || '8px'} ${tokens?.global?.spacing?.scale?.md || '16px'}`,
                        background: modeTokens?.button?.destructive?.background || '#ef4444',
                        color: modeTokens?.button?.destructive?.text || '#ffffff',
                        border: 'none',
                        borderRadius: tokens?.global?.borderRadius?.scale?.button || '6px',
                        cursor: 'pointer',
                        fontSize: tokens?.global?.typography?.fontSize?.sm?.size || '14px',
                        fontWeight: tokens?.global?.typography?.fontWeight?.medium || 500,
                        transition: 'all 200ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: tokens?.global?.spacing?.scale?.sm || '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = modeTokens?.button?.destructive?.backgroundHover || '#dc2626';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = modeTokens?.button?.destructive?.background || '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path 
                          d="M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6M10 11.333L14 8M14 8L10 4.667M14 8H6" 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            className="theme-toggle"
            style={toggleStyle}
            onClick={toggleMode}
            aria-label="Toggle theme"
            disabled={loading}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, toggleHoverStyle);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = toggleStyle.background;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {mode === 'light' ? '🌞' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;



import React from 'react';
import { useDesignSystem } from '../context/DesignSystemContext';
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
  const themeToggleTokens = modeHeader?.themeToggle || {};
  const spacing = headerConfig?.spacing || {};

  const headerStyle = {
    width: headerConfig?.width || '100%',
    height: headerConfig?.height || '80px',
    minHeight: headerConfig?.minHeight || '80px',
    maxHeight: headerConfig?.maxHeight || '80px',
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
    '--header-padding-desktop': spacing?.padding?.desktop || '32px'
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

  return (
    <header className="app-header" style={headerStyle}>
      <div className="header-inner">
        <div style={{ flex: 1 }}></div>
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
    </header>
  );
}

export default Header;



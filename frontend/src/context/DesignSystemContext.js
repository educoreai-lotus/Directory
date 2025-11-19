import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchDesignTokens } from '../services/designTokenService';

const DesignSystemContext = createContext(null);

const cssVarMap = [
  ['--bg-body', ['modes', 'mode', 'background', 'body']],
  ['--bg-primary', ['modes', 'mode', 'background', 'appShell']],
  ['--bg-secondary', ['modes', 'mode', 'background', 'panel']],
  ['--bg-tertiary', ['modes', 'mode', 'background', 'section']],
  ['--bg-card', ['modes', 'mode', 'background', 'card']],
  ['--bg-panel', ['modes', 'mode', 'background', 'panel']],
  ['--text-primary', ['modes', 'mode', 'text', 'primary']],
  ['--text-secondary', ['modes', 'mode', 'text', 'secondary']],
  ['--text-muted', ['modes', 'mode', 'text', 'muted']],
  ['--text-inverse', ['modes', 'mode', 'text', 'inverse']],
  ['--text-accent', ['modes', 'mode', 'text', 'inverse']],
  ['--text-disabled', ['modes', 'mode', 'text', 'disabled']],
  ['--text-link', ['modes', 'mode', 'text', 'link']],
  ['--text-link-hover', ['modes', 'mode', 'text', 'linkHover']],
  ['--border-default', ['modes', 'mode', 'header', 'borderColor']],
  ['--border-subtle', ['modes', 'mode', 'background', 'section']],
  ['--border-strong', ['modes', 'mode', 'header', 'border']],
  ['--gradient-primary', ['modes', 'mode', 'gradient', 'primary']],
  ['--gradient-secondary', ['modes', 'mode', 'gradient', 'secondary']],
  ['--gradient-accent', ['modes', 'mode', 'gradient', 'accent']],
  ['--gradient-card', ['modes', 'mode', 'gradient', 'card']],
  ['--gradient-hero', ['modes', 'mode', 'gradient', 'hero']],
  ['--gradient-subtle', ['modes', 'mode', 'gradient', 'subtle']],
  ['--shadow-card', ['global', 'shadows', 'lg']],
  ['--shadow-glow', ['global', 'shadows', 'glow', 'primary']],
  ['--shadow-hover', ['global', 'shadows', 'xl']],
  ['--shadow-brand', ['branding', 'shadow', 'brand']],
  ['--shadow-brand-hover', ['branding', 'shadow', 'brandHover']],
  ['--shadow-brand-glow', ['branding', 'shadow', 'brandGlow']],
  ['--spacing-sm', ['global', 'spacing', 'scale', 'sm']],
  ['--spacing-md', ['global', 'spacing', 'scale', 'md']],
  ['--spacing-lg', ['global', 'spacing', 'scale', 'lg']],
  ['--radius-card', ['global', 'borderRadius', 'scale', 'card']],
  ['--radius-input', ['global', 'borderRadius', 'scale', 'input']],
  ['--radius-button', ['global', 'borderRadius', 'scale', 'button']],
  ['--radius-avatar', ['global', 'borderRadius', 'scale', 'avatar']]
];

const getValueByPath = (source, path, mode) => {
  if (!source) return null;
  let target = source;
  for (const segment of path) {
    if (segment === 'mode') {
      target = target?.[mode];
      continue;
    }
    target = target?.[segment];
    if (target === undefined || target === null) {
      return null;
    }
  }
  return target;
};

const applyCssVariables = (tokens, mode) => {
  if (!tokens) return;

  const root = document.documentElement;

  cssVarMap.forEach(([cssVar, path]) => {
    const value = getValueByPath(tokens, path, mode);
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  });

  const headerConfig = tokens?.components?.header;
  if (headerConfig?.height) {
    root.style.setProperty('--header-height', headerConfig.height);
  }

  const spacingScale = tokens?.global?.spacing?.scale;
  if (spacingScale) {
    root.style.setProperty('--spacing-xs', spacingScale.xs || '4px');
    root.style.setProperty('--spacing-sm', spacingScale.sm || '8px');
    root.style.setProperty('--spacing-md', spacingScale.md || '16px');
    root.style.setProperty('--spacing-lg', spacingScale.lg || '24px');
    root.style.setProperty('--spacing-xl', spacingScale.xl || '32px');
  }

  const borderRadiusScale = tokens?.global?.borderRadius?.scale;
  if (borderRadiusScale) {
    root.style.setProperty('--radius-avatar', borderRadiusScale.avatar || borderRadiusScale.full || '9999px');
  }
};

export const DesignSystemProvider = ({ children }) => {
  const [tokens, setTokens] = useState(null);
  const [mode, setMode] = useState('light');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadTokens = async () => {
      try {
        const data = await fetchDesignTokens();
        if (isMounted) {
          setTokens(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load design tokens');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTokens();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!tokens) return;
    applyCssVariables(tokens, mode);
    document.body.classList.toggle('dark', mode === 'dark');
    document.body.classList.toggle('day-mode', mode === 'light');
  }, [tokens, mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(
    () => ({
      tokens,
      mode,
      toggleMode,
      loading,
      error
    }),
    [tokens, mode, loading, error]
  );

  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = () => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};



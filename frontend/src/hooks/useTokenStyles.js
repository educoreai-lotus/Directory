// Custom hook to get token-based styles for common UI elements
import { useDesignSystem } from '../context/DesignSystemContext';

export const useTokenStyles = () => {
  const { tokens, mode } = useDesignSystem();

  if (!tokens) {
    return {
      page: {},
      card: {},
      button: {},
      text: {},
      spacing: {}
    };
  }

  const modeTokens = tokens.modes?.[mode] || tokens.modes?.light || {};
  const globalTokens = tokens.global || {};
  const componentTokens = tokens.components || {};

  return {
    page: {
      background: modeTokens.background?.body || '#f8fafc',
      color: modeTokens.text?.primary || '#1e293b',
      minHeight: '100vh',
      paddingTop: 'var(--header-height, 80px)'
    },
    card: {
      background: modeTokens.background?.card || '#ffffff',
      borderRadius: globalTokens.borderRadius?.scale?.card || '8px',
      boxShadow: globalTokens.shadows?.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${modeTokens.border?.default || '#e2e8f0'}`,
      padding: globalTokens.spacing?.padding?.card?.md || '24px'
    },
    button: {
      primary: {
        background: modeTokens.button?.primary?.background || '#047857',
        color: modeTokens.button?.primary?.text || '#ffffff',
        borderRadius: globalTokens.borderRadius?.scale?.button || '6px',
        padding: globalTokens.spacing?.padding?.button?.md || '12px 24px',
        fontSize: modeTokens.button?.fontSize?.desktop || '16px',
        fontWeight: modeTokens.button?.fontWeight || 600,
        boxShadow: modeTokens.button?.primary?.shadow || '0 4px 6px -1px rgba(6, 95, 70, 0.2)'
      },
      secondary: {
        background: modeTokens.button?.secondary?.background || '#f1f5f9',
        color: modeTokens.button?.secondary?.text || '#1e293b',
        borderRadius: globalTokens.borderRadius?.scale?.button || '6px',
        padding: globalTokens.spacing?.padding?.button?.md || '12px 24px',
        fontSize: modeTokens.button?.fontSize?.desktop || '16px',
        fontWeight: modeTokens.button?.fontWeight || 600,
        border: modeTokens.button?.secondary?.border || '1px solid #cbd5e1'
      }
    },
    text: {
      primary: modeTokens.text?.primary || '#1e293b',
      secondary: modeTokens.text?.secondary || '#475569',
      muted: modeTokens.text?.muted || '#64748b',
      heading: {
        fontFamily: globalTokens.typography?.fontFamily?.display || "'Space Grotesk', sans-serif",
        fontSize: globalTokens.typography?.fontSize?.['4xl']?.size || '36px',
        lineHeight: globalTokens.typography?.fontSize?.['4xl']?.lineHeight || '48px',
        fontWeight: globalTokens.typography?.fontWeight?.bold || 700
      }
    },
    spacing: {
      xs: globalTokens.spacing?.scale?.xs || '4px',
      sm: globalTokens.spacing?.scale?.sm || '8px',
      md: globalTokens.spacing?.scale?.md || '16px',
      lg: globalTokens.spacing?.scale?.lg || '24px',
      xl: globalTokens.spacing?.scale?.xl || '32px'
    }
  };
};


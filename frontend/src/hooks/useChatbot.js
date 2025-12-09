// useChatbot Hook
// React hook for chatbot initialization
// Based on: CHATBOT_SCRIPT_INTEGRATION_GUIDE.md

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import config from '../config';

export function useChatbot() {
  const { user, isAuthenticated } = useAuth();
  const [botInitialized, setBotInitialized] = useState(false);

  useEffect(() => {
    // Only initialize if user is logged in
    if (!isAuthenticated || !user || !user.id) {
      console.log('[useChatbot] User not authenticated, skipping chatbot initialization');
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('[useChatbot] No token found in localStorage, skipping chatbot initialization');
      return;
    }

    // Get RAG service URL (remove trailing slash if present)
    let ragServiceUrl = config.ragServiceUrl;
    if (!ragServiceUrl) {
      console.warn('[useChatbot] RAG service URL not configured, skipping chatbot initialization');
      return;
    }
    // Remove trailing slash to avoid double slashes
    ragServiceUrl = ragServiceUrl.replace(/\/$/, '');

    // Check if script is already loaded
    if (window.EDUCORE_BOT_LOADED) {
      // Script already loaded, just initialize
      if (window.initializeEducoreBot && !botInitialized) {
        console.log('[useChatbot] Script already loaded, initializing chatbot...');
        try {
          window.initializeEducoreBot({
            microservice: 'DIRECTORY',
            userId: user.id,
            token: token,
            tenantId: user.companyId || 'default'
          });
          setBotInitialized(true);
          console.log('[useChatbot] Chatbot initialized successfully');
        } catch (error) {
          console.error('[useChatbot] Error initializing chatbot:', error);
        }
      }
    } else {
      // Load script first
      console.log('[useChatbot] Loading chatbot script from:', ragServiceUrl);
      const script = document.createElement('script');
      script.src = `${ragServiceUrl}/embed/bot.js`;
      script.async = true;
      
      script.onload = () => {
        console.log('[useChatbot] Chatbot script loaded successfully');
        if (window.initializeEducoreBot && !botInitialized) {
          try {
            window.initializeEducoreBot({
              microservice: 'DIRECTORY',
              userId: user.id,
              token: token,
              tenantId: user.companyId || 'default'
            });
            setBotInitialized(true);
            console.log('[useChatbot] Chatbot initialized successfully');
          } catch (error) {
            console.error('[useChatbot] Error initializing chatbot:', error);
          }
        }
      };
      
      script.onerror = () => {
        console.error('[useChatbot] Failed to load chatbot script from:', ragServiceUrl);
      };
      
      document.head.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (window.destroyEducoreBot) {
        try {
          window.destroyEducoreBot();
          setBotInitialized(false);
          console.log('[useChatbot] Chatbot destroyed');
        } catch (error) {
          console.error('[useChatbot] Error destroying chatbot:', error);
        }
      }
    };
  }, [user, isAuthenticated, botInitialized]);
}


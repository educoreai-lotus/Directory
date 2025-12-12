// useChatbot Hook
// React hook for chatbot initialization
// Based on: CHATBOT_SCRIPT_INTEGRATION_GUIDE.md

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import config from '../config';

export function useChatbot() {
  const { user, isAuthenticated } = useAuth();
  const botInitializedRef = useRef(false);
  const scriptLoadedRef = useRef(false);

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

    // DISABLE CHATBOT: DIRECTORY microservice is not supported by bot.js
    // The bot only accepts "ASSESSMENT" or "DEVLAB" microservices
    // TODO: Enable when DIRECTORY microservice is supported by the chatbot
    console.log('[useChatbot] Chatbot disabled: DIRECTORY microservice not supported by bot.js');
    console.log('[useChatbot] Supported microservices: ASSESSMENT, DEVLAB');
    return;

    // NOTE: Below code is disabled until DIRECTORY microservice is supported
    /*
    // Check if script is already loaded
    if (window.EDUCORE_BOT_LOADED || scriptLoadedRef.current) {
      // Script already loaded, just initialize
      if (window.initializeEducoreBot && !botInitializedRef.current) {
        console.log('[useChatbot] Script already loaded, initializing chatbot...');
        try {
          window.initializeEducoreBot({
            microservice: 'ASSESSMENT', // Use ASSESSMENT as fallback until DIRECTORY is supported
            userId: user.id,
            token: token,
            tenantId: user.companyId || 'default'
          });
          botInitializedRef.current = true;
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
        scriptLoadedRef.current = true;
        if (window.initializeEducoreBot && !botInitializedRef.current) {
          try {
            window.initializeEducoreBot({
              microservice: 'ASSESSMENT', // Use ASSESSMENT as fallback until DIRECTORY is supported
              userId: user.id,
              token: token,
              tenantId: user.companyId || 'default'
            });
            botInitializedRef.current = true;
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
      if (window.destroyEducoreBot && botInitializedRef.current) {
        try {
          window.destroyEducoreBot();
          botInitializedRef.current = false;
          console.log('[useChatbot] Chatbot destroyed');
        } catch (error) {
          console.error('[useChatbot] Error destroying chatbot:', error);
        }
      }
    };
    */
  }, [user, isAuthenticated]); // Removed botInitialized from dependencies to prevent loop
}


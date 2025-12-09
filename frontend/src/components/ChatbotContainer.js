// Chatbot Container Component
// Container for chatbot widget
// Based on: CHATBOT_SCRIPT_INTEGRATION_GUIDE.md

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatbot } from '../hooks/useChatbot';

function ChatbotContainer() {
  const { isAuthenticated } = useAuth();
  
  // Initialize chatbot hook (only runs when authenticated)
  useChatbot();
  
  // Only render container if user is authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div id="edu-bot-container" />
  );
}

export default ChatbotContainer;


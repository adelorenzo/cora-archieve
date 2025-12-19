import { useRef, useEffect, useCallback } from 'react';
import conversationManager from '../lib/conversation-manager';

/**
 * Custom hook for managing conversation messages
 * Provides add, remove, and update operations for messages
 */
export function useMessages(activeConversation, setActiveConversation, setConversations) {
  const messagesEndRef = useRef(null);
  const messages = activeConversation?.messages || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Add a message to the current conversation
   */
  const addMessage = useCallback((message) => {
    if (!activeConversation) return;

    const updatedConversation = conversationManager.addMessage(
      activeConversation.id,
      message
    );

    if (updatedConversation) {
      setActiveConversation({ ...updatedConversation });
      setConversations(conversationManager.getAllConversations());
    }
  }, [activeConversation, setActiveConversation, setConversations]);

  /**
   * Remove the last message from the conversation
   */
  const removeLastMessage = useCallback(() => {
    if (!activeConversation?.messages?.length) return;

    const conversation = conversationManager.getConversation(activeConversation.id);
    if (conversation && conversation.messages.length > 0) {
      conversation.messages.pop();
      conversationManager.updateConversation(activeConversation.id, {
        messages: conversation.messages
      });
      setActiveConversation({ ...conversation });
    }
  }, [activeConversation, setActiveConversation]);

  /**
   * Update the last message (for streaming responses)
   */
  const updateLastMessage = useCallback((updater) => {
    if (!activeConversation?.messages?.length) return;

    const conversation = conversationManager.getConversation(activeConversation.id);
    if (conversation && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const updatedMessage = typeof updater === 'function' ? updater(lastMessage) : updater;
      conversation.messages[conversation.messages.length - 1] = updatedMessage;
      conversationManager.updateConversation(activeConversation.id, {
        messages: conversation.messages
      });
      setActiveConversation({ ...conversation });
    }
  }, [activeConversation, setActiveConversation]);

  /**
   * Clear all messages in the conversation
   */
  const clearMessages = useCallback(() => {
    if (!activeConversation) return;

    conversationManager.updateConversation(activeConversation.id, {
      messages: []
    });
    setActiveConversation({
      ...activeConversation,
      messages: []
    });
  }, [activeConversation, setActiveConversation]);

  return {
    messages,
    messagesEndRef,
    addMessage,
    removeLastMessage,
    updateLastMessage,
    clearMessages
  };
}

export default useMessages;

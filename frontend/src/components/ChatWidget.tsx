import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

// Cache buster: 2025-10-17-v2 - Provenance formatting debug

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provenance?: Array<{
    product_id: string;
    source_type: string;
    source_id?: string;
    similarity: number;
  }>;
}

interface ChatWidgetProps {
  className?: string;
  placeholder?: string;
  onSendMessage?: (message: string) => Promise<{ answer: string; provenance: any[] }>;
  messages?: Message[];
  isLoading?: boolean;
  apiUrl?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  className = '',
  placeholder = 'Ask about RAK Porcelain products...',
  onSendMessage,
  messages: externalMessages = [],
  isLoading: externalIsLoading = false,
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>(externalMessages);
  const [isLoading, setIsLoading] = useState(externalIsLoading);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle scroll detection
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }
  };

  // Initialize messages from external prop only once
  useEffect(() => {
    if (externalMessages.length > 0 && messages.length === 0) {
      setMessages(externalMessages);
    }
  }, []); // Empty dependency array - only run once

  // Sync external loading state
  useEffect(() => {
    setIsLoading(externalIsLoading);
  }, [externalIsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let response: { answer: string; provenance: any[] };
      
      if (onSendMessage) {
        response = await onSendMessage(messageContent);
      } else {
        // Default API call
        const res = await fetch(`${apiUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            sessionId
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        response = await res.json();
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.answer || 'No response received',
        timestamp: new Date(),
        provenance: response.provenance || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Scroll to bottom after adding message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatProvenance = (provenance: any[]) => {
    if (!provenance || provenance.length === 0) return null;
    
    console.log('Provenance data:', provenance); // Debug log
    
    return (
      <div className="chat-widget__provenance">
        <div className="chat-widget__provenance-title">📚 Sources:</div>
        {provenance.map((item, index) => {
          console.log('Provenance item:', item); // Debug log
          return (
            <div key={index} className="chat-widget__provenance-item">
              <div className="chat-widget__provenance-header">
                <span className="chat-widget__provenance-source">
                  {item.source_type === 'description' ? '📝 Product Description' : 
                   item.source_type === 'faq' ? '❓ FAQ' : 
                   item.source_type === 'document' ? '📄 Document' : 
                   item.source_type}
                </span>
                {item.similarity && (
                  <span className="chat-widget__provenance-similarity">
                    {Math.round(Math.min(item.similarity * 100, 100))}% match
                  </span>
                )}
              </div>
              {item.text_snippet && (
                <div className="chat-widget__provenance-snippet">
                  {item.text_snippet}
                </div>
              )}
              {item.product_id && (
                <div className="chat-widget__provenance-id">
                  Product ID: {item.product_id.substring(0, 8)}...
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`chat-widget ${className}`}>
      <div className="chat-widget__header">
        <div className="chat-widget__logo">
          <div className="chat-widget__logo-icon">🏺</div>
          <div className="chat-widget__logo-text">
            <div className="chat-widget__logo-title">RAK Porcelain</div>
            <div className="chat-widget__logo-subtitle">AI Assistant</div>
          </div>
        </div>
      </div>
      
      <div className="chat-widget__messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="chat-widget__empty-state">
            <div className="chat-widget__empty-icon">💬</div>
            <p>Welcome to RAK Porcelain Assistant!</p>
            <p>Ask me about our products, specifications, or any questions you have.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-widget__message chat-widget__message--${message.role}`}
            >
              <div className="chat-widget__message-content">
                {message.content}
                {message.provenance && formatProvenance(message.provenance)}
              </div>
              <div className="chat-widget__message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-widget__message chat-widget__message--assistant">
            <div className="chat-widget__typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        
        {showScrollButton && (
          <button
            className="chat-widget__scroll-button"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            ↓
          </button>
        )}
      </div>

      <form className="chat-widget__input-form" onSubmit={handleSubmit}>
        <div className="chat-widget__input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="chat-widget__input"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-widget__send-button"
            disabled={!inputValue.trim() || isLoading}
          >
            <span className="chat-widget__send-icon">→</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;// Cache buster: Fri Oct 17 10:28:50 IST 2025

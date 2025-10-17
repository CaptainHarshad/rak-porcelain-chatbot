import React, { useState } from 'react';
import ChatWidget from './components/ChatWidget';
import './chat-demo.css';

const ChatDemo: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');

  // Check API connection on component mount
  React.useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/health`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.status === 'OK');
        setConnectionStatus('Connected to RAK Porcelain AI');
      } else {
        setIsConnected(false);
        setConnectionStatus('Connection failed');
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionStatus('Unable to connect to API');
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: `demo_${Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return (
    <div className="chat-demo">
      <div className="chat-demo__header">
        <div className="chat-demo__title">
          <h1>RAK Porcelain AI Assistant</h1>
          <p>Experience our intelligent product assistant powered by RAG technology</p>
        </div>
        <div className={`chat-demo__status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="chat-demo__status-indicator"></div>
          <span>{connectionStatus}</span>
        </div>
      </div>

      <div className="chat-demo__content">
        <div className="chat-demo__sidebar">
          <div className="chat-demo__info">
            <h3>About RAK Porcelain</h3>
            <p>
              RAK Porcelain is a premium Turkish porcelain brand known for its exquisite 
              hand-painted designs and traditional craftsmanship. Our products combine 
              timeless elegance with modern functionality.
            </p>
          </div>

          <div className="chat-demo__features">
            <h4>AI Assistant Features</h4>
            <ul>
              <li>Product information and specifications</li>
              <li>Care instructions and maintenance</li>
              <li>FAQ and troubleshooting</li>
              <li>Design and style recommendations</li>
              <li>Pricing and availability</li>
            </ul>
          </div>

          <div className="chat-demo__examples">
            <h4>Try asking:</h4>
            <div className="chat-demo__example-question">
              "Tell me about your dinner sets"
            </div>
            <div className="chat-demo__example-question">
              "Is the tea set dishwasher safe?"
            </div>
            <div className="chat-demo__example-question">
              "What are the dimensions of the vase?"
            </div>
            <div className="chat-demo__example-question">
              "How should I care for hand-painted pieces?"
            </div>
          </div>
        </div>

        <div className="chat-demo__widget-container">
          <ChatWidget
            onSendMessage={handleSendMessage}
            placeholder="Ask about RAK Porcelain products..."
            className="chat-demo__widget"
          />
        </div>
      </div>

      <div className="chat-demo__footer">
        <p>
          This demo showcases RAK Porcelain's AI assistant powered by Retrieval-Augmented Generation (RAG) technology.
          The assistant can only provide information from our product database and will escalate questions it cannot answer.
        </p>
        <div className="chat-demo__tech-stack">
          <span>Powered by OpenAI GPT-4</span>
          <span>•</span>
          <span>Supabase + pgvector</span>
          <span>•</span>
          <span>React + TypeScript</span>
        </div>
      </div>
    </div>
  );
};

export default ChatDemo;

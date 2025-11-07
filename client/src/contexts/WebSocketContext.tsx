import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

export interface WebSocketMessage {
  type: 'pixelClaimed' | 'pixelTransferred' | 'pixelMelted' | 'achievement_unlocked';
  pixel?: any;
  user?: any;
  fromUser?: string;
  toUser?: string;
  userId?: string;
  userAddress?: string;
  achievementType?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  addMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  removeMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlers = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  const addMessageHandler = (handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current.add(handler);
  };

  const removeMessageHandler = (handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current.delete(handler);
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      if (ws.current?.readyState === WebSocket.CONNECTING || ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          messageHandlers.current.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, addMessageHandler, removeMessageHandler }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketMessage(onMessage?: (message: WebSocketMessage) => void) {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketMessage must be used within a WebSocketProvider');
  }

  useEffect(() => {
    if (onMessage) {
      context.addMessageHandler(onMessage);
      return () => context.removeMessageHandler(onMessage);
    }
  }, [context, onMessage]);

  return { isConnected: context.isConnected };
}
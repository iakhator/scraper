import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { JobUpdateEvent } from '../types';

interface UseSocketProps {
  onJobUpdate?: (event: JobUpdateEvent) => void;
  onJobAdded?: (event: JobUpdateEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useSocket = ({ onJobUpdate, onJobAdded, onConnect, onDisconnect }: UseSocketProps = {}) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.IO server - derive WebSocket URL from API URL
    const wsUrl = import.meta.env.VITE_WS_URL;
    
    socketRef.current = io(wsUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      onConnect?.();
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      onDisconnect?.();
    });

    // Job events
    socket.on('job_updated', (event: JobUpdateEvent) => {
      console.log('📄 Job updated:', event);
      onJobUpdate?.(event);
    });

    socket.on('job_added', (event: JobUpdateEvent) => {
      console.log('➕ Job added:', event);
      onJobAdded?.(event);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [onJobUpdate, onJobAdded, onConnect, onDisconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
  };
};

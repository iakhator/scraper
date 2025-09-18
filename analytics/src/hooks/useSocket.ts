import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { JobUpdateEvent } from '../types';

// Define socket options as a constant to avoid recreating
const SOCKET_OPTIONS = {
  path: '/ws',
  transports: ['websocket', 'polling'],
};

interface UseSocketProps {
  onJobUpdate?: (event: JobUpdateEvent) => void;
  onJobAdded?: (event: JobUpdateEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export const useSocket = ({
  onJobUpdate,
  onJobAdded,
  onConnect,
  onDisconnect,
}: UseSocketProps = {}): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Only initialize socket if not already created
    if (!socketRef.current) {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
      socketRef.current = io(wsUrl, SOCKET_OPTIONS);
    }

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      setIsConnected(true);
      onConnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
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
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [onJobUpdate, onJobAdded, onConnect, onDisconnect]);

  return {
    socket: socketRef.current,
    isConnected,
  };
};

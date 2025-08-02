import { io } from "socket.io-client";

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const socketUrl = runtimeConfig.public.WS_URL || "http://localhost:3001";
  
  // Extract the base URL (remove /ws path if present) and let Socket.IO use the path option
  const baseUrl = socketUrl.replace('/ws', '');
  
  const socket = io(baseUrl, {
    path: '/ws',  // This should match the server path configuration
    autoConnect: true,
    transports: ['websocket', 'polling']
  });

  // Add connection logging
  socket.on('connect', () => {
    console.log('Socket.IO connected to:', baseUrl);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });

  return {
    provide: {
      socket
    }
  };
});

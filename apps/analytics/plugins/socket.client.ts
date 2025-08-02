import { io } from "socket.io-client";

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const socketUrl = runtimeConfig.public.WS_URL || "http://localhost:3001";
  
  // Extract the base URL (remove /ws path if present) and let Socket.IO use the path option
  const baseUrl = socketUrl.replace('/ws', '');
  
  console.log('Creating Socket.IO connection to:', baseUrl);
  
  const socket = io(baseUrl, {
    path: '/ws', 
    autoConnect: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket.IO Plugin: Connected to:', baseUrl, 'ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO Plugin: Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO Plugin: Connection error:', error);
  });

  return {
    provide: {
      socket
    }
  };
});

export const useWebSocket = () => {
  const getWebSocketUrl = () => {
    if (!import.meta.client) return null
    
     return useRuntimeConfig().public.wsUrl
  }

  const createConnection = (onMessage, onConnect, onDisconnect) => {
    const wsUrl = getWebSocketUrl()
    if (!wsUrl) return null

    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      if (onConnect) onConnect()
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (onMessage) onMessage(message)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      if (onDisconnect) onDisconnect()
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      if (onDisconnect) onDisconnect()
    }

    return ws
  }

  return {
    getWebSocketUrl,
    createConnection
  }
}

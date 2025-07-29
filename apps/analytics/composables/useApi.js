export const useApi = () => {
  const getApiUrl = (endpoint) => {
    const baseUrl = useRuntimeConfig().public.BASE_URL
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    
    return `${baseUrl}${normalizedEndpoint}`
  }

  // Common API endpoints
  const endpoints = {
    jobs: '/api/jobs',
    urls: '/api/urls',
    content: (jobId) => `/api/content/${jobId}`
  }

  // Helper methods for common operations
  const api = {
    get: async (endpoint) => {
      const url = getApiUrl(endpoint)
      return await $fetch(url)
    },
    
    post: async (endpoint, data) => {
      const url = getApiUrl(endpoint)
      return await $fetch(url, {
        method: 'POST',
        body: data
      })
    },
    
    put: async (endpoint, data) => {
      const url = getApiUrl(endpoint)
      return await $fetch(url, {
        method: 'PUT',
        body: data
      })
    },
    
    delete: async (endpoint) => {
      const url = getApiUrl(endpoint)
      return await $fetch(url, {
        method: 'DELETE'
      })
    }
  }

  return {
    getApiUrl,
    endpoints,
    api
  }
}

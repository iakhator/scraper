export const useScraperStore = () => {
  // Reactive state
  const jobs = ref([
    {
      id: '1234-5678',
      url: 'https://example.com',
      priority: 'medium',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    },
    {
      id: '2345-6789',
      url: 'https://test.com',
      priority: 'high',
      status: 'processing',
      createdAt: new Date().toISOString(),
      retryCount: 1,
      maxRetries: 3
    },
    {
      id: '3456-7890',
      url: 'https://github.com',
      priority: 'low',
      status: 'failed',
      createdAt: new Date().toISOString(),
      retryCount: 3,
      maxRetries: 3
    }
  ])

  const connectionStatus = ref({
    connected: true,
    text: 'Connected'
  })

  // Computed stats
  const stats = computed(() => {
    const completed = jobs.value.filter(j => j.status === 'completed').length
    const processing = jobs.value.filter(j => j.status === 'processing').length
    const failed = jobs.value.filter(j => j.status === 'failed').length
    const queued = jobs.value.filter(j => j.status === 'queued').length
    
    return {
      completed,
      processing,
      failed,
      queued
    }
  })

  // Methods
  const addJob = async (jobData) => {
    const newJob = {
      id: Math.random().toString(36).substr(2, 9),
      url: jobData.url,
      priority: jobData.priority,
      status: 'queued',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    }
    
    jobs.value.unshift(newJob)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const refreshJobs = async () => {
    // Simulate API call to refresh jobs
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update connection status
    connectionStatus.value = {
      connected: true,
      text: 'Connected'
    }
  }

  const updateJobStatus = (jobId, status, additionalData = {}) => {
    const jobIndex = jobs.value.findIndex(j => j.id === jobId)
    if (jobIndex !== -1) {
      jobs.value[jobIndex] = {
        ...jobs.value[jobIndex],
        status,
        ...additionalData
      }
    }
  }

  return {
    jobs: readonly(jobs),
    stats,
    connectionStatus: readonly(connectionStatus),
    addJob,
    refreshJobs,
    updateJobStatus
  }
}

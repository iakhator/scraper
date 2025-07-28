<template>
  <div class="bg-gray-50 text-gray-900 leading-6 font-sans">
    <header class="bg-white border-b border-gray-200 py-5 sticky top-0 z-50">
     <div class="max-w-6xl mx-auto px-6">
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
             S
           </div>
           <div class="text-xl font-semibold text-gray-900">Scraper</div>
         </div>
         <div class="flex items-center gap-4">
           <div class="flex items-center gap-2">
             <div 
               class="w-2 h-2 rounded-full" 
               :class="connectionDotClass"
             />
             <span class="text-sm text-gray-600">{{ connectionStatus }}</span>
           </div>
           <button 
             :disabled="isRefreshing"
             class="btn btn-secondary"
             @click="refreshData"
           >
             <span 
               class="inline-block"
               :class="{ 'animate-spin': isRefreshing }"
             >
               ↻
             </span>
             Refresh
           </button>
         </div>
       </div>
     </div>
   </header>
   <div class="p-6">
     <div class="max-w-[69rem] mx-auto">
       <!-- Header -->
       <div class="mb-8">
         <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
         <p class="text-gray-600">Submit URLs for scraping and monitor their status in real-time</p>
       </div>

       <!-- Stats Cards -->
       <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-8 bg-white rounded-lg border border-gray-300 overflow-hidden">
         <div class="p-6 text-center border-r border-b md:border-b lg:border-b-0 border-gray-300">
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.queued }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">IN QUEUE</div>
         </div>
         <div class="p-6 text-center border-b md:border-b lg:border-b-0 lg:border-r border-gray-300">
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.processing }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">PROCESSING</div>
         </div>
         <div class="p-6 text-center border-r md:border-r lg:border-r border-gray-300">
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.completed }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">COMPLETED</div>
         </div>
         <div class="p-6 text-center">
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.failed }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">FAILED</div>
         </div>
       </div>
 
       <!-- Connection Status -->
       <!-- <div class="mb-6 p-4 rounded-lg" :class="connectionStatusClass">
         <div class="flex items-center">
           <div class="w-3 h-3 rounded-full mr-3" :class="connectionDotClass" />
           <span class="font-medium">{{ connectionStatus }}</span>
         </div>
       </div> -->
 
       <!-- URL Submission Form -->
       <div class="bg-white rounded-lg border border-gray-300 p-6 mb-8">
         <h2 class="text-xl font-semibold mb-4">Submit URL for Scraping</h2>
         
         <!-- Tab Selection -->
         <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
           <button 
             type="button"
             :class="[
               'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
               submissionMode === 'single' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             ]"
             @click="submissionMode = 'single'"
           >
             Single
           </button>
           <button 
             type="button"
             :class="[
               'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
               submissionMode === 'bulk' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             ]"
             @click="submissionMode = 'bulk'"
           >
             Bulk
           </button>
         </div>

         <form class="space-y-4" @submit.prevent="submitUrl">
           <!-- Single URL Input -->
           <div v-if="submissionMode === 'single'">
             <label for="url" class="block text-sm font-medium text-gray-700 mb-2">
               URL to scrape
             </label>
             <input
               id="url"
               v-model="urlInput"
               type="url"
               required
               placeholder="https://example.com"
               class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
           </div>
           <!-- priority -->
           <div>
             <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">
               Priority
             </label>
             <select
               id="priority"
               v-model="priority"
               class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
               <option value="low">Low</option>
               <option value="medium">Medium</option>
               <option value="high">High</option>
             </select>
           </div>
           <!-- Bulk URLs Input -->
           <div v-if="submissionMode === 'bulk'">
             <label for="bulk-urls" class="block text-sm font-medium text-gray-700 mb-2">
               URLs to scrape (one per line)
             </label>
             <textarea
               id="bulk-urls"
               v-model="bulkUrls"
               rows="5"
               required
               placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
               class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
           
           <button
             type="submit"
             :disabled="isSubmitting"
             class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {{ isSubmitting ? 'Submitting...' : (submissionMode === 'single' ? 'Submit URL' : 'Submit URLs') }}
           </button>
         </form>
       </div>
 
       <!-- Jobs Table -->
       <div class="bg-white rounded-lg border border-gray-300 overflow-hidden">
         <div class="px-6 py-4 border-b border-gray-200">
           <h2 class="text-xl font-semibold">Scraping Jobs</h2>
           <p class="text-sm text-gray-600 mt-1">{{ jobs.length }} total jobs</p>
         </div>
         
         <div class="overflow-x-auto">
           <table class="w-full">
             <thead class="bg-gray-50">
               <tr>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   URL
                 </th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Status
                 </th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Priority
                 </th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Created
                 </th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Title
                 </th>
                 <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Actions
                 </th>
               </tr>
             </thead>
             <tbody class="bg-white divide-y divide-gray-200">
               <tr v-for="job in jobs" :key="job.jobId" class="hover:bg-gray-50">
                 <td class="px-6 py-4 whitespace-nowrap">
                   <div class="text-sm text-gray-900 max-w-xs truncate" :title="job.url">
                     {{ job.url }}
                   </div>
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap">
                   <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="getStatusClass(job.status)">
                     {{ job.status }}
                   </span>
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap">
                   <span class="inline-flex px-2 py-1 text-xs rounded-full" :class="getPriorityClass(job.priority)">
                     {{ job.priority }}
                   </span>
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {{ formatTime(job.createdAt) }}
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap">
                   <div class="text-sm text-gray-900 max-w-xs truncate" :title="job.title || 'N/A'">
                     {{ job.title || 'N/A' }}
                   </div>
                 </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                   <button
                     v-if="job.status === 'completed'"
                     class="text-blue-600 hover:text-blue-900"
                     @click="viewContent(job.jobId)"
                   >
                     View Content
                   </button>
                   <span v-else class="text-gray-400">-</span>
                 </td>
               </tr>
               <tr v-if="jobs.length === 0">
                 <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                   No jobs yet. Submit a URL above to get started!
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
       </div>
     </div>
   </div>
  </div>
</template>

<script setup>
// import { ref, onMounted, onUnmounted, computed } from 'vue'
const { refreshJobs } = useScraperStore()
const { showAlert, alert } = useAlert()
// endpoint url = https://scraper-queue.onrender.com/api/

const urlInput = ref('')
const bulkUrls = ref('')
const priority = ref('medium')
const isSubmitting = ref(false)
const jobs = ref([])
const wsConnected = ref(false)
const isRefreshing = ref(false)
const submissionMode = ref('single')
let ws = null


// WebSocket connection management
const connectionStatus = computed(() => {
  return wsConnected.value ? 'Connected to real-time updates' : 'Disconnected - Updates may be delayed'
})

const connectionDotClass = computed(() => {
  return wsConnected.value ? 'bg-green-500' : 'bg-red-500'
})

// Job statistics computed from jobs array
const jobStats = computed(() => {
  const stats = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  }
  
  jobs.value.forEach(job => {
    switch (job.status) {
      case 'queued':
        stats.queued++
        break
      case 'processing':
        stats.processing++
        break
      case 'completed':
        stats.completed++
        break
      case 'failed':
        stats.failed++
        break
    }
  })
  
  return stats
})

// Update job status in the table
function updateJobStatus(jobId, status, data) {
  const job = jobs.value.find(j => j.jobId === jobId)
  if (job) {
    job.status = status
    job.lastUpdated = new Date().toISOString()
    
    // Update additional data if provided
    if (data) {
      if (data.title) job.title = data.title
      if (data.completedAt) job.completedAt = data.completedAt
      if (data.error) job.error = data.error
    }
  }
}

async function submitUrl() {
  if (!urlInput.value.trim()) return
  
  isSubmitting.value = true
  
  try {
    const { api } = useApi()
    const result = await api.post('/api/urls', {
      url: urlInput.value.trim(),
      priority: priority.value
    })
    
    // Add job to the table
    const newJob = {
      jobId: result.jobId,
      url: urlInput.value.trim(),
      status: result.status,
      priority: priority.value,
      createdAt: new Date().toISOString(),
      title: null,
      completedAt: null
    }
    
    jobs.value.unshift(newJob)
    
    subscribeToJob(result.jobId)
    
    urlInput.value = ''
    
    console.log('URL submitted successfully:', result)
    
  } catch (error) {
    console.error('Error submitting URL:', error)
  } finally {
    isSubmitting.value = false
  }
}

function getStatusClass(status) {
  const classes = {
    'queued': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'retrying': 'bg-orange-100 text-orange-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

function getPriorityClass(priority) {
  const classes = {
    'low': 'bg-gray-100 text-gray-700',
    'normal': 'bg-blue-100 text-blue-700',
    'high': 'bg-red-100 text-red-700'
  }
  return classes[priority] || 'bg-gray-100 text-gray-700'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

function viewContent(jobId) {
  console.log('View content for job:', jobId)
}

onMounted(() => {
  connectWebSocket()
  fetchExistingJobs()
})

async function fetchExistingJobs() {
  try {
    const { api } = useApi()
    const response = await api.get('/api/jobs')

    console.log(response, 'response')
    
    if (!response.data) {
      console.error('Failed to fetch jobs:', response)
      return
    }
    
    const existingJobs = response.data

    
    if (!Array.isArray(existingJobs)) {
      console.warn('Expected array of jobs, got:', typeof existingJobs)
      return
    }
    
    jobs.value = existingJobs.map(job => ({
      jobId: job.id,
      url: job.url,
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt,
      title: job.title || null,
      completedAt: job.completedAt || null,
      error: job.errorMessage || null
    }))
    
    existingJobs.forEach(job => {
      subscribeToJob(job.id)
    })
    
    console.log(`Loaded ${existingJobs.length} existing jobs`)
    
  } catch (error) {
    console.error('Error fetching existing jobs:', error)
  }
}

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})


// Socket
const refreshData = async () => {
  isRefreshing.value = true
  try {
    await refreshJobs()
    showAlert('Data refreshed', 'success')
  } catch (err) {
    console.error('Refresh failed:', err)
    showAlert('Failed to refresh data', 'error')
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 1000)
  }
}

function connectWebSocket() {
  try {
    const { createConnection } = useWebSocket()
    
    ws = createConnection(
      handleWebSocketMessage,
      () => { wsConnected.value = true },
      () => { 
        wsConnected.value = false
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
    )
    
    if (!ws) {
      console.warn('WebSocket not available (likely SSR)')
    }
  } catch (error) {
    console.error('Failed to connect WebSocket:', error)
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'connected':
      console.log('WebSocket client ID:', message.clientId)
      break
      
    case 'job-update':
      updateJobStatus(message.jobId, message.status, message.data)
      break
      
    default:
      console.log('Unknown message type:', message)
  }
}

// Subscribe to job updates
function subscribeToJob(jobId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'subscribe-job',
      jobId
    }))
  }
}
</script>

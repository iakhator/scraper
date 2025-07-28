<template>
  <div class="bg-gray-50 text-gray-900 leading-6 font-sans">
    <header class="bg-white border-b border-gray-200 py-5 sticky top-0 z-50">
     <div class="max-w-6xl mx-auto px-6">
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
             <Globe class="w-5 h-5" />
           </div>
           <div class="text-xl font-semibold text-gray-900">Scraper Analytics</div>
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
             class="btn btn-secondary flex items-center gap-2"
             @click="refreshData"
           >
             <RefreshCw 
               class="w-4 h-4"
               :class="{ 'animate-spin': isRefreshing }" 
             />
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
         <h1 class="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
         <p class="text-gray-600">Monitor your web scraping operations</p>
       </div>

       <!-- Stats Cards -->
       <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-8 bg-white rounded-lg border border-gray-300 overflow-hidden">
         <div class="p-6 text-center border-r border-b md:border-b lg:border-b-0 border-gray-300">
           <div class="flex items-center justify-center mb-3">
             <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
               <Clock class="w-5 h-5 text-yellow-600" />
             </div>
           </div>
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.queued }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">IN QUEUE</div>
         </div>
         <div class="p-6 text-center border-b md:border-b lg:border-b-0 lg:border-r border-gray-300">
           <div class="flex items-center justify-center mb-3">
             <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
               <Activity class="w-5 h-5 text-blue-600" />
             </div>
           </div>
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.processing }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">PROCESSING</div>
         </div>
         <div class="p-6 text-center border-r md:border-r lg:border-r border-gray-300">
           <div class="flex items-center justify-center mb-3">
             <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
               <CheckCircle class="w-5 h-5 text-green-600" />
             </div>
           </div>
           <div class="text-3xl font-bold text-gray-900 mb-2">{{ jobStats.completed }}</div>
           <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">COMPLETED</div>
         </div>
         <div class="p-6 text-center">
           <div class="flex items-center justify-center mb-3">
             <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
               <AlertCircle class="w-5 h-5 text-red-600" />
             </div>
           </div>
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
         <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
           <Link class="w-5 h-5 text-blue-600" />
           Submit URL for Scraping
         </h2>
         
         <!-- Tab Selection -->
         <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
           <button 
             type="button"
             :class="[
               'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2',
               submissionMode === 'single' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             ]"
             @click="submissionMode = 'single'"
           >
             <Link class="w-4 h-4" />
             Single
           </button>
           <button 
             type="button"
             :class="[
               'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2',
               submissionMode === 'bulk' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             ]"
             @click="submissionMode = 'bulk'"
           >
             <FileText class="w-4 h-4" />
             Bulk
           </button>
           <button 
             type="button"
             :class="[
               'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2',
               submissionMode === 'file' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             ]"
             @click="submissionMode = 'file'"
           >
             <Upload class="w-4 h-4" />
             File Upload
           </button>
         </div>

         <form v-if="submissionMode !== 'file'" class="space-y-4" @submit.prevent="submitUrl">
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
             v-if="submissionMode !== 'file'"
             type="submit"
             :disabled="isSubmitting"
             class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
             <Send v-else class="w-4 h-4" />
             {{ isSubmitting ? 'Submitting...' : (submissionMode === 'single' ? 'Submit URL' : 'Submit URLs') }}
           </button>
         </form>

         <!-- File Upload Form -->
         <form v-if="submissionMode === 'file'" class="space-y-4" @submit.prevent="submitFile">
           <div>
             <label class="block text-sm font-medium text-gray-700 mb-3">
               Upload URL file (CSV, TXT)
             </label>
             <FileUpload 
               @file-processed="handleFileProcessed"
               @file-removed="handleFileRemoved"
             />
           </div>

           <!-- Submit Button -->
           <button 
             type="submit" 
             :disabled="!selectedFile || !filePreview?.length"
             class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Upload class="w-4 h-4 mr-2" />
             Submit File ({{ filePreview?.length || 0 }} URLs)
           </button>
         </form>
       </div>
 
       <!-- Jobs Table -->
       <div class="bg-white rounded-lg border border-gray-300 overflow-hidden">
         <div class="px-6 py-4 border-b border-gray-200">
           <div class="flex items-center justify-between">
             <div>
               <h2 class="text-xl font-semibold flex items-center gap-2">
                 <Database class="w-5 h-5 text-blue-600" />
                 Scraping Jobs
               </h2>
               <p class="text-sm text-gray-600 mt-1">{{ filteredJobs.length }} of {{ jobs.length }} jobs</p>
             </div>
             
             <!-- Filters -->
             <div class="flex items-center gap-3">
               <!-- Status Filter -->
               <select 
                 v-model="statusFilter" 
                 class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
               >
                 <option value="">All Status</option>
                 <option value="queued">Queued</option>
                 <option value="processing">Processing</option>
                 <option value="completed">Completed</option>
                 <option value="failed">Failed</option>
               </select>
               
               <!-- Priority Filter -->
               <select 
                 v-model="priorityFilter" 
                 class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
               >
                 <option value="">All Priority</option>
                 <option value="low">Low</option>
                 <option value="medium">Medium</option>
                 <option value="high">High</option>
               </select>
               
               <!-- Search -->
               <div class="relative">
                 <input 
                   v-model="searchQuery" 
                   placeholder="Search URLs..."
                   class="px-3 py-2 border border-gray-300 rounded-lg text-sm pl-8 w-48 focus:ring-2 focus:ring-blue-500"
                 >
                 <Search class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
               </div>
             </div>
           </div>
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
               <tr v-for="job in filteredJobs" :key="job.jobId" class="hover:bg-gray-50">
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
                     class="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                     @click="viewContent(job.jobId)"
                   >
                     <Eye class="w-4 h-4" />
                     View Content
                   </button>
                   <span v-else class="text-gray-400">-</span>
                 </td>
               </tr>
               <tr v-if="filteredJobs.length === 0">
                 <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                   <div class="flex flex-col items-center">
                     <Database class="w-12 h-12 text-gray-300 mb-2" />
                     <div class="text-lg font-medium mb-1">No jobs found</div>
                     <div class="text-sm">
                       {{ jobs.length === 0 ? 'Submit a URL above to get started!' : 'Try adjusting your filters.' }}
                     </div>
                   </div>
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
import { 
  Globe, RefreshCw, Database, Eye, Clock, Search, Upload,
  CheckCircle, AlertCircle, Loader2, Link, FileText, Send, Activity
} from 'lucide-vue-next'

const { refreshJobs } = useScraperStore()
const { showAlert } = useAlert()
// endpoint url = https://scraper-queue.onrender.com/api/

const urlInput = ref('')
const bulkUrls = ref('')
const priority = ref('medium')
const isSubmitting = ref(false)
const jobs = ref([])
const wsConnected = ref(false)
const isRefreshing = ref(false)
const submissionMode = ref('single')

// File upload states
const selectedFile = ref(null)
const filePreview = ref([])

// Filter states
const statusFilter = ref('')
const priorityFilter = ref('')
const searchQuery = ref('')

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

// Filtered jobs based on search and filter criteria
const filteredJobs = computed(() => {
  let filtered = [...jobs.value]
  
  // Apply status filter
  if (statusFilter.value) {
    filtered = filtered.filter(job => job.status === statusFilter.value)
  }
  
  // Apply priority filter
  if (priorityFilter.value) {
    filtered = filtered.filter(job => job.priority === priorityFilter.value)
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(job => 
      job.url.toLowerCase().includes(query) ||
      (job.title && job.title.toLowerCase().includes(query))
    )
  }
  
  return filtered
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
  isSubmitting.value = true
  
  try {
    const { api } = useApi()
    
    if (submissionMode.value === 'single') {
      if (!urlInput.value.trim()) return
      
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
      
    } else if (submissionMode.value === 'bulk') {
      if (!bulkUrls.value.trim()) return
      
      const urls = bulkUrls.value.split('\n').filter(url => url.trim())
      let successCount = 0
      
      for (const url of urls) {
        try {
          const result = await api.post('/api/urls', {
            url: url.trim(),
            priority: priority.value
          })
          
          const newJob = {
            jobId: result.jobId,
            url: url.trim(),
            status: result.status,
            priority: priority.value,
            createdAt: new Date().toISOString(),
            title: null,
            completedAt: null
          }
          
          jobs.value.unshift(newJob)
          subscribeToJob(result.jobId)
          successCount++
        } catch (error) {
          console.error(`Failed to submit ${url}:`, error)
        }
      }
      
      bulkUrls.value = ''
      showAlert(`${successCount} of ${urls.length} URLs submitted successfully`, 'success')
    }
    
  } catch (error) {
    console.error('Error submitting URL(s):', error)
    showAlert('Failed to submit URL(s). Please try again.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// File upload methods
function handleFileProcessed(data) {
  selectedFile.value = data.file
  filePreview.value = data.urls
}

function handleFileRemoved() {
  selectedFile.value = null
  filePreview.value = []
}

async function submitFile() {
  if (!selectedFile.value || !filePreview.value.length) return
  
  isSubmitting.value = true
  
  try {
    const { api } = useApi()
    let successCount = 0
    
    for (const url of filePreview.value) {
      try {
        const result = await api.post('/api/urls', {
          url: url.trim(),
          priority: priority.value
        })
        
        const newJob = {
          jobId: result.jobId,
          url: url.trim(),
          status: result.status,
          priority: priority.value,
          createdAt: new Date().toISOString(),
          title: null,
          completedAt: null
        }
        
        jobs.value.unshift(newJob)
        subscribeToJob(result.jobId)
        successCount++
      } catch (error) {
        console.error(`Failed to submit ${url}:`, error)
      }
    }
    
    handleFileRemoved()
    showAlert(`${successCount} of ${filePreview.value.length} URLs from file submitted successfully`, 'success')
    
  } catch (error) {
    console.error('Error submitting file:', error)
    showAlert('Failed to submit URLs from file. Please try again.', 'error')
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

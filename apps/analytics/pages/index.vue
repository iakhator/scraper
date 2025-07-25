<template>
  <div class="p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Web Scraper Dashboard</h1>
        <p class="text-gray-600">Submit URLs for scraping and monitor their status in real-time</p>
      </div>

      <!-- Connection Status -->
      <div class="mb-6 p-4 rounded-lg" :class="connectionStatusClass">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full mr-3" :class="connectionDotClass" />
          <span class="font-medium">{{ connectionStatus }}</span>
        </div>
      </div>

      <!-- URL Submission Form -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Submit URL for Scraping</h2>
        <form class="space-y-4" @submit.prevent="submitUrl">
          <div>
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
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit URL' }}
          </button>
        </form>
      </div>

      <!-- Jobs Table -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

// endpoint url = https://scraper-queue.onrender.com/api/

const urlInput = ref('')
const priority = ref('medium')
const isSubmitting = ref(false)
const jobs = ref([])
const wsConnected = ref(false)
let ws = null

// WebSocket connection management
const connectionStatus = computed(() => {
  return wsConnected.value ? 'Connected to real-time updates' : 'Disconnected - Updates may be delayed'
})

const connectionStatusClass = computed(() => {
  return wsConnected.value ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
})

const connectionDotClass = computed(() => {
  return wsConnected.value ? 'bg-green-500' : 'bg-red-500'
})

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
</script>

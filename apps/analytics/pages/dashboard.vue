<template>
  <div class="bg-gray-50 text-gray-900 leading-6 font-sans">
    <!-- Header -->
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
                :class="connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'"
              />
              <span class="text-sm text-gray-600">{{ connectionStatus.text }}</span>
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

    <!-- Main Content -->
    <main class="py-8">
      <div class="max-w-6xl mx-auto px-6">
        <!-- Stats Grid -->
        <div class="card mb-8">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ stats.queued }}</div>
              <div class="stat-label">In Queue</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.processing }}</div>
              <div class="stat-label">Processing</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.failed }}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Submit Form -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Submit URLs</h2>
              </div>
              <div class="card-body">
                <!-- Alert Container -->
                <div v-if="alert.show" class="alert" :class="`alert-${alert.type}`">
                  <span>{{ alert.type === 'success' ? '✓' : '✗' }}</span>
                  <span>{{ alert.message }}</span>
                </div>

                <!-- Mode Toggle -->
                <div class="form-group">
                  <div class="btn-group mb-5">
                    <button 
                      type="button"
                      class="btn"
                      :class="{ 'active': currentMode === 'single' }"
                      @click="setMode('single')"
                    >
                      Single
                    </button>
                    <button 
                      type="button"
                      class="btn"
                      :class="{ 'active': currentMode === 'bulk' }"
                      @click="setMode('bulk')"
                    >
                      Bulk
                    </button>
                  </div>
                </div>

                <form class="space-y-4" @submit.prevent="handleFormSubmit">
                  <div>
                    <label class="form-label">Priority</label>
                    <select v-model="priority" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <!-- Single Mode -->
                  <div v-if="currentMode === 'single'">
                    <div>
                      <label class="form-label">URL</label>
                      <input 
                        v-model="singleUrl"
                        type="url" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="https://example.com" 
                        required
                      >
                    </div>
                  </div>

                  <!-- Bulk Mode -->
                  <template v-else>
                    <div>
                      <label class="form-label">URLs (one per line)</label>
                      <textarea 
                        v-model="bulkUrls"
                        class="w-full min-h-[100px] px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="https://example1.com&#10;https://example2.com"
                      />
                    </div>
                  </template>
                  <button 
                      type="submit" 
                      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="isSubmitting"
                    >
                      {{ isSubmitting ? 'Processing...' :  currentMode === 'single' ? 'Submit URL' : 'Submit URLs' }}
                    </button>
                </form>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="space-y-6">
            <!-- Jobs List -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Recent Jobs</h2>
              </div>
              <div class="card-body no-padding">
                <div class="job-list">
                  <template v-if="jobs.length === 0">
                    <div class="empty-state">
                      <div class="empty-icon">📄</div>
                      <p>No jobs yet. Submit some URLs to get started.</p>
                    </div>
                  </template>
                  <template v-else>
                    <div 
                      v-for="job in jobs" 
                      :key="job.id"
                      class="job-item"
                      @click="showJobDetails(job.id)"
                    >
                      <div class="job-header">
                        <div class="flex gap-2">
                          <span class="badge" :class="`badge-${job.status}`">{{ job.status }}</span>
                          <span class="badge" :class="`badge-${job.priority}`">{{ job.priority }}</span>
                        </div>
                      </div>
                      <div class="job-url">{{ job.url }}</div>
                      <div class="job-meta">
                        {{ job.id.slice(0, 8) }}... • {{ formatDate(job.createdAt) }}
                        <span v-if="job.retryCount > 0"> • {{ job.retryCount }} retries</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Job Details Modal -->
    <JobModal 
      v-if="selectedJob"
      :job="selectedJob"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
// Import the composables and components
const { jobs, stats, connectionStatus, addJob, refreshJobs } = useScraperStore()
const { showAlert, alert } = useAlert()

// Page meta
definePageMeta({
  title: 'Scraper Dashboard'
})

// Reactive state
const currentMode = ref('single')
const priority = ref('medium')
const singleUrl = ref('')
const bulkUrls = ref('')
const isSubmitting = ref(false)
const isRefreshing = ref(false)
const selectedJob = ref(null)

// Methods
const setMode = (mode) => {
  currentMode.value = mode
}

const handleFormSubmit = async () => {
  isSubmitting.value = true
  
  try {
    if (currentMode.value === 'single') {
      if (!singleUrl.value.trim()) {
        throw new Error('Please enter a URL')
      }
      
      await addJob({
        url: singleUrl.value,
        priority: priority.value
      })
      
      singleUrl.value = ''
    } else {
      const urls = bulkUrls.value
        .split('\n')
        .filter(url => url.trim())
        .map(url => url.trim())
      
      if (urls.length === 0) {
        throw new Error('Please enter at least one URL')
      }
      
      for (const url of urls) {
        await addJob({
          url,
          priority: priority.value
        })
      }
      
      bulkUrls.value = ''
    }

    showAlert('URLs submitted successfully', 'success')
  } catch (error) {
    showAlert(error.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

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

const showJobDetails = (jobId) => {
  const job = jobs.value.find(j => j.id === jobId)
  if (job) {
    selectedJob.value = job
  }
}

const closeModal = () => {
  selectedJob.value = null
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

// Initialize data on mount
onMounted(() => {
  refreshJobs()
})
</script>

<style scoped>
:root {
  --primary: #2563eb;
  --primary-light: #3b82f6;
  --secondary: #64748b;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;
}

.card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--gray-100);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
}

.card-body {
  padding: 24px;
}

.card-body.no-padding {
  padding: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--gray-200);
  border-radius: 12px;
  overflow: hidden;
}

.stat-item {
  background: white;
  padding: 24px 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-200);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-group {
  display: flex;
  background: var(--gray-100);
  border-radius: 8px;
  padding: 2px;
}

.btn-group .btn {
  background: transparent;
  border-radius: 6px;
  flex: 1;
  margin: 0;
}

.btn-group .btn.active {
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.job-list {
  max-height: 600px;
  overflow-y: auto;
}

.job-item {
  padding: 16px 24px;
  border-bottom: 1px solid var(--gray-100);
  cursor: pointer;
  transition: background 0.2s ease;
}

.job-item:hover {
  background: var(--gray-50);
}

.job-item:last-child {
  border-bottom: none;
}

.job-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.job-url {
  font-size: 14px;
  color: var(--gray-900);
  font-weight: 500;
  margin-bottom: 4px;
  word-break: break-all;
}

.job-meta {
  font-size: 12px;
  color: var(--gray-500);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-queued {
  background: #fef3c7;
  color: #92400e;
}

.badge-processing {
  background: #dbeafe;
  color: #1e40af;
}

.badge-completed {
  background: #d1fae5;
  color: #065f46;
}

.badge-failed {
  background: #fee2e2;
  color: #991b1b;
}

.badge-high {
  background: #fee2e2;
  color: #991b1b;
}

.badge-medium {
  background: #fef3c7;
  color: #92400e;
}

.badge-low {
  background: #d1fae5;
  color: #065f46;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--gray-500);
}

.empty-icon {
  width: 48px;
  height: 48px;
  background: var(--gray-100);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 20px;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Custom scrollbar for job list */
.job-list::-webkit-scrollbar {
  width: 6px;
}

.job-list::-webkit-scrollbar-track {
  background: var(--gray-100);
}

.job-list::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 3px;
}

.job-list::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

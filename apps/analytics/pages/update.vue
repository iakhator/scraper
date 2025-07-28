<template>
  <div class="bg-gray-50 text-gray-900 leading-6 font-sans min-h-screen">
    <!-- Enhanced Header with Quick Actions -->
    <header class="bg-white border-b border-gray-200 py-4 sticky top-0 z-50 shadow-sm">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <Globe class="w-6 h-6" />
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">Scraper Analytics</div>
              <div class="text-xs text-gray-500">Advanced Dashboard</div>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Performance Indicator -->
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <div class="w-2 h-2 rounded-full" :class="performanceIndicator.class" />
              <span class="text-sm font-medium">{{ performanceIndicator.text }}</span>
            </div>
            
            <!-- Connection Status -->
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg" :class="connectionStatusClass">
              <div class="w-2 h-2 rounded-full" :class="connectionDotClass" />
              <span class="text-sm font-medium">{{ wsConnected ? 'Live' : 'Offline' }}</span>
            </div>
            
            <!-- Quick Actions -->
            <div class="flex gap-2">
              <button 
                class="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Export Data"
                @click="exportData"
              >
                <Download class="w-4 h-4" />
                Export
              </button>
              <button 
                :disabled="isRefreshing"
                class="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Data"
                @click="refreshData"
              >
                <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
                {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Enhanced Header with Time Range -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p class="text-gray-600">Monitor and manage your web scraping operations</p>
          </div>
          
          <!-- Time Range Selector -->
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-gray-500" />
            <label class="text-sm font-medium text-gray-700">Time Range:</label>
            <select 
              v-model="selectedTimeRange" 
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              @change="filterJobsByTimeRange"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

      <!-- Enhanced Stats Grid with Trends -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
        <div 
          v-for="stat in enhancedStats" 
          :key="stat.key"
          class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="stat.bgColor">
              <span class="w-3 h-3 rounded-full block" :class="stat.textColor.replace('text-', 'bg-')" />
            </div>
            <div class="flex items-center gap-1 text-xs" :class="stat.trend.class">
              <span>{{ stat.trend.direction }}</span>
              <span>{{ stat.trend.value }}%</span>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-900 mb-1">{{ stat.count }}</div>
          <div class="text-sm font-medium text-gray-500 uppercase tracking-wide">{{ stat.label }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ stat.subtitle }}</div>
        </div>
      </div>

      <!-- Performance Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Success Rate Chart -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-green-600" />
            Success Rate Trend
            <span class="text-sm font-normal text-gray-500">(Last 7 days)</span>
          </h3>
          <div class="h-32 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">{{ successRate }}%</div>
              <div class="text-sm text-gray-600">Overall Success Rate</div>
            </div>
          </div>
        </div>

        <!-- Average Processing Time -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer class="w-5 h-5 text-blue-600" />
            Processing Performance
            <span class="text-sm font-normal text-gray-500">(Average times)</span>
          </h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Queue Time:</span>
              <span class="font-semibold">{{ averageQueueTime }}s</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Processing Time:</span>
              <span class="font-semibold">{{ averageProcessingTime }}s</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Total Time:</span>
              <span class="font-semibold text-blue-600">{{ averageTotalTime }}s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced URL Submission with Templates -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <Link class="w-5 h-5 text-blue-600" />
            Submit URLs for Scraping
          </h2>
          <button 
            class="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            @click="showTemplates = !showTemplates"
          >
            <FileText class="w-4 h-4" />
            {{ showTemplates ? 'Hide' : 'Show' }} Templates
          </button>
        </div>
        
        <!-- URL Templates -->
        <div v-if="showTemplates" class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-sm font-semibold mb-3">Quick Templates:</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button 
              v-for="template in urlTemplates" 
              :key="template.name"
              class="p-3 bg-white border border-gray-200 rounded-lg text-left hover:border-blue-300 transition-colors"
              @click="applyTemplate(template)"
            >
              <div class="font-medium text-sm">{{ template.name }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ template.description }}</div>
            </button>
          </div>
        </div>
        
        <!-- Enhanced Tab Selection -->
        <div class="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button 
            v-for="mode in submissionModes"
            :key="mode.value"
            type="button"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2',
              submissionMode === mode.value 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            ]"
            @click="submissionMode = mode.value"
          >
            <component :is="mode.icon" class="w-4 h-4" />
            {{ mode.label }}
          </button>
        </div>

        <!-- Enhanced Form -->
        <form class="space-y-6" @submit.prevent="submitUrl">
          <!-- Single URL Input -->
          <div v-if="submissionMode === 'single'" class="space-y-4">
            <div>
              <label for="url" class="block text-sm font-medium text-gray-700 mb-2">
                URL to scrape
              </label>
              <div class="relative">
                <input
                  id="url"
                  v-model="urlInput"
                  type="url"
                  required
                  placeholder="https://example.com"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                >
                <button 
                  type="button" 
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500"
                  title="Validate URL"
                  @click="validateUrl"
                >
                  <CheckCircle class="w-5 h-5" />
                </button>
              </div>
              <div v-if="urlValidation.message" class="mt-2 text-sm" :class="urlValidation.isValid ? 'text-green-600' : 'text-red-600'">
                {{ urlValidation.message }}
              </div>
            </div>
          </div>
          
          <!-- Bulk URLs Input -->
          <div v-if="submissionMode === 'bulk'" class="space-y-4">
            <div>
              <label for="bulk-urls" class="block text-sm font-medium text-gray-700 mb-2">
                URLs to scrape (one per line)
              </label>
              <textarea
                id="bulk-urls"
                v-model="bulkUrls"
                rows="6"
                required
                placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @input="validateBulkUrls"
              />
              <div class="mt-2 flex justify-between text-sm text-gray-500">
                <span>{{ bulkUrlsCount }} URLs detected</span>
                <span v-if="bulkValidUrls !== bulkUrlsCount" class="text-orange-600">
                  {{ bulkValidUrls }} valid, {{ bulkUrlsCount - bulkValidUrls }} invalid
                </span>
              </div>
            </div>
          </div>

          <!-- File Upload -->
          <div v-if="submissionMode === 'file'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Upload URL file (CSV, TXT)
            </label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input 
                ref="fileInput" 
                type="file" 
                accept=".csv,.txt"
                class="hidden"
                @change="handleFileUpload"
              >
              <button type="button" class="flex items-center gap-2 text-blue-600 hover:text-blue-800 mx-auto" @click="$refs.fileInput.click()">
                <Upload class="w-5 h-5" />
                Choose File or drag and drop
              </button>
              <p class="text-sm text-gray-500 mt-2">Supports CSV and TXT files</p>
            </div>
          </div>

          <!-- Enhanced Priority and Settings -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                v-model="priority"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
            
            <div>
              <label for="retry-count" class="block text-sm font-medium text-gray-700 mb-2">
                Max Retries
              </label>
              <select
                id="retry-count"
                v-model="maxRetries"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">No Retries</option>
                <option value="1">1 Retry</option>
                <option value="3">3 Retries</option>
                <option value="5">5 Retries</option>
              </select>
            </div>
            
            <div>
              <label for="timeout" class="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds)
              </label>
              <input
                id="timeout"
                v-model="timeout"
                type="number"
                min="5"
                max="300"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>

          <!-- Advanced Options -->
          <div class="border-t pt-4">              <button 
                type="button"
                class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                @click="showAdvancedOptions = !showAdvancedOptions"
              >
                <ChevronRight class="w-4 h-4 transition-transform" :class="{ 'rotate-90': showAdvancedOptions }" />
                Advanced Options
              </button>
            
            <div v-if="showAdvancedOptions" class="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex items-center gap-2">
                  <input v-model="extractImages" type="checkbox" class="rounded">
                  <span class="text-sm">Extract Images</span>
                </label>
                <label class="flex items-center gap-2">
                  <input v-model="extractLinks" type="checkbox" class="rounded">
                  <span class="text-sm">Extract Links</span>
                </label>
                <label class="flex items-center gap-2">
                  <input v-model="followRedirects" type="checkbox" class="rounded">
                  <span class="text-sm">Follow Redirects</span>
                </label>
                <label class="flex items-center gap-2">
                  <input v-model="respectRobots" type="checkbox" class="rounded">
                  <span class="text-sm">Respect robots.txt</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Submit Button -->            <button
              type="submit"
              :disabled="isSubmitting || !canSubmit"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
                <Loader2 class="w-5 h-5 animate-spin" />
                Submitting...
              </span>
              <span v-else class="flex items-center gap-2">
                <Send class="w-5 h-5" />
                {{ getSubmitButtonText() }}
              </span>
            </button>
        </form>
      </div>

      <!-- Enhanced Jobs Table with Filters -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold flex items-center gap-2">
                <Database class="w-5 h-5 text-blue-600" />
                Scraping Jobs
              </h2>
              <p class="text-sm text-gray-600 mt-1">{{ filteredJobs.length }} of {{ jobs.length }} jobs</p>
            </div>
            
            <!-- Enhanced Filters -->
            <div class="flex items-center gap-3">
              <!-- Status Filter -->
              <select 
                v-model="statusFilter" 
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                @change="applyFilters"
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
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                @change="applyFilters"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <!-- Search -->
              <div class="relative">
                <input 
                  v-model="searchQuery" 
                  placeholder="Search URLs..."
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm pl-8 w-48"
                  @input="applyFilters"
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" @click="sortBy('url')">
                  URL
                  <span v-if="sortField === 'url'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" @click="sortBy('status')">
                  Status
                  <span v-if="sortField === 'status'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" @click="sortBy('priority')">
                  Priority
                  <span v-if="sortField === 'priority'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" @click="sortBy('createdAt')">
                  Created
                  <span v-if="sortField === 'createdAt'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
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
              <tr 
                v-for="job in paginatedJobs" 
                :key="job.jobId" 
                class="hover:bg-gray-50 transition-colors"
                :class="{ 'bg-blue-50': selectedJobs.includes(job.jobId) }"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <input 
                      v-model="selectedJobs" 
                      type="checkbox" 
                      :value="job.jobId"
                      class="rounded"
                    >
                    <div class="text-sm text-gray-900 max-w-xs truncate" :title="job.url">
                      {{ job.url }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full" :class="getStatusClass(job.status)">
                    {{ job.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 text-xs rounded-full" :class="getPriorityClass(job.priority)">
                    {{ job.priority }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{{ formatTime(job.createdAt) }}</div>
                  <div class="text-xs text-gray-400">{{ getRelativeTime(job.createdAt) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ getJobDuration(job) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900 max-w-xs truncate" :title="job.title || 'N/A'">
                    {{ job.title || 'N/A' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center gap-2">
                    <button
                      v-if="job.status === 'completed'"
                      class="flex items-center gap-1 text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                      @click="viewContent(job.jobId)"
                    >
                      <Eye class="w-4 h-4" />
                      View
                    </button>
                    <button
                      v-if="job.status === 'failed'"
                      class="flex items-center gap-1 text-orange-600 hover:text-orange-900 px-2 py-1 rounded hover:bg-orange-50"
                      @click="retryJob(job.jobId)"
                    >
                      <RotateCcw class="w-4 h-4" />
                      Retry
                    </button>
                    <button
                      class="flex items-center gap-1 text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                      @click="deleteJob(job.jobId)"
                    >
                      <Trash2 class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredJobs.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                  <div class="flex flex-col items-center">
                    <Database class="w-16 h-16 text-gray-300 mb-4" />
                    <div class="text-lg font-medium mb-2">No jobs found</div>
                    <div class="text-sm">{{ jobs.length === 0 ? 'Submit a URL above to get started!' : 'Try adjusting your filters.' }}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Enhanced Pagination -->
        <div v-if="filteredJobs.length > itemsPerPage" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredJobs.length) }} of {{ filteredJobs.length }} results
            </div>
            <div class="flex items-center gap-2">
              <button 
                :disabled="currentPage === 1"
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="currentPage = Math.max(1, currentPage - 1)"
              >
                Previous
              </button>
              <span class="px-3 py-2 text-sm">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button 
                :disabled="currentPage === totalPages"
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="currentPage = Math.min(totalPages, currentPage + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div v-if="selectedJobs.length > 0" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-xl shadow-lg px-6 py-4 flex items-center gap-4">
        <span class="text-sm font-medium">{{ selectedJobs.length }} selected</span>
        <div class="flex gap-2">
          <button class="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" @click="bulkRetry">
            <RotateCcw class="w-4 h-4" />
            Retry All
          </button>
          <button class="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200" @click="bulkDelete">
            <Trash2 class="w-4 h-4" />
            Delete All
          </button>
          <button class="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" @click="selectedJobs = []">
            <X class="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="notifications.length > 0" class="fixed top-20 right-6 space-y-2 z-50">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
        :class="{
          'border-green-500': notification.type === 'success',
          'border-red-500': notification.type === 'error',
          'border-blue-500': notification.type === 'info'
        }"
      >
        <div class="flex items-center gap-3">
          <span>
            <CheckCircle v-if="notification.type === 'success'" class="w-5 h-5 text-green-600" />
            <AlertCircle v-else-if="notification.type === 'error'" class="w-5 h-5 text-red-600" />
            <Info v-else class="w-5 h-5 text-blue-600" />
          </span>
          <div class="flex-1">
            <div class="font-medium">{{ notification.title }}</div>
            <div class="text-sm text-gray-600">{{ notification.message }}</div>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="removeNotification(notification.id)">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  Globe, Download, RefreshCw, Clock, TrendingUp, Timer, Link, FileText, 
  CheckCircle, Upload, ChevronRight, Send, Loader2, Database, Search, 
  Eye, RotateCcw, Trash2, X, AlertCircle, Info 
} from 'lucide-vue-next'

// Enhanced reactive state
const { refreshJobs } = useScraperStore()
const { showAlert: _showAlert } = useAlert()

// Core state
const urlInput = ref('')
const bulkUrls = ref('')
const priority = ref('medium')
const maxRetries = ref('3')
const timeout = ref('30')
const isSubmitting = ref(false)
const jobs = ref([])
const wsConnected = ref(false)
const isRefreshing = ref(false)
const submissionMode = ref('single')

// Enhanced UI state
const selectedTimeRange = ref('24h')
const showTemplates = ref(false)
const showAdvancedOptions = ref(false)
const extractImages = ref(false)
const extractLinks = ref(true)
const followRedirects = ref(true)
const respectRobots = ref(true)

// Table and filtering state
const statusFilter = ref('')
const priorityFilter = ref('')
const searchQuery = ref('')
const sortField = ref('createdAt')
const sortDirection = ref('desc')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const selectedJobs = ref([])
const filteredJobs = ref([])

// Validation state
const urlValidation = ref({ isValid: null, message: '' })
const bulkUrlsCount = ref(0)
const bulkValidUrls = ref(0)

// Notifications
const notifications = ref([])
let notificationId = 0

// WebSocket
let ws = null

// Submission modes
const submissionModes = [
  { value: 'single', label: 'Single URL', icon: Link },
  { value: 'bulk', label: 'Bulk URLs', icon: FileText },
  { value: 'file', label: 'File Upload', icon: Upload }
]

// URL Templates
const urlTemplates = [
  {
    name: 'E-commerce Product',
    description: 'Common e-commerce product page patterns',
    urls: ['https://example-store.com/product/123', 'https://shop.example.com/item/abc']
  },
  {
    name: 'News Articles',
    description: 'News and blog article patterns',
    urls: ['https://news.example.com/article/title', 'https://blog.example.com/post/slug']
  },
  {
    name: 'Social Media',
    description: 'Social media profile and post patterns',
    urls: ['https://twitter.com/username', 'https://linkedin.com/in/profile']
  }
]

// Computed properties
const connectionStatusClass = computed(() => {
  return wsConnected.value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
})

const connectionDotClass = computed(() => {
  return wsConnected.value ? 'bg-green-500' : 'bg-red-500'
})

const performanceIndicator = computed(() => {
  const completedJobs = jobs.value.filter(job => job.status === 'completed').length
  const totalJobs = jobs.value.length
  const rate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
  
  if (rate >= 90) return { class: 'bg-green-500', text: 'Excellent' }
  if (rate >= 70) return { class: 'bg-yellow-500', text: 'Good' }
  if (rate >= 50) return { class: 'bg-orange-500', text: 'Fair' }
  return { class: 'bg-red-500', text: 'Poor' }
})

const enhancedStats = computed(() => {
  const stats = {
    queued: jobs.value.filter(job => job.status === 'queued').length,
    processing: jobs.value.filter(job => job.status === 'processing').length,
    completed: jobs.value.filter(job => job.status === 'completed').length,
    failed: jobs.value.filter(job => job.status === 'failed').length,
    retrying: jobs.value.filter(job => job.status === 'retrying').length,
    total: jobs.value.length
  }
  
  return [
    {
      key: 'queued',
      count: stats.queued,
      label: 'In Queue',
      subtitle: 'Awaiting processing',
      trend: { direction: '↗', value: 12, class: 'text-blue-600' },
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      key: 'processing',
      count: stats.processing,
      label: 'Processing',
      subtitle: 'Currently active',
      trend: { direction: '↗', value: 8, class: 'text-blue-600' },
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      key: 'completed',
      count: stats.completed,
      label: 'Completed',
      subtitle: 'Successfully finished',
      trend: { direction: '↗', value: 15, class: 'text-green-600' },
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      key: 'failed',
      count: stats.failed,
      label: 'Failed',
      subtitle: 'Requires attention',
      trend: { direction: '↘', value: 5, class: 'text-red-600' },
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      key: 'retrying',
      count: stats.retrying,
      label: 'Retrying',
      subtitle: 'Auto retry active',
      trend: { direction: '→', value: 0, class: 'text-gray-600' },
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      key: 'total',
      count: stats.total,
      label: 'Total Jobs',
      subtitle: 'All time',
      trend: { direction: '↗', value: 23, class: 'text-purple-600' },
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ]
})

const successRate = computed(() => {
  const completed = jobs.value.filter(job => job.status === 'completed').length
  const total = jobs.value.filter(job => ['completed', 'failed'].includes(job.status)).length
  return total > 0 ? Math.round((completed / total) * 100) : 0
})

const averageQueueTime = computed(() => {
  // Mock calculation - replace with real data
  return Math.round(Math.random() * 10 + 5)
})

const averageProcessingTime = computed(() => {
  // Mock calculation - replace with real data
  return Math.round(Math.random() * 30 + 15)
})

const averageTotalTime = computed(() => {
  return averageQueueTime.value + averageProcessingTime.value
})

const canSubmit = computed(() => {
  if (submissionMode.value === 'single') {
    return urlInput.value.trim() && urlValidation.value.isValid !== false
  } else if (submissionMode.value === 'bulk') {
    return bulkUrls.value.trim() && bulkValidUrls.value > 0
  }
  return false
})

const totalPages = computed(() => {
  return Math.ceil(filteredJobs.value.length / itemsPerPage.value)
})

const paginatedJobs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredJobs.value.slice(start, end)
})

// Methods
function addNotification(type, title, message) {
  const id = ++notificationId
  notifications.value.push({ id, type, title, message })
  setTimeout(() => removeNotification(id), 5000)
}

function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) notifications.value.splice(index, 1)
}

function validateUrl() {
  const url = urlInput.value.trim()
  if (!url) {
    urlValidation.value = { isValid: null, message: '' }
    return
  }
  
  try {
    new URL(url)
    urlValidation.value = { isValid: true, message: 'Valid URL' }
  } catch {
    urlValidation.value = { isValid: false, message: 'Invalid URL format' }
  }
}

function validateBulkUrls() {
  const urls = bulkUrls.value.split('\n').filter(url => url.trim())
  bulkUrlsCount.value = urls.length
  
  let validCount = 0
  urls.forEach(url => {
    try {
      new URL(url.trim())
      validCount++
    } catch {
      // Invalid URL - skip counting
    }
  })
  
  bulkValidUrls.value = validCount
}

function applyTemplate(template) {
  if (submissionMode.value === 'single') {
    urlInput.value = template.urls[0]
    validateUrl()
  } else if (submissionMode.value === 'bulk') {
    bulkUrls.value = template.urls.join('\n')
    validateBulkUrls()
  }
  showTemplates.value = false
  addNotification('info', 'Template Applied', `Applied ${template.name} template`)
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    const urls = content.split('\n').filter(line => line.trim())
    bulkUrls.value = urls.join('\n')
    validateBulkUrls()
    addNotification('success', 'File Uploaded', `Loaded ${urls.length} URLs from file`)
  }
  reader.readAsText(file)
}

function getSubmitButtonText() {
  if (submissionMode.value === 'single') return 'Submit URL'
  if (submissionMode.value === 'bulk') return `Submit ${bulkUrlsCount.value} URLs`
  if (submissionMode.value === 'file') return 'Submit File URLs'
  return 'Submit'
}

async function submitUrl() {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const { api } = useApi()
    
    if (submissionMode.value === 'single') {
      const result = await api.post('/api/urls', {
        url: urlInput.value.trim(),
        priority: priority.value,
        maxRetries: parseInt(maxRetries.value),
        timeout: parseInt(timeout.value),
        options: {
          extractImages: extractImages.value,
          extractLinks: extractLinks.value,
          followRedirects: followRedirects.value,
          respectRobots: respectRobots.value
        }
      })
      
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
      urlValidation.value = { isValid: null, message: '' }
      
      addNotification('success', 'Job Submitted', 'URL submitted successfully')
      
    } else if (submissionMode.value === 'bulk') {
      const urls = bulkUrls.value.split('\n').filter(url => url.trim())
      let successCount = 0
      
      for (const url of urls) {
        try {
          const result = await api.post('/api/urls', {
            url: url.trim(),
            priority: priority.value,
            maxRetries: parseInt(maxRetries.value),
            timeout: parseInt(timeout.value),
            options: {
              extractImages: extractImages.value,
              extractLinks: extractLinks.value,
              followRedirects: followRedirects.value,
              respectRobots: respectRobots.value
            }
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
      bulkUrlsCount.value = 0
      bulkValidUrls.value = 0
      
      addNotification('success', 'Bulk Submission', `${successCount} of ${urls.length} URLs submitted successfully`)
    }
    
    applyFilters()
    
  } catch (error) {
    console.error('Error submitting URL(s):', error)
    addNotification('error', 'Submission Failed', 'Failed to submit URL(s). Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

function applyFilters() {
  let filtered = [...jobs.value]
  
  // Apply time range filter
  if (selectedTimeRange.value !== 'all') {
    const now = new Date()
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    const cutoff = new Date(now.getTime() - timeRanges[selectedTimeRange.value])
    filtered = filtered.filter(job => new Date(job.createdAt) >= cutoff)
  }
  
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
  
  // Apply sorting
  filtered.sort((a, b) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]
    
    if (sortField.value === 'createdAt') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    }
    
    if (sortDirection.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
  
  filteredJobs.value = filtered
  currentPage.value = 1
}

function sortBy(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  applyFilters()
}

function filterJobsByTimeRange() {
  applyFilters()
}

function getStatusClass(status) {
  const classes = {
    'queued': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'processing': 'bg-blue-100 text-blue-800 border-blue-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'failed': 'bg-red-100 text-red-800 border-red-200',
    'retrying': 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return classes[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

function getPriorityClass(priority) {
  const classes = {
    'urgent': 'bg-red-100 text-red-700 border-red-200',
    'high': 'bg-orange-100 text-orange-700 border-orange-200',
    'medium': 'bg-blue-100 text-blue-700 border-blue-200',
    'low': 'bg-gray-100 text-gray-700 border-gray-200'
  }
  return classes[priority] || 'bg-gray-100 text-gray-700 border-gray-200'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

function getRelativeTime(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function getJobDuration(job) {
  if (job.status === 'queued') return 'Pending'
  if (job.status === 'processing') {
    const start = new Date(job.createdAt)
    const now = new Date()
    const duration = Math.floor((now - start) / 1000)
    return `${duration}s`
  }
  if (job.completedAt) {
    const start = new Date(job.createdAt)
    const end = new Date(job.completedAt)
    const duration = Math.floor((end - start) / 1000)
    return `${duration}s`
  }
  return 'N/A'
}

function viewContent(jobId) {
  addNotification('info', 'Content Viewer', `Opening content for job ${jobId}`)
  // Implement content viewing logic
}

function retryJob(jobId) {
  addNotification('info', 'Job Retry', `Retrying job ${jobId}`)
  // Implement retry logic
}

function deleteJob(jobId) {
  if (confirm('Are you sure you want to delete this job?')) {
    const index = jobs.value.findIndex(job => job.jobId === jobId)
    if (index > -1) {
      jobs.value.splice(index, 1)
      applyFilters()
      addNotification('success', 'Job Deleted', 'Job deleted successfully')
    }
  }
}

function bulkRetry() {
  addNotification('info', 'Bulk Retry', `Retrying ${selectedJobs.value.length} jobs`)
  selectedJobs.value = []
}

function bulkDelete() {
  if (confirm(`Are you sure you want to delete ${selectedJobs.value.length} jobs?`)) {
    jobs.value = jobs.value.filter(job => !selectedJobs.value.includes(job.jobId))
    selectedJobs.value = []
    applyFilters()
    addNotification('success', 'Bulk Delete', 'Selected jobs deleted successfully')
  }
}

function exportData() {
  const data = jobs.value.map(job => ({
    url: job.url,
    status: job.status,
    priority: job.priority,
    created: job.createdAt,
    title: job.title
  }))
  
  const csv = [
    ['URL', 'Status', 'Priority', 'Created', 'Title'],
    ...data.map(job => [job.url, job.status, job.priority, job.created, job.title || ''])
  ].map(row => row.join(',')).join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scraper-jobs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  addNotification('success', 'Export Complete', 'Data exported successfully')
}

async function refreshData() {
  isRefreshing.value = true
  try {
    await refreshJobs()
    await fetchExistingJobs()
    addNotification('success', 'Data Refreshed', 'All data updated successfully')
  } catch (err) {
    console.error('Refresh failed:', err)
    addNotification('error', 'Refresh Failed', 'Failed to refresh data')
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 1000)
  }
}

// WebSocket functions
function connectWebSocket() {
  try {
    const { createConnection } = useWebSocket()
    
    ws = createConnection(
      handleWebSocketMessage,
      () => { 
        wsConnected.value = true
        addNotification('success', 'Connected', 'Real-time updates enabled')
      },
      () => { 
        wsConnected.value = false
        addNotification('error', 'Disconnected', 'Real-time updates disabled')
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

function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'connected':
      console.log('WebSocket client ID:', message.clientId)
      break
      
    case 'job-update':
      updateJobStatus(message.jobId, message.status, message.data)
      addNotification('info', 'Job Updated', `Job ${message.jobId} status: ${message.status}`)
      break
      
    default:
      console.log('Unknown message type:', message)
  }
}

function subscribeToJob(jobId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'subscribe-job',
      jobId
    }))
  }
}

function updateJobStatus(jobId, status, data) {
  const job = jobs.value.find(j => j.jobId === jobId)
  if (job) {
    job.status = status
    job.lastUpdated = new Date().toISOString()
    
    if (data) {
      if (data.title) job.title = data.title
      if (data.completedAt) job.completedAt = data.completedAt
      if (data.error) job.error = data.error
    }
    
    applyFilters()
  }
}

async function fetchExistingJobs() {
  try {
    const { api } = useApi()
    const response = await api.get('/api/jobs')
    
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
    
    applyFilters()
    console.log(`Loaded ${existingJobs.length} existing jobs`)
    
  } catch (error) {
    console.error('Error fetching existing jobs:', error)
    addNotification('error', 'Load Failed', 'Failed to load existing jobs')
  }
}

// Lifecycle
onMounted(() => {
  connectWebSocket()
  fetchExistingJobs()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})

// Watch for URL input changes to validate
watch(urlInput, validateUrl)
watch(bulkUrls, validateBulkUrls)
</script>

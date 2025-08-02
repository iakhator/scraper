<template>
  <div 
    class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
    :class="{ 'border-blue-400 bg-blue-50': isDragOver }"
    @click="$refs.fileInput.click()"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <div class="space-y-2">
      <p class="text-sm font-medium text-gray-900">
        Click to upload or drag and drop CSV or TXT file
      </p>
      <p class="text-xs text-gray-500">
        Files should contain one URL per line. Max size: 10MB
      </p>
      <input 
        ref="fileInput"
        type="file" 
        accept=".csv,.txt"
        class="hidden"
        @change="handleFileSelect"
      >
    </div>
  </div>

  <!-- Selected File Display -->
  <div v-if="selectedFile" class="mt-4 bg-gray-50 border rounded-lg p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <FileText class="w-5 h-5 text-gray-400" />
        <div>
          <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
          <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
        </div>
      </div>
      <button 
        type="button"
        class="text-gray-400 hover:text-gray-600"
        @click="removeFile"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
    
    <!-- File Preview -->
    <div v-if="urls.length > 0" class="mt-3 pt-3 border-t border-gray-200">
      <p class="text-xs text-gray-500 mb-2">Preview (first 5 URLs):</p>
      <div class="bg-white rounded border p-2 text-xs font-mono">
        <div v-for="(url, index) in urls.slice(0, 5)" :key="index" class="text-gray-700">
          {{ url }}
        </div>
        <div v-if="urls.length > 5" class="text-gray-400 mt-1">
          ... and {{ urls.length - 5 }} more URLs
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        Total URLs found: {{ urls.length }}
      </p>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-3 pt-3 border-t border-gray-200">
      <div class="flex items-center space-x-2 text-red-600">
        <AlertCircle class="w-4 h-4" />
        <p class="text-xs">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Upload, FileText, X, AlertCircle } from 'lucide-vue-next'

const emit = defineEmits(['file-processed', 'file-removed'])

const selectedFile = ref(null)
const urls = ref([])
const error = ref('')
const isDragOver = ref(false)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    processFileInput(file)
  }
}

function handleDragOver(event) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event) {
  event.preventDefault()
  isDragOver.value = false
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    processFileInput(file)
  }
}

function processFileInput(file) {
  // Validate file type
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
    error.value = 'Please upload a CSV or TXT file'
    return
  }
  
  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File size must be less than 10MB'
    return
  }
  
  selectedFile.value = file
  error.value = ''
  processFile(file)
}

async function processFile(file) {
  try {
    const text = await file.text()
    let extractedUrls = []
    
    if (file.name.endsWith('.csv')) {
      // Parse CSV - assume first column contains URLs or it's a single column
      const lines = text.split('\n').filter(line => line.trim())
      extractedUrls = lines.map(line => {
        // Handle CSV format - take first column or treat as single value
        const firstValue = line.split(',')[0].trim()
        return firstValue.replace(/['"]/g, '') // Remove quotes
      }).filter(url => url && isValidUrl(url))
    } else {
      // Parse TXT - one URL per line
      extractedUrls = text.split('\n')
        .map(url => url.trim())
        .filter(url => url && isValidUrl(url))
    }
    
    if (extractedUrls.length === 0) {
      error.value = 'No valid URLs found in the file'
      return
    }
    
    urls.value = extractedUrls
    emit('file-processed', {
      file: selectedFile.value,
      urls: extractedUrls
    })
    
  } catch (err) {
    console.error('Error processing file:', err)
    error.value = 'Error processing file. Please check the format.'
    removeFile()
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function removeFile() {
  selectedFile.value = null
  urls.value = []
  error.value = ''
  
  // Reset file input
  if ($refs.fileInput) {
    $refs.fileInput.value = ''
  }
  
  emit('file-removed')
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

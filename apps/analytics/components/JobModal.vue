<template>
  <div class="modal" @click="handleOutsideClick">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Job Details</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div>
          <div class="detail-item">
            <strong>Job ID:</strong> {{ job.id }}
          </div>
          <div class="detail-item">
            <strong>URL:</strong> 
            <a 
              :href="job.url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="url-link"
            >
              {{ job.url }}
            </a>
          </div>
          <div class="detail-item">
            <strong>Status:</strong> 
            <span class="badge" :class="`badge-${job.status}`">{{ job.status }}</span>
          </div>
          <div class="detail-item">
            <strong>Priority:</strong> 
            <span class="badge" :class="`badge-${job.priority}`">{{ job.priority }}</span>
          </div>
          <div class="detail-item">
            <strong>Created:</strong> {{ formatDate(job.createdAt) }}
          </div>
          <div v-if="job.completedAt" class="detail-item">
            <strong>Completed:</strong> {{ formatDate(job.completedAt) }}
          </div>
          <div class="detail-item">
            <strong>Retries:</strong> {{ job.retryCount }} / {{ job.maxRetries }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  job: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const handleOutsideClick = (event) => {
  if (event.target.classList.contains('modal')) {
    emit('close')
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

// Handle escape key
onMounted(() => {
  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      emit('close')
    }
  }
  
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #64748b;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.detail-item {
  margin-bottom: 16px;
}

.url-link {
  color: #2563eb;
  text-decoration: none;
}

.url-link:hover {
  text-decoration: underline;
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
</style>

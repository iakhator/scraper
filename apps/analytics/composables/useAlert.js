export const useAlert = () => {
  const alert = ref({
    show: false,
    message: '',
    type: 'success'
  })

  let alertTimeout = null

  const showAlert = (message, type = 'success') => {
    // Clear existing timeout
    if (alertTimeout) {
      clearTimeout(alertTimeout)
    }

    alert.value = {
      show: true,
      message,
      type
    }

    // Auto-hide after 5 seconds
    alertTimeout = setTimeout(() => {
      hideAlert()
    }, 5000)
  }

  const hideAlert = () => {
    alert.value.show = false
    if (alertTimeout) {
      clearTimeout(alertTimeout)
      alertTimeout = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (alertTimeout) {
      clearTimeout(alertTimeout)
    }
  })

  return {
    alert: readonly(alert),
    showAlert,
    hideAlert
  }
}

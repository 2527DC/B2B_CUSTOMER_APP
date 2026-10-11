/**
 * Network error detection and user-friendly error formatting.
 */

export interface FormattedError {
  isOffline: boolean;
  title: string;
  message: string;
}

/**
 * Determines whether an error is caused by a lack of internet connectivity,
 * connection timeout, or DNS/network failure.
 */
export function isNetworkError(err: any): boolean {
  if (!err) return false;

  // Axios network error
  if (err.code === 'ERR_NETWORK') return true;
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true;
  if (err.code === 'ENOTFOUND') return true;

  // Request made but no response received (classic network drop / offline)
  if (err.request && !err.response) return true;

  // Error message inspection
  const msg = (err.message || '').toLowerCase();
  if (
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('connection timed out') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('internet')
  ) {
    return true;
  }

  return false;
}

/**
 * Returns user-friendly titles and guidance tailored to network vs server errors.
 */
export function getFriendlyErrorMessage(err: any, fallbackTitle?: string): FormattedError {
  if (isNetworkError(err)) {
    return {
      isOffline: true,
      title: 'No Internet Connection',
      message: 'Please check your Wi-Fi or cellular data connection and try again.',
    };
  }

  const status = err?.response?.status;
  if (status >= 500) {
    return {
      isOffline: false,
      title: 'Server Temporarily Unavailable',
      message: 'Our services are momentarily busy. Please try again in a few moments.',
    };
  }

  return {
    isOffline: false,
    title: fallbackTitle || 'Unable to Load Data',
    message: err?.response?.data?.message || err?.message || 'Something went wrong while fetching data. Please try again.',
  };
}

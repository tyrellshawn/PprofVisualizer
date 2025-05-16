import { ProfileType } from './types';

/**
 * Utility functions for handling pprof profiles
 */
export const profileUtils = {
  /**
   * Format bytes into a human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * Format a time value in seconds to a human readable string
   */
  formatTime(seconds: number): string {
    if (seconds < 0.001) {
      return (seconds * 1000000).toFixed(2) + ' μs';
    } else if (seconds < 1) {
      return (seconds * 1000).toFixed(2) + ' ms';
    } else if (seconds < 60) {
      return seconds.toFixed(2) + ' s';
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    }
  },
  
  /**
   * Get a human-readable name for a profile type
   */
  getProfileTypeName(type: ProfileType): string {
    const names: Record<ProfileType, string> = {
      'cpu': 'CPU',
      'heap': 'Memory',
      'block': 'Blocking',
      'mutex': 'Mutex',
      'goroutine': 'Goroutine',
      'threadcreate': 'Thread Creation'
    };
    
    return names[type] || type;
  },
  
  /**
   * Get a color for a profile type
   */
  getProfileTypeColor(type: ProfileType): string {
    const colors: Record<ProfileType, string> = {
      'cpu': '#3182CE', // blue
      'heap': '#38A169', // green
      'block': '#DD6B20', // orange
      'mutex': '#805AD5', // purple
      'goroutine': '#F56565', // red
      'threadcreate': '#718096' // gray
    };
    
    return colors[type] || '#4299E1';
  },
  
  /**
   * Format a timestamp into a relative time string
   */
  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    
    const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (secondsDiff < 60) {
      return 'just now';
    } else if (secondsDiff < 3600) {
      const minutes = Math.floor(secondsDiff / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (secondsDiff < 86400) {
      const hours = Math.floor(secondsDiff / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(secondsDiff / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  },
  
  /**
   * Generate a unique ID for a function from a profile
   */
  generateFunctionId(functionName: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < functionName.length; i++) {
      const char = functionName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `fn_${Math.abs(hash).toString(16)}`;
  }
};
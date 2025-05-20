import { apiRequest } from "@/lib/queryClient";

// Define profile types
export type ProfileType = 'cpu' | 'heap' | 'block' | 'mutex' | 'goroutine' | 'threadcreate';

// Function interfaces from pprof
export interface PprofFunction {
  flat: string; // flat time or memory
  flatPercent: string; // percentage of total flat time/memory
  cum: string; // cumulative time or memory
  cumPercent: string; // percentage of total cumulative time/memory
  functionName: string; // function name
}

// Metadata from a pprof profile
export interface ProfileMetadata {
  duration?: number;
  totalTime?: number;
  sampleCount?: number;
  period?: number;
  topFunctions?: PprofFunction[];
  error?: string;
}

// Profile interface matching the server schema
export interface Profile {
  id: number;
  filename: string;
  originalFilename: string;
  profileType: ProfileType;
  size: number;
  description?: string;
  metadata: ProfileMetadata;
  uploadedAt: string;
  isSaved: boolean;
  data: string; // base64 encoded profile data
}

// Connection to a pprof endpoint
export interface Connection {
  id: number;
  name: string;
  url: string;
  lastConnected: string | null;
  isActive: boolean;
}

// API functions for profiles
export const profileApi = {
  // Get all profiles
  async getProfiles(): Promise<Profile[]> {
    const res = await apiRequest("GET", "/api/profiles");
    return res.json();
  },

  // Get recent profiles
  async getRecentProfiles(limit: number = 10): Promise<Profile[]> {
    const res = await apiRequest("GET", `/api/profiles/recent?limit=${limit}`);
    return res.json();
  },

  // Get saved profiles
  async getSavedProfiles(): Promise<Profile[]> {
    const res = await apiRequest("GET", "/api/profiles/saved");
    return res.json();
  },

  // Get a single profile
  async getProfile(id: number): Promise<Profile> {
    const res = await apiRequest("GET", `/api/profiles/${id}`);
    return res.json();
  },

  // Upload a profile file
  async uploadProfile(file: File, description?: string, profileType: ProfileType = 'cpu', isSaved: boolean = false): Promise<Profile> {
    const formData = new FormData();
    formData.append("file", file);
    
    if (description) {
      formData.append("description", description);
    }
    
    formData.append("profileType", profileType);
    formData.append("isSaved", isSaved ? "true" : "false");
    
    const res = await fetch("/api/profiles/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to upload profile");
    }
    
    return res.json();
  },

  // Update a profile
  async updateProfile(id: number, data: { description?: string; isSaved?: boolean }): Promise<Profile> {
    const res = await apiRequest("PATCH", `/api/profiles/${id}`, data);
    return res.json();
  },

  // Delete a profile
  async deleteProfile(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/profiles/${id}`);
  },

  // Fetch profile from URL
  async fetchFromUrl(url: string, profileType: ProfileType = 'cpu'): Promise<Profile> {
    const res = await apiRequest("POST", "/api/fetch-profile", { url, profileType });
    return res.json();
  },

  // Get profile using CLI
  async fetchFromCli(command: string, args: string[] = [], profileType: ProfileType = 'cpu'): Promise<Profile> {
    const res = await apiRequest("POST", "/api/cli-profile", { command, args, profileType });
    return res.json();
  }
};

// API functions for connections
export const connectionApi = {
  // Get all connections
  async getConnections(): Promise<Connection[]> {
    const res = await apiRequest("GET", "/api/connections");
    return res.json();
  },

  // Get a single connection
  async getConnection(id: number): Promise<Connection> {
    const res = await apiRequest("GET", `/api/connections/${id}`);
    return res.json();
  },

  // Create a connection
  async createConnection(data: { name: string; url: string }): Promise<Connection> {
    const res = await apiRequest("POST", "/api/connections", data);
    return res.json();
  },

  // Update a connection
  async updateConnection(id: number, data: { name?: string; url?: string; isActive?: boolean }): Promise<Connection> {
    const res = await apiRequest("PATCH", `/api/connections/${id}`, data);
    return res.json();
  },

  // Delete a connection
  async deleteConnection(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/connections/${id}`);
  }
};

// Helper functions for processing profile data
export const profileUtils = {
  // Format bytes to human readable format
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Format time in seconds to human readable format
  formatTime(seconds: number): string {
    if (seconds < 0.001) {
      return `${(seconds * 1000000).toFixed(2)} μs`;
    } else if (seconds < 1) {
      return `${(seconds * 1000).toFixed(2)} ms`;
    } else {
      return `${seconds.toFixed(2)} s`;
    }
  },

  // Get the type name in a more user-friendly format
  getProfileTypeName(type: ProfileType): string {
    const typeNames: Record<ProfileType, string> = {
      cpu: 'CPU Profile',
      heap: 'Heap Profile',
      block: 'Block Profile',
      mutex: 'Mutex Profile',
      goroutine: 'Goroutine Profile',
      threadcreate: 'Thread Creation Profile'
    };
    
    return typeNames[type] || type;
  },

  // Get color for a profile type
  getProfileTypeColor(type: ProfileType): string {
    const colors: Record<ProfileType, string> = {
      cpu: 'bg-viz-blue text-white',
      heap: 'bg-viz-green text-white',
      block: 'bg-viz-yellow text-black',
      mutex: 'bg-viz-purple text-white',
      goroutine: 'bg-viz-teal text-white',
      threadcreate: 'bg-viz-red text-white'
    };
    
    return colors[type] || 'bg-neutral-500 text-white';
  },

  // Get a relative timestamp (e.g., "2 hours ago")
  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }
};

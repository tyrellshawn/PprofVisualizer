import { z } from 'zod';

// Profile Type Definitions
export type ProfileType = 'cpu' | 'heap' | 'block' | 'mutex' | 'goroutine' | 'threadcreate';

export interface PprofFunction {
  flat: string; // flat time or memory
  flatPercent: string; // percentage of total flat time/memory
  cum: string; // cumulative time or memory
  cumPercent: string; // percentage of total cumulative time/memory
  functionName: string; // function name
  stacktrace?: string[]; // optional stack trace for this function
}

export interface ProfileMetadata {
  duration?: number;
  totalTime?: number;
  sampleCount?: number;
  period?: number;
  topFunctions?: PprofFunction[];
  error?: string;
}

export interface Profile {
  id: number;
  filename: string;
  originalFilename: string;
  profileType: ProfileType;
  size: number;
  description?: string | null;
  metadata: ProfileMetadata;
  uploadedAt: string; // ISO string
  isSaved: boolean;
  data: string; // base64 encoded profile data
}

export const profileSchema = z.object({
  id: z.number(),
  filename: z.string(),
  originalFilename: z.string(),
  profileType: z.string(),
  size: z.number(),
  description: z.string().nullable().optional(),
  metadata: z.any(),
  uploadedAt: z.string(),
  isSaved: z.boolean(),
  data: z.string()
});

export const insertProfileSchema = profileSchema.omit({ 
  id: true,
  uploadedAt: true
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;

// Connection Type Definitions
export interface Connection {
  id: number;
  name: string;
  url: string;
  lastConnected: string | null; // ISO string or null
  isActive: boolean;
}

export const connectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  lastConnected: z.string().nullable(),
  isActive: z.boolean()
});

export const insertConnectionSchema = connectionSchema.omit({ 
  id: true,
  lastConnected: true
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;

// Stacktrace Type Definition
export interface Stacktrace {
  functionId: string;
  frames: StackFrame[];
}

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  address?: string;
}
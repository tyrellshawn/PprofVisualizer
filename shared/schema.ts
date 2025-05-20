import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the Profile schema
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  profileType: text("profile_type").notNull(), // 'cpu', 'heap', 'block', etc.
  size: integer("size").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").notNull(), // Store duration, number of goroutines, etc.
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  isSaved: boolean("is_saved").notNull().default(false),
  data: text("data").notNull(), // Serialized profile data (base64)
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  uploadedAt: true
});

// For connections to pprof HTTP endpoints
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  lastConnected: timestamp("last_connected"),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  lastConnected: true
});

// Export types
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

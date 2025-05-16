import express, { Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PprofParser } from "./services/pprof-parser";
import { PprofCli } from "./services/pprof-cli";
import { insertProfileSchema, insertConnectionSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Setup file upload middleware
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `pprof_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  });

  // Initialize pprof services
  const pprofParser = new PprofParser();
  const pprofCli = new PprofCli();

  // API routes - all prefixed with /api
  const apiRouter = express.Router();

  // Profile routes
  apiRouter.get("/profiles", async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  apiRouter.get("/profiles/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const profiles = await storage.getRecentProfiles(limit);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching recent profiles:", error);
      res.status(500).json({ message: "Failed to fetch recent profiles" });
    }
  });

  apiRouter.get("/profiles/saved", async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getSavedProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching saved profiles:", error);
      res.status(500).json({ message: "Failed to fetch saved profiles" });
    }
  });

  apiRouter.get("/profiles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getProfile(id);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Upload and parse pprof file
  apiRouter.post("/profiles/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No profile file uploaded" });
      }

      const filePath = req.file.path;
      const originalFilename = req.file.originalname;
      const description = req.body.description || "";
      const profileType = req.body.profileType || "cpu"; // Default to CPU profile

      // Parse the profile
      const { metadata, data } = await pprofParser.parseFile(filePath);

      const profileData = {
        filename: path.basename(filePath),
        originalFilename,
        profileType,
        size: req.file.size,
        description,
        metadata,
        data,
        isSaved: Boolean(req.body.isSaved) || false,
      };

      // Validate with zod schema
      const validatedData = insertProfileSchema.parse(profileData);
      
      // Store in database
      const profile = await storage.createProfile(validatedData);
      
      // Return the profile
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error uploading profile:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to upload and parse profile" });
    } finally {
      // Clean up temporary file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  // Update a profile
  apiRouter.patch("/profiles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getProfile(id);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Update only allowed fields
      const updates = {
        description: req.body.description,
        isSaved: req.body.isSaved,
      };
      
      const updatedProfile = await storage.updateProfile(id, updates);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Delete a profile
  apiRouter.delete("/profiles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProfile(id);
      
      if (!success) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting profile:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Connection routes
  apiRouter.get("/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  apiRouter.post("/connections", async (req: Request, res: Response) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.status(201).json(connection);
    } catch (error) {
      console.error("Error creating connection:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create connection" });
    }
  });

  apiRouter.get("/connections/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const connection = await storage.getConnection(id);
      
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      res.json(connection);
    } catch (error) {
      console.error("Error fetching connection:", error);
      res.status(500).json({ message: "Failed to fetch connection" });
    }
  });

  // Fetch profile data from HTTP endpoint
  apiRouter.post("/fetch-profile", async (req: Request, res: Response) => {
    try {
      const { url, profileType } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Fetch and parse the profile
      const { metadata, data } = await pprofParser.fetchFromUrl(url, profileType);
      
      const profileData = {
        filename: `remote_${Date.now()}.pprof`,
        originalFilename: `remote_${new URL(url).hostname}.pprof`,
        profileType: profileType || "cpu",
        size: Buffer.from(data, 'base64').length,
        description: `Fetched from ${url}`,
        metadata,
        data,
        isSaved: false,
      };

      // Validate with zod schema
      const validatedData = insertProfileSchema.parse(profileData);
      
      // Store in database
      const profile = await storage.createProfile(validatedData);
      
      // Return the profile
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error fetching profile from URL:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to fetch and parse profile from URL" });
    }
  });

  // Use CLI to get profile
  apiRouter.post("/cli-profile", async (req: Request, res: Response) => {
    try {
      const { command, args, profileType } = req.body;
      
      if (!command) {
        return res.status(400).json({ message: "Command is required" });
      }

      // Run the command and get profile data
      const { output, exitCode, error } = await pprofCli.runCommand(command, args);
      
      if (exitCode !== 0 || error) {
        return res.status(400).json({ 
          message: "Command execution failed", 
          error,
          exitCode
        });
      }

      // Parse the output
      const { metadata, data } = await pprofParser.parseData(output);
      
      const profileData = {
        filename: `cli_${Date.now()}.pprof`,
        originalFilename: `cli_output.pprof`,
        profileType: profileType || "cpu",
        size: Buffer.from(data, 'base64').length,
        description: `Generated from CLI: ${command} ${args?.join(' ') || ''}`,
        metadata,
        data,
        isSaved: false,
      };

      // Validate with zod schema
      const validatedData = insertProfileSchema.parse(profileData);
      
      // Store in database
      const profile = await storage.createProfile(validatedData);
      
      // Return the profile
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error generating profile from CLI:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to generate and parse profile from CLI" });
    }
  });

  // Use the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}

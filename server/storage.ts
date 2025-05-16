import { 
  Profile, 
  InsertProfile, 
  Connection, 
  InsertConnection,
  profiles,
  connections
} from "@shared/schema";

// Interface for profile storage operations
export interface IStorage {
  // Profile operations
  getProfile(id: number): Promise<Profile | undefined>;
  getProfiles(): Promise<Profile[]>;
  getSavedProfiles(): Promise<Profile[]>;
  getRecentProfiles(limit?: number): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: number, profile: Partial<Profile>): Promise<Profile | undefined>;
  deleteProfile(id: number): Promise<boolean>;
  
  // Connection operations
  getConnection(id: number): Promise<Connection | undefined>;
  getConnections(): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, connection: Partial<Connection>): Promise<Connection | undefined>;
  deleteConnection(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private profiles: Map<number, Profile>;
  private connections: Map<number, Connection>;
  private profileCurrentId: number;
  private connectionCurrentId: number;

  constructor() {
    this.profiles = new Map();
    this.connections = new Map();
    this.profileCurrentId = 1;
    this.connectionCurrentId = 1;
  }

  // Profile operations
  async getProfile(id: number): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getSavedProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values())
      .filter((profile) => profile.isSaved)
      .sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  }

  async getRecentProfiles(limit: number = 10): Promise<Profile[]> {
    return Array.from(this.profiles.values())
      .sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      .slice(0, limit);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = this.profileCurrentId++;
    const now = new Date();
    const profile: Profile = { 
      ...insertProfile, 
      id, 
      uploadedAt: now 
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async updateProfile(id: number, profileUpdate: Partial<Profile>): Promise<Profile | undefined> {
    const existingProfile = this.profiles.get(id);
    if (!existingProfile) return undefined;

    const updatedProfile = { ...existingProfile, ...profileUpdate };
    this.profiles.set(id, updatedProfile);
    return updatedProfile;
  }

  async deleteProfile(id: number): Promise<boolean> {
    return this.profiles.delete(id);
  }

  // Connection operations
  async getConnection(id: number): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = this.connectionCurrentId++;
    const connection: Connection = { ...insertConnection, id, lastConnected: null };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: number, connectionUpdate: Partial<Connection>): Promise<Connection | undefined> {
    const existingConnection = this.connections.get(id);
    if (!existingConnection) return undefined;

    const updatedConnection = { ...existingConnection, ...connectionUpdate };
    this.connections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteConnection(id: number): Promise<boolean> {
    return this.connections.delete(id);
  }
}

export const storage = new MemStorage();

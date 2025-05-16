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
    
    // Initialize with sample profiles for testing
    this.initSampleData();
  }
  
  // Add sample data for testing purposes
  private initSampleData() {
    // Sample CPU profile
    const cpuProfile: Profile = {
      id: this.profileCurrentId++,
      filename: "sample_cpu_profile.pprof",
      originalFilename: "main_cpu.pprof",
      profileType: "cpu",
      size: 245789,
      description: "Sample CPU profile from Go web service",
      metadata: {
        duration: 30.2,
        totalTime: 15.75,
        sampleCount: 3542,
        period: 100000,
        topFunctions: [
          { 
            flat: "8.24s", 
            flatPercent: "52.3%", 
            cum: "10.45s", 
            cumPercent: "66.3%", 
            functionName: "main.processRequest" 
          },
          { 
            flat: "2.31s", 
            flatPercent: "14.7%", 
            cum: "3.56s", 
            cumPercent: "22.6%", 
            functionName: "encoding/json.Marshal" 
          },
          { 
            flat: "1.12s", 
            flatPercent: "7.1%", 
            cum: "2.98s", 
            cumPercent: "18.9%", 
            functionName: "net/http.(*conn).serve" 
          },
          { 
            flat: "0.98s", 
            flatPercent: "6.2%", 
            cum: "1.45s", 
            cumPercent: "9.2%", 
            functionName: "runtime.mallocgc" 
          },
          { 
            flat: "0.75s", 
            flatPercent: "4.8%", 
            cum: "1.20s", 
            cumPercent: "7.6%", 
            functionName: "runtime.gcBgMarkWorker" 
          },
          { 
            flat: "0.67s", 
            flatPercent: "4.3%", 
            cum: "0.89s", 
            cumPercent: "5.7%", 
            functionName: "database/sql.(*DB).Query" 
          },
          { 
            flat: "0.58s", 
            flatPercent: "3.7%", 
            cum: "1.12s", 
            cumPercent: "7.1%", 
            functionName: "regexp.(*Regexp).FindStringSubmatch" 
          },
          { 
            flat: "0.45s", 
            flatPercent: "2.9%", 
            cum: "0.75s", 
            cumPercent: "4.8%", 
            functionName: "sync.(*Mutex).Lock" 
          },
          { 
            flat: "0.37s", 
            flatPercent: "2.4%", 
            cum: "0.51s", 
            cumPercent: "3.2%", 
            functionName: "fmt.Sprintf" 
          },
          { 
            flat: "0.28s", 
            flatPercent: "1.8%", 
            cum: "0.28s", 
            cumPercent: "1.8%", 
            functionName: "bytes.(*Buffer).Write" 
          }
        ]
      },
      uploadedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      isSaved: true,
      data: "c2FtcGxlIGJhc2U2NCBlbmNvZGVkIHByb2ZpbGUgZGF0YQ==" // Placeholder base64 data
    };
    
    // Sample Heap profile
    const heapProfile: Profile = {
      id: this.profileCurrentId++,
      filename: "sample_heap_profile.pprof",
      originalFilename: "api_heap.pprof",
      profileType: "heap",
      size: 178234,
      description: "Sample Heap profile from API service",
      metadata: {
        sampleCount: 2145,
        topFunctions: [
          { 
            flat: "256.45 MB", 
            flatPercent: "32.4%", 
            cum: "312.78 MB", 
            cumPercent: "39.5%", 
            functionName: "main.cacheResults" 
          },
          { 
            flat: "124.32 MB", 
            flatPercent: "15.7%", 
            cum: "145.67 MB", 
            cumPercent: "18.4%", 
            functionName: "encoding/json.Unmarshal" 
          },
          { 
            flat: "98.45 MB", 
            flatPercent: "12.4%", 
            cum: "154.23 MB", 
            cumPercent: "19.5%", 
            functionName: "github.com/lib/pq.(*conn).Prepare" 
          },
          { 
            flat: "76.89 MB", 
            flatPercent: "9.7%", 
            cum: "89.34 MB", 
            cumPercent: "11.3%", 
            functionName: "image.(*RGBA).SubImage" 
          },
          { 
            flat: "65.45 MB", 
            flatPercent: "8.3%", 
            cum: "83.21 MB", 
            cumPercent: "10.5%", 
            functionName: "bytes.Join" 
          },
          { 
            flat: "45.67 MB", 
            flatPercent: "5.8%", 
            cum: "56.78 MB", 
            cumPercent: "7.2%", 
            functionName: "io.Copy" 
          },
          { 
            flat: "38.93 MB", 
            flatPercent: "4.9%", 
            cum: "42.15 MB", 
            cumPercent: "5.3%", 
            functionName: "regexp.Compile" 
          },
          { 
            flat: "34.21 MB", 
            flatPercent: "4.3%", 
            cum: "34.21 MB", 
            cumPercent: "4.3%", 
            functionName: "container/list.New" 
          },
          { 
            flat: "29.87 MB", 
            flatPercent: "3.8%", 
            cum: "48.92 MB", 
            cumPercent: "6.2%", 
            functionName: "net/http.readRequest" 
          }
        ]
      },
      uploadedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isSaved: true,
      data: "c2FtcGxlIGJhc2U2NCBlbmNvZGVkIGhlYXAgcHJvZmlsZSBkYXRh" // Placeholder base64 data
    };
    
    // Sample Block profile
    const blockProfile: Profile = {
      id: this.profileCurrentId++,
      filename: "sample_block_profile.pprof",
      originalFilename: "worker_block.pprof",
      profileType: "block",
      size: 89456,
      description: "Sample Block profile from worker service",
      metadata: {
        duration: 60.5,
        sampleCount: 1245,
        topFunctions: [
          { 
            flat: "1.23s", 
            flatPercent: "28.5%", 
            cum: "2.45s", 
            cumPercent: "56.7%", 
            functionName: "main.processQueue" 
          },
          { 
            flat: "0.87s", 
            flatPercent: "20.2%", 
            cum: "1.56s", 
            cumPercent: "36.1%", 
            functionName: "sync.(*WaitGroup).Wait" 
          },
          { 
            flat: "0.76s", 
            flatPercent: "17.6%", 
            cum: "1.12s", 
            cumPercent: "25.9%", 
            functionName: "sync.(*Mutex).Lock" 
          },
          { 
            flat: "0.54s", 
            flatPercent: "12.5%", 
            cum: "0.89s", 
            cumPercent: "20.6%", 
            functionName: "sync/atomic.CompareAndSwapInt64" 
          },
          { 
            flat: "0.32s", 
            flatPercent: "7.4%", 
            cum: "0.67s", 
            cumPercent: "15.5%", 
            functionName: "database/sql.(*DB).QueryContext" 
          },
          { 
            flat: "0.28s", 
            flatPercent: "6.5%", 
            cum: "0.45s", 
            cumPercent: "10.4%", 
            functionName: "net.(*netFD).Read" 
          },
          { 
            flat: "0.17s", 
            flatPercent: "3.9%", 
            cum: "0.36s", 
            cumPercent: "8.3%", 
            functionName: "os.(*File).Write" 
          },
          { 
            flat: "0.15s", 
            flatPercent: "3.5%", 
            cum: "0.27s", 
            cumPercent: "6.3%", 
            functionName: "time.Sleep" 
          }
        ]
      },
      uploadedAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      isSaved: false,
      data: "c2FtcGxlIGJhc2U2NCBlbmNvZGVkIGJsb2NrIHByb2ZpbGUgZGF0YQ==" // Placeholder base64 data
    };
    
    // Add sample profiles to storage
    this.profiles.set(cpuProfile.id, cpuProfile);
    this.profiles.set(heapProfile.id, heapProfile);
    this.profiles.set(blockProfile.id, blockProfile);
    
    // Add a sample connection
    const sampleConnection: Connection = {
      id: this.connectionCurrentId++,
      name: "Local Development Server",
      url: "http://localhost:6060/debug/pprof/",
      lastConnected: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      isActive: false
    };
    
    this.connections.set(sampleConnection.id, sampleConnection);
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

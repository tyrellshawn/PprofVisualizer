import { MemStorage } from '../../server/storage';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('Profile operations', () => {
    const testProfile = {
      filename: 'test_profile.pprof',
      originalFilename: 'profile.pprof',
      profileType: 'cpu',
      size: 1024,
      description: 'Test profile',
      metadata: { topFunctions: [] },
      isSaved: false,
      data: 'base64data'
    };

    test('createProfile should add a profile and return it with ID', async () => {
      const createdProfile = await storage.createProfile(testProfile);
      
      expect(createdProfile.id).toBeDefined();
      expect(createdProfile.filename).toBe(testProfile.filename);
      expect(createdProfile.originalFilename).toBe(testProfile.originalFilename);
      expect(createdProfile.profileType).toBe(testProfile.profileType);
      expect(createdProfile.uploadedAt).toBeDefined();
      
      // Verify it was stored
      const retrievedProfile = await storage.getProfile(createdProfile.id);
      expect(retrievedProfile).toEqual(createdProfile);
    });

    test('getProfiles should return all profiles', async () => {
      // Add multiple profiles
      await storage.createProfile(testProfile);
      await storage.createProfile({
        ...testProfile,
        filename: 'test_profile2.pprof',
        profileType: 'heap'
      });
      
      const profiles = await storage.getProfiles();
      
      expect(profiles.length).toBeGreaterThanOrEqual(2);
      expect(profiles.some(p => p.filename === 'test_profile.pprof')).toBe(true);
      expect(profiles.some(p => p.filename === 'test_profile2.pprof')).toBe(true);
    });

    test('getProfile should return undefined for non-existent profile', async () => {
      const profile = await storage.getProfile(9999);
      expect(profile).toBeUndefined();
    });

    test('updateProfile should modify profile properties', async () => {
      // Create a profile first
      const createdProfile = await storage.createProfile(testProfile);
      
      // Update it
      const updateData = {
        description: 'Updated description',
        isSaved: true
      };
      
      const updatedProfile = await storage.updateProfile(createdProfile.id, updateData);
      
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile?.description).toBe('Updated description');
      expect(updatedProfile?.isSaved).toBe(true);
      
      // Verify the update persisted
      const retrievedProfile = await storage.getProfile(createdProfile.id);
      expect(retrievedProfile?.description).toBe('Updated description');
      expect(retrievedProfile?.isSaved).toBe(true);
    });

    test('updateProfile should return undefined for non-existent profile', async () => {
      const result = await storage.updateProfile(9999, { description: 'test' });
      expect(result).toBeUndefined();
    });

    test('deleteProfile should remove a profile', async () => {
      // Create a profile
      const createdProfile = await storage.createProfile(testProfile);
      
      // Delete it
      const deleteResult = await storage.deleteProfile(createdProfile.id);
      expect(deleteResult).toBe(true);
      
      // Verify it's gone
      const retrievedProfile = await storage.getProfile(createdProfile.id);
      expect(retrievedProfile).toBeUndefined();
    });

    test('deleteProfile should return false for non-existent profile', async () => {
      const result = await storage.deleteProfile(9999);
      expect(result).toBe(false);
    });

    test('getSavedProfiles should only return saved profiles', async () => {
      // Add saved and unsaved profiles
      await storage.createProfile(testProfile);
      await storage.createProfile({
        ...testProfile,
        filename: 'test_saved.pprof',
        isSaved: true
      });
      
      const savedProfiles = await storage.getSavedProfiles();
      
      expect(savedProfiles.length).toBeGreaterThan(0);
      expect(savedProfiles.every(p => p.isSaved === true)).toBe(true);
    });

    test('getRecentProfiles should return profiles ordered by uploadedAt', async () => {
      // Clear existing profiles to ensure clean test
      const existingProfiles = await storage.getProfiles();
      for (const profile of existingProfiles) {
        await storage.deleteProfile(profile.id);
      }

      // Add profiles with different timestamps
      const profile1 = await storage.createProfile({
        ...testProfile,
        filename: 'older.pprof'
      });

      // Manipulate timestamps directly for testing
      const profile2 = await storage.createProfile({
        ...testProfile,
        filename: 'newer.pprof'
      });

      // Modify the uploadedAt fields to ensure they are in the correct order
      // This is a bit hacky but necessary for testing time ordering
      const profiles = await storage.getProfiles();
      const profile1Obj = profiles.find(p => p.id === profile1.id);
      const profile2Obj = profiles.find(p => p.id === profile2.id);
      
      if (profile1Obj && profile2Obj) {
        // Set profile1's timestamp to be older
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 1);
        profile1Obj.uploadedAt = oldDate.toISOString();
        
        // Set profile2's timestamp to be newer
        profile2Obj.uploadedAt = new Date().toISOString();
        
        // Update the profiles
        await storage.updateProfile(profile1Obj.id, { uploadedAt: profile1Obj.uploadedAt });
        await storage.updateProfile(profile2Obj.id, { uploadedAt: profile2Obj.uploadedAt });
      }
      
      // Get recent profiles with limit = 2
      const recentProfiles = await storage.getRecentProfiles(2);
      
      expect(recentProfiles.length).toBeLessThanOrEqual(2);
      // Newest should be first
      if (recentProfiles.length >= 2) {
        expect(recentProfiles[0].filename).toBe('newer.pprof');
        expect(recentProfiles[1].filename).toBe('older.pprof');
      }
    });
  });

  describe('Connection operations', () => {
    const testConnection = {
      name: 'Test Connection',
      url: 'http://test.example.com:8080/debug/pprof',
      isActive: true
    };

    test('createConnection should add a connection and return it with ID', async () => {
      const createdConnection = await storage.createConnection(testConnection);
      
      expect(createdConnection.id).toBeDefined();
      expect(createdConnection.name).toBe(testConnection.name);
      expect(createdConnection.url).toBe(testConnection.url);
      expect(createdConnection.isActive).toBe(testConnection.isActive);
      expect(createdConnection.lastConnected).toBeNull();
      
      // Verify it was stored
      const retrievedConnection = await storage.getConnection(createdConnection.id);
      expect(retrievedConnection).toEqual(createdConnection);
    });

    test('getConnections should return all connections', async () => {
      // Add multiple connections
      await storage.createConnection(testConnection);
      await storage.createConnection({
        ...testConnection,
        name: 'Test Connection 2',
        url: 'http://test2.example.com:8080/debug/pprof'
      });
      
      const connections = await storage.getConnections();
      
      expect(connections.length).toBeGreaterThanOrEqual(2);
      expect(connections.some(c => c.name === 'Test Connection')).toBe(true);
      expect(connections.some(c => c.name === 'Test Connection 2')).toBe(true);
    });

    test('updateConnection should modify connection properties', async () => {
      // Create a connection first
      const createdConnection = await storage.createConnection(testConnection);
      
      // Update it
      const updateData = {
        name: 'Updated Connection Name',
        isActive: false
      };
      
      const updatedConnection = await storage.updateConnection(createdConnection.id, updateData);
      
      expect(updatedConnection).toBeDefined();
      expect(updatedConnection?.name).toBe('Updated Connection Name');
      expect(updatedConnection?.isActive).toBe(false);
      
      // Verify the update persisted
      const retrievedConnection = await storage.getConnection(createdConnection.id);
      expect(retrievedConnection?.name).toBe('Updated Connection Name');
      expect(retrievedConnection?.isActive).toBe(false);
    });

    test('deleteConnection should remove a connection', async () => {
      // Create a connection
      const createdConnection = await storage.createConnection(testConnection);
      
      // Delete it
      const deleteResult = await storage.deleteConnection(createdConnection.id);
      expect(deleteResult).toBe(true);
      
      // Verify it's gone
      const retrievedConnection = await storage.getConnection(createdConnection.id);
      expect(retrievedConnection).toBeUndefined();
    });
  });
});
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';

// Mock the storage methods
jest.mock('../../server/storage', () => ({
  storage: {
    getProfiles: jest.fn(),
    getProfile: jest.fn(),
    getRecentProfiles: jest.fn(),
    getSavedProfiles: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    createProfile: jest.fn(),
    getConnections: jest.fn(),
    getConnection: jest.fn(),
    createConnection: jest.fn(),
    updateConnection: jest.fn(),
    deleteConnection: jest.fn(),
  }
}));

describe('API Routes', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profiles', () => {
    it('should return a list of profiles', async () => {
      const mockProfiles = [
        {
          id: 1,
          filename: 'sample_cpu_profile.pprof',
          originalFilename: 'cpu.pprof',
          profileType: 'cpu',
          size: 1024,
          description: 'Sample CPU profile',
          metadata: { topFunctions: [] },
          uploadedAt: new Date().toISOString(),
          isSaved: true,
          data: 'base64data'
        }
      ];

      (storage.getProfiles as jest.Mock).mockResolvedValue(mockProfiles);

      const response = await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(response.body).toEqual(mockProfiles);
      expect(storage.getProfiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/profiles/recent', () => {
    it('should return a list of recent profiles', async () => {
      const mockProfiles = [
        {
          id: 1,
          filename: 'sample_cpu_profile.pprof',
          originalFilename: 'cpu.pprof',
          profileType: 'cpu',
          size: 1024,
          description: 'Sample CPU profile',
          metadata: { topFunctions: [] },
          uploadedAt: new Date().toISOString(),
          isSaved: false,
          data: 'base64data'
        }
      ];

      (storage.getRecentProfiles as jest.Mock).mockResolvedValue(mockProfiles);

      const response = await request(app)
        .get('/api/profiles/recent')
        .expect(200);

      expect(response.body).toEqual(mockProfiles);
      expect(storage.getRecentProfiles).toHaveBeenCalledTimes(1);
      expect(storage.getRecentProfiles).toHaveBeenCalledWith(10); // Default limit
    });
  });

  describe('GET /api/profiles/saved', () => {
    it('should return a list of saved profiles', async () => {
      const mockProfiles = [
        {
          id: 1,
          filename: 'sample_cpu_profile.pprof',
          originalFilename: 'cpu.pprof',
          profileType: 'cpu',
          size: 1024,
          description: 'Sample CPU profile',
          metadata: { topFunctions: [] },
          uploadedAt: new Date().toISOString(),
          isSaved: true,
          data: 'base64data'
        }
      ];

      (storage.getSavedProfiles as jest.Mock).mockResolvedValue(mockProfiles);

      const response = await request(app)
        .get('/api/profiles/saved')
        .expect(200);

      expect(response.body).toEqual(mockProfiles);
      expect(storage.getSavedProfiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/profiles/:id', () => {
    it('should return a profile by ID', async () => {
      const mockProfile = {
        id: 1,
        filename: 'sample_cpu_profile.pprof',
        originalFilename: 'cpu.pprof',
        profileType: 'cpu',
        size: 1024,
        description: 'Sample CPU profile',
        metadata: { topFunctions: [] },
        uploadedAt: new Date().toISOString(),
        isSaved: true,
        data: 'base64data'
      };

      (storage.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/profiles/1')
        .expect(200);

      expect(response.body).toEqual(mockProfile);
      expect(storage.getProfile).toHaveBeenCalledTimes(1);
      expect(storage.getProfile).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent profile', async () => {
      (storage.getProfile as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .get('/api/profiles/999')
        .expect(404);

      expect(storage.getProfile).toHaveBeenCalledTimes(1);
      expect(storage.getProfile).toHaveBeenCalledWith(999);
    });
  });

  describe('PATCH /api/profiles/:id', () => {
    it('should update a profile', async () => {
      const profileUpdate = {
        description: 'Updated description',
        isSaved: true
      };

      const updatedProfile = {
        id: 1,
        filename: 'sample_cpu_profile.pprof',
        originalFilename: 'cpu.pprof',
        profileType: 'cpu',
        size: 1024,
        description: 'Updated description',
        metadata: { topFunctions: [] },
        uploadedAt: new Date().toISOString(),
        isSaved: true,
        data: 'base64data'
      };

      (storage.updateProfile as jest.Mock).mockResolvedValue(updatedProfile);

      const response = await request(app)
        .patch('/api/profiles/1')
        .send(profileUpdate)
        .expect(200);

      expect(response.body).toEqual(updatedProfile);
      expect(storage.updateProfile).toHaveBeenCalledTimes(1);
      expect(storage.updateProfile).toHaveBeenCalledWith(1, profileUpdate);
    });

    it('should return 404 for non-existent profile', async () => {
      (storage.updateProfile as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .patch('/api/profiles/999')
        .send({ description: 'Updated' })
        .expect(404);

      expect(storage.updateProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    it('should delete a profile', async () => {
      (storage.deleteProfile as jest.Mock).mockResolvedValue(true);

      await request(app)
        .delete('/api/profiles/1')
        .expect(204);

      expect(storage.deleteProfile).toHaveBeenCalledTimes(1);
      expect(storage.deleteProfile).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent profile', async () => {
      (storage.deleteProfile as jest.Mock).mockResolvedValue(false);

      await request(app)
        .delete('/api/profiles/999')
        .expect(404);

      expect(storage.deleteProfile).toHaveBeenCalledTimes(1);
      expect(storage.deleteProfile).toHaveBeenCalledWith(999);
    });
  });
});
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import fetch from 'node-fetch';
import { exec } from 'child_process';

const execPromise = promisify(exec);

export class PprofParser {
  /**
   * Parse a pprof file and extract metadata and base64 data
   */
  async parseFile(filePath: string): Promise<{ metadata: any; data: string }> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read the file
      const fileBuffer = await fs.promises.readFile(filePath);
      
      // Convert to base64 for storage
      const data = fileBuffer.toString('base64');
      
      // Extract metadata using go tool pprof
      const metadata = await this.extractMetadata(filePath);
      
      return { metadata, data };
    } catch (error) {
      console.error('Error parsing pprof file:', error);
      throw new Error(`Failed to parse pprof file: ${(error as Error).message}`);
    }
  }

  /**
   * Parse pprof data directly from buffer or string
   */
  async parseData(rawData: Buffer | string): Promise<{ metadata: any; data: string }> {
    try {
      // Create temporary file to analyze with pprof tools
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `temp_pprof_${Date.now()}.pprof`);
      
      // Convert string to buffer if needed
      const dataBuffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
      
      // Write to temp file
      await fs.promises.writeFile(tempFilePath, dataBuffer);
      
      // Extract metadata from the temp file
      const metadata = await this.extractMetadata(tempFilePath);
      
      // Convert to base64 for storage
      const data = dataBuffer.toString('base64');
      
      // Clean up temp file
      await fs.promises.unlink(tempFilePath);
      
      return { metadata, data };
    } catch (error) {
      console.error('Error parsing pprof data:', error);
      throw new Error(`Failed to parse pprof data: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch profile from a URL
   */
  async fetchFromUrl(url: string, profileType: string = 'cpu'): Promise<{ metadata: any; data: string }> {
    try {
      // Handle Go example applications specially
      const isGoExample = url.includes('localhost:606');
      let pprofUrl = url;
      
      // Configure URLs for our Go example applications
      if (isGoExample) {
        console.log(`Fetching from Go example app: ${url}`);
        
        if (!url.includes('debug/pprof')) {
          // For CPU profiles, append seconds parameter
          if (profileType === 'cpu') {
            pprofUrl = url.endsWith('/') 
              ? `${url}debug/pprof/profile?seconds=10`
              : `${url}/debug/pprof/profile?seconds=10`;
          } else {
            // For other profile types
            pprofUrl = url.endsWith('/') 
              ? `${url}debug/pprof/${profileType}`
              : `${url}/debug/pprof/${profileType}`;
          }
        } else if (profileType === 'cpu' && !url.includes('seconds=')) {
          // If it's already a debug/pprof URL but missing seconds for CPU profile
          pprofUrl = url.includes('?') 
            ? `${url}&seconds=10` 
            : `${url}?seconds=10`;
        }
        
        console.log(`Adjusted pprof URL: ${pprofUrl}`);
      } else if (!url.includes('debug/pprof')) {
        // Standard handling for non-example URLs
        pprofUrl = url.endsWith('/') 
          ? `${url}debug/pprof/${profileType}`
          : `${url}/debug/pprof/${profileType}`;
      }
      
      // Fetch the profile
      console.log(`Fetching profile from: ${pprofUrl}`);
      const response = await fetch(pprofUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile from ${pprofUrl}: ${response.statusText}`);
      }
      
      const buffer = await response.buffer();
      console.log(`Successfully fetched ${buffer.length} bytes`);
      
      // Parse the fetched data
      return this.parseData(buffer);
    } catch (error) {
      console.error('Error fetching profile from URL:', error);
      throw new Error(`Failed to fetch profile from URL: ${(error as Error).message}`);
    }
  }

  /**
   * Extract metadata from a pprof file using go tool pprof
   */
  private async extractMetadata(filePath: string): Promise<any> {
    try {
      // For safety, first check if go is installed
      try {
        await execPromise('which go');
      } catch (error) {
        return { error: 'Go not installed. Basic parsing only.' };
      }

      // Try to use go tool pprof to get top functions
      const { stdout } = await execPromise(`go tool pprof -top -nodecount=20 ${filePath}`);
      
      // Parse the text output to extract metadata
      const lines = stdout.split('\n');
      const headerLine = lines.find(line => line.includes('Duration:'));
      
      const metadata: Record<string, any> = {};
      
      // Extract duration
      if (headerLine) {
        const durationMatch = headerLine.match(/Duration: (\d+(\.\d+)?)s/);
        if (durationMatch) {
          metadata.duration = parseFloat(durationMatch[1]);
        }
        
        // Extract other metadata from the header
        const totalMatch = headerLine.match(/Total: (\d+(\.\d+)?)s/);
        if (totalMatch) {
          metadata.totalTime = parseFloat(totalMatch[1]);
        }
      }
      
      // Extract top functions
      const topFunctions: any[] = [];
      let dataStarted = false;
      
      for (const line of lines) {
        if (line.includes('flat  flat%') && !dataStarted) {
          dataStarted = true;
          continue;
        }
        
        if (dataStarted && line.trim() !== '') {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            topFunctions.push({
              flat: parts[0],
              flatPercent: parts[1],
              cum: parts[2],
              cumPercent: parts[3],
              functionName: parts.slice(4).join(' ')
            });
          }
        }
      }
      
      metadata.topFunctions = topFunctions;
      
      // Try to get sample count and goroutine count
      try {
        const { stdout: headerOut } = await execPromise(`go tool pprof -raw ${filePath} | head -n 20`);
        const sampleCountMatch = headerOut.match(/samples\/count: (\d+)/);
        if (sampleCountMatch) {
          metadata.sampleCount = parseInt(sampleCountMatch[1], 10);
        }
        
        const periodMatch = headerOut.match(/period: (\d+)/);
        if (periodMatch) {
          metadata.period = parseInt(periodMatch[1], 10);
        }
      } catch (error) {
        // Ignore errors here as it's just additional metadata
      }
      
      return metadata;
    } catch (error) {
      console.warn('Error extracting metadata:', error);
      // Return empty metadata if extraction fails
      return { error: 'Metadata extraction failed. Basic parsing only.' };
    }
  }
}

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

interface CommandResult {
  output: Buffer;
  exitCode: number | null;
  error?: string;
}

export class PprofCli {
  /**
   * Run a pprof-related command and return the result
   */
  async runCommand(command: string, args: string[] = []): Promise<CommandResult> {
    return new Promise((resolve) => {
      try {
        // Sanitize command and arguments to prevent command injection
        const sanitizedCommand = this.sanitizeCommand(command);
        const sanitizedArgs = args.map(arg => this.sanitizeArgument(arg));
        
        // Spawn the process
        const childProcess = spawn(sanitizedCommand, sanitizedArgs);
        
        const chunks: Buffer[] = [];
        childProcess.stdout.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        const errorChunks: Buffer[] = [];
        childProcess.stderr.on('data', (chunk) => {
          errorChunks.push(Buffer.from(chunk));
        });
        
        childProcess.on('close', (code) => {
          const output = Buffer.concat(chunks);
          const errorOutput = Buffer.concat(errorChunks).toString();
          
          resolve({
            output,
            exitCode: code,
            error: errorOutput.length > 0 ? errorOutput : undefined
          });
        });
        
        childProcess.on('error', (err) => {
          resolve({
            output: Buffer.alloc(0),
            exitCode: 1,
            error: err.message
          });
        });
      } catch (error) {
        resolve({
          output: Buffer.alloc(0),
          exitCode: 1,
          error: (error as Error).message
        });
      }
    });
  }

  /**
   * Check if Go and pprof tools are installed
   */
  async checkTools(): Promise<{ go: boolean; pprof: boolean }> {
    const result = { go: false, pprof: false };
    
    try {
      // Check if Go is installed
      const { stdout: goVersion } = await execPromise('go version');
      result.go = goVersion.toLowerCase().includes('go');
      
      // Check if pprof tool is available
      if (result.go) {
        const { stdout: pprofHelp } = await execPromise('go tool pprof -help');
        result.pprof = pprofHelp.toLowerCase().includes('usage');
      }
    } catch (error) {
      // If there's an error, one or both tools are not installed
    }
    
    return result;
  }

  /**
   * Fetch remote profile using go tool pprof
   */
  async fetchRemoteProfile(url: string, duration: number = 30): Promise<CommandResult> {
    // Sanitize URL
    const sanitizedUrl = this.sanitizeArgument(url);
    
    // Run go tool pprof to fetch a profile
    return this.runCommand('go', [
      'tool', 
      'pprof', 
      '-seconds', 
      duration.toString(), 
      sanitizedUrl
    ]);
  }

  /**
   * Generate flamegraph from profile data
   */
  async generateFlamegraph(profilePath: string): Promise<CommandResult> {
    // Check if graphviz is installed
    try {
      await execPromise('which dot');
    } catch (error) {
      return {
        output: Buffer.from('Graphviz not installed. Cannot generate flamegraph.'),
        exitCode: 1,
        error: 'Graphviz not installed. Cannot generate flamegraph.'
      };
    }
    
    // Sanitize path
    const sanitizedPath = this.sanitizeArgument(profilePath);
    
    // Generate SVG flamegraph
    return this.runCommand('go', [
      'tool',
      'pprof',
      '-svg',
      sanitizedPath
    ]);
  }

  /**
   * Sanitize command to prevent command injection
   */
  private sanitizeCommand(command: string): string {
    // Allow only these commands
    const allowedCommands = ['go', 'pprof', 'go-torch'];
    const baseCommand = command.split(' ')[0].trim();
    
    if (!allowedCommands.includes(baseCommand)) {
      throw new Error(`Command not allowed: ${baseCommand}`);
    }
    
    return baseCommand;
  }

  /**
   * Sanitize argument to prevent command injection
   */
  private sanitizeArgument(arg: string): string {
    // Basic sanitization - remove shell special characters
    return arg.replace(/[;&|"'`$(){}[\]<>]/g, '');
  }
}

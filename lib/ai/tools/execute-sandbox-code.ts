import { Sandbox } from '@vercel/sandbox';

/**
 * Vercel Sandbox Code Execution Tool
 * 
 * Safely executes untrusted code in an isolated microVM.
 * Requires VERCEL_SANDBOX_TOKEN to be set in production.
 * In development, run 'vercel link' and 'vercel env pull' to authenticate.
 */
export const executeSandboxCode = {
  description: 'Execute Python or Node.js code in a secure Vercel Sandbox environment. Use this for calculations, data processing, or running untrusted snippets. You can specify the language and packages to install.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The code to execute.',
      },
      language: {
        type: 'string',
        enum: ['javascript', 'python'],
        description: 'The programming language to use (javascript or python). Defaults to javascript.',
      },
      packages: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of packages to install (e.g., ["lodash", "axios"] for JS or ["requests", "pandas"] for Python).',
      },
    },
    required: ['code'],
  },
  execute: async (params?: Record<string, unknown>, { abortSignal }: { abortSignal?: AbortSignal } = {}) => {
    const { code, language = 'javascript', packages = [] } = (params || {}) as { 
      code: string; 
      language?: 'javascript' | 'python';
      packages?: string[] 
    };

    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid code to execute',
      };
    }

    let sandbox: Sandbox | null = null;
    const isPython = language === 'python';

    try {
      console.log(`[Tool: executeSandboxCode] Creating sandbox for ${language}...`);
      
      sandbox = await Sandbox.create({
        runtime: isPython ? 'python3.13' : 'node22',
        timeout: 60_000, // 60s inactivity timeout
        signal: abortSignal,
      });

      console.log(`[Tool: executeSandboxCode] Sandbox ${sandbox.sandboxId} created.`);

      // 1. Install packages if provided
      if (packages && packages.length > 0) {
        console.log(`[Tool: executeSandboxCode] Installing packages: ${packages.join(', ')}`);
        const installResult = await sandbox.runCommand(
          isPython ? 'pip' : 'npm',
          ['install', ...packages],
          { signal: abortSignal }
        );
        
        if (installResult.exitCode !== 0) {
          return {
            success: false,
            error: 'Failed to install packages',
            stderr: await installResult.stderr(),
            exitCode: installResult.exitCode,
          };
        }
      }

      // 2. Write and Run code
      console.log(`[Tool: executeSandboxCode] Running code...`);
      const runArgs = ['-c', code].map(arg => isPython && arg === '-c' ? '-c' : isPython ? arg : arg === '-c' ? '-e' : arg);
      const runResult = await sandbox.runCommand(
        isPython ? 'python' : 'node',
        runArgs,
        { signal: abortSignal }
      );

      const stdout = await runResult.stdout();
      const stderr = await runResult.stderr();

      return {
        success: runResult.exitCode === 0,
        stdout,
        stderr,
        exitCode: runResult.exitCode,
        sandboxId: sandbox.sandboxId,
      };
    } catch (error) {
      console.error('[Tool: executeSandboxCode] Execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // 3. Always stop the sandbox to free resources
      if (sandbox) {
        try {
          await sandbox.stop();
          console.log(`[Tool: executeSandboxCode] Sandbox ${sandbox.sandboxId} stopped.`);
        } catch (stopError) {
          console.error('[Tool: executeSandboxCode] Error stopping sandbox:', stopError);
        }
      }
    }
  },
};

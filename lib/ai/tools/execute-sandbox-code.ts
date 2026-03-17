import { Sandbox } from '@vercel/sandbox';

/**
 * Vercel Sandbox Code Execution Tool
 * 
 * Safely executes untrusted Node.js code in an isolated microVM.
 * Requires VERCEL_SANDBOX_TOKEN to be set in production.
 * In development, run 'vercel link' and 'vercel env pull' to authenticate.
 */
export const executeSandboxCode = {
  description: 'Execute Node.js code in a secure Vercel Sandbox environment. Use this for calculations, data processing, or running untrusted snippets. You can also specify npm packages to install.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The JavaScript/TypeScript code to execute.',
      },
      packages: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of npm packages to install (e.g., ["lodash", "axios"]).',
      },
    },
    required: ['code'],
  },
  execute: async (params?: Record<string, unknown>) => {
    const { code, packages = [] } = (params || {}) as { 
      code: string; 
      packages?: string[] 
    };

    let sandbox: Sandbox | null = null;

    try {
      console.log('[Tool: executeSandboxCode] Creating sandbox...');
      
      // Create an isolated VM (defaults to latest Node.js runtime)
      sandbox = await Sandbox.create({
        runtime: 'node22',
        timeout: 60_000, // 60s inactivity timeout
      });

      console.log(`[Tool: executeSandboxCode] Sandbox ${sandbox.sandboxId} created.`);

      // 1. Install packages if provided
      if (packages && packages.length > 0) {
        console.log(`[Tool: executeSandboxCode] Installing packages: ${packages.join(', ')}`);
        const installResult = await sandbox.runCommand({
          cmd: 'npm',
          args: ['install', ...packages],
        });
        
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
      // We use node -e for simple snippets or write to index.js for complex ones
      console.log(`[Tool: executeSandboxCode] Running code...`);
      const runResult = await sandbox.runCommand({
        cmd: 'node',
        args: ['-e', code],
      });

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
        await sandbox.stop();
        console.log(`[Tool: executeSandboxCode] Sandbox ${sandbox.sandboxId} stopped.`);
      }
    }
  },
};

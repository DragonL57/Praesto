import { spawn } from 'node:child_process';
import { type NextRequest, NextResponse } from 'next/server';
import path from 'node:path';

export const dynamic = 'force-dynamic'; // No caching for this endpoint
export const maxDuration = 30; // Set maximum duration to 30 seconds

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const languages = searchParams.getAll('languages');
    const debug = searchParams.get('debug') === 'true';

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing videoId parameter',
          transcript: null,
          videoInfo: {},
        },
        { status: 400 },
      );
    }

    console.log(
      `Processing transcript request for video: ${videoId}, languages: ${languages.join(',')}`,
    );

    // In production (Vercel), we'll directly call the Python function
    if (process.env.VERCEL) {
      const url = new URL(request.url);
      const baseUrl = url.origin;

      // Direct URL to Python function with debug parameter
      const apiUrl = `${baseUrl}/api/get_transcript?videoId=${encodeURIComponent(videoId)}${languages
        .map((lang) => `&languages=${encodeURIComponent(lang)}`)
        .join('')}${debug ? '&debug=true' : ''}`;

      console.log(`Forwarding to Python API: ${apiUrl}`);

      try {
        // Add more request headers to help debug auth issues
        const vercelJwt = request.cookies.get('_vercel_jwt')?.value;
        const fetchHeaders: HeadersInit = {
          Accept: 'application/json',
          Origin: baseUrl,
          'User-Agent': 'NextJS-Client',
          'x-debug': debug ? 'true' : 'false',
        };

        if (vercelJwt) {
          fetchHeaders.Cookie = `_vercel_jwt=${vercelJwt}`;
        }

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: fetchHeaders,
        });

        console.log(`Python API response status: ${response.status}`);

        // Log headers for debugging
        const responseHeaders = Object.fromEntries([...response.headers]);
        console.log('Response headers:', JSON.stringify(responseHeaders));

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            console.error(`API error response: ${errorText}`);
          } catch (e: unknown) {
            errorText = `Could not read error response: ${e instanceof Error ? e.message : String(e)}`;
          }

          // Return more detailed error info to frontend
          return NextResponse.json(
            {
              success: false,
              error: `API returned status ${response.status}`,
              detailedError: errorText,
              debugInfo: {
                url: apiUrl,
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
              },
              transcript: null,
              videoInfo: {},
            },
            { status: 500 },
          );
        }

        try {
          const data = await response.json();
          return NextResponse.json(data);
        } catch (parseError: unknown) {
          const text = await response.text();
          console.error(
            'Failed to parse response as JSON:',
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          );
          console.error('Raw response:', text.substring(0, 1000));

          // Return parsing error details to frontend
          return NextResponse.json(
            {
              success: false,
              error: `Failed to parse response from Python API: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              detailedError: text.substring(0, 1000),
              debugInfo: {
                rawResponsePreview: text.substring(0, 1000),
                parserError:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
              },
              transcript: null,
              videoInfo: {},
            },
            { status: 500 },
          );
        }
      } catch (fetchError: unknown) {
        console.error('Error fetching from Python API:', fetchError);

        // Return network error details to frontend
        return NextResponse.json(
          {
            success: false,
            error: `Error fetching transcript from Python API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
            detailedError:
              fetchError instanceof Error ? fetchError.stack : undefined,
            debugInfo: {
              url: apiUrl,
              networkError:
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError),
              stack: fetchError instanceof Error ? fetchError.stack : undefined,
            },
            transcript: null,
            videoInfo: {},
          },
          { status: 500 },
        );
      }
    }

    // In development (or as fallback in production), execute the Python script directly
    const pythonScriptPath = path.join(
      process.cwd(),
      'api',
      'get_transcript.py',
    );

    // Build command arguments
    const args = [pythonScriptPath, '--video-id', videoId];

    if (languages.length > 0) {
      args.push('--languages', ...languages);
    } else {
      args.push('--languages', 'en');
    }

    console.log(`Executing python script with args: ${args.join(' ')}`);

    // Execute the Python script
    const result = await new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';

      // Use python or python3 depending on what's available
      const pythonProcess = spawn('python3', args);

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`Python stderr: ${data.toString()}`);
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
          try {
            if (stdoutData.trim()) {
              const jsonResult = JSON.parse(stdoutData);
              resolve(jsonResult);
            } else {
              reject({
                success: false,
                error: 'Python script produced no output',
              });
            }
          } catch (err: unknown) {
            console.error(
              'Failed to parse Python output as JSON:',
              err instanceof Error ? err.message : String(err),
            );
            console.error('Python output:', stdoutData);
            reject({
              success: false,
              error: `Failed to parse Python output as JSON: ${err instanceof Error ? err.message : String(err)}`,
              rawOutput: stdoutData.substring(0, 500), // For debugging
            });
          }
        } else {
          console.error(`Python stderr: ${stderrData}`);
          reject({
            success: false,
            error: `Python script failed with code ${code}: ${stderrData || 'No error message'}`,
          });
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject({
          success: false,
          error: `Failed to start Python process: ${err.message}`,
        });
      });
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in YouTube transcript API route:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error), // Simplified error reporting
        detailedError: error instanceof Error ? error.stack : undefined,
        debugInfo: {
          stack: error instanceof Error ? error.stack : undefined,
          originalError: String(error), // Keep original error as string
          message: error instanceof Error ? error.message : String(error),
        },
        transcript: null,
        videoInfo: {},
      },
      { status: 500 },
    );
  }
}

import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic'; // No caching for this endpoint
export const maxDuration = 30; // Set maximum duration to 30 seconds

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const languages = searchParams.getAll('languages');
    
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing videoId parameter',
          transcript: null,
          videoInfo: {},
        },
        { status: 400 }
      );
    }
    
    console.log(`Processing transcript request for video: ${videoId}, languages: ${languages.join(',')}`);
    
    // In production (Vercel), we'll rely on the Python API endpoint being routed directly
    // via the vercel.json routes configuration. Just forward to the Python API.
    if (process.env.VERCEL) {
      const url = new URL(request.url);
      // Keep the same path but ensure it points to our Python endpoint
      const apiUrl = `${url.origin}/api/get_transcript?videoId=${encodeURIComponent(videoId)}${
        languages.map(lang => `&languages=${encodeURIComponent(lang)}`).join('')
      }`;
      
      console.log(`Forwarding to Python API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      try {
        const data = await response.json();
        return NextResponse.json(data);
      } catch (err: any) {
        console.error('Failed to parse response as JSON:', err.message);
        const text = await response.text();
        console.error('Response body:', text.substring(0, 500));
        throw new Error(`Failed to parse response from Python API: ${err.message}`);
      }
    }
    
    // In development, we'll execute the Python script directly
    // Prepare command to run the Python script
    const pythonScriptPath = path.join(process.cwd(), 'api', 'get_transcript.py');
    
    // Build command arguments
    const args = [
      pythonScriptPath,
      '--video-id', videoId,
    ];
    
    // Add languages if specified
    if (languages.length > 0) {
      args.push('--languages', ...languages);
    } else {
      args.push('--languages', 'en');
    }
    
    console.log(`Executing python script with args: ${args.join(' ')}`);
    
    // Execute the Python script with the parameters
    const result = await new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';
      
      // Use python3 to run the script
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
                error: 'Python script produced no output' 
              });
            }
          } catch (err: any) {
            console.error('Failed to parse Python output as JSON:', err.message);
            console.error('Python output:', stdoutData);
            reject({ 
              success: false, 
              error: `Failed to parse Python output as JSON: ${err.message}`,
              rawOutput: stdoutData.substring(0, 500) // For debugging
            });
          }
        } else {
          console.error(`Python stderr: ${stderrData}`);
          reject({ 
            success: false, 
            error: `Python script failed with code ${code}: ${stderrData || 'No error message'}`
          });
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject({ 
          success: false, 
          error: `Failed to start Python process: ${err.message}`
        });
      });
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error in YouTube transcript API route:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.error || error.message || 'Unknown error in transcript API',
        transcript: null,
        videoInfo: {},
      },
      { status: 500 }
    );
  }
}
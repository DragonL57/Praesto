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
    
    // In production (Vercel), we'll directly call the Python function
    if (process.env.VERCEL) {
      const url = new URL(request.url);
      const baseUrl = url.origin;
      
      // Direct URL to Python function
      const apiUrl = `${baseUrl}/api/get_transcript?videoId=${encodeURIComponent(videoId)}${
        languages.map(lang => `&languages=${encodeURIComponent(lang)}`).join('')
      }`;
      
      console.log(`Forwarding to Python API: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'Origin': baseUrl
          }
        });
        
        console.log(`Python API response status: ${response.status}`);
        
        // Log headers for debugging
        console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers])));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error response: ${errorText}`);
          
          throw new Error(`API returned status ${response.status}: ${errorText}`);
        }
        
        try {
          const data = await response.json();
          return NextResponse.json(data);
        } catch (parseError: any) {
          const text = await response.text();
          console.error('Failed to parse response as JSON:', parseError.message);
          console.error('Raw response:', text.substring(0, 1000));
          
          throw new Error(`Failed to parse response from Python API: ${parseError.message}`);
        }
      } catch (fetchError: any) {
        console.error('Error fetching from Python API:', fetchError);
        
        // Try direct access as fallback
        try {
          console.log('Attempting direct Python script execution as fallback...');
          // Fall back to the development mode code below...
          // Continue execution to the development code path
        } catch (e) {
          throw new Error(`Error fetching transcript from Python API: ${fetchError.message}`);
        }
      }
    }
    
    // In development (or as fallback in production), execute the Python script directly
    const pythonScriptPath = path.join(process.cwd(), 'api', 'get_transcript.py');
    
    // Build command arguments
    const args = [
      pythonScriptPath,
      '--video-id', videoId,
    ];
    
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
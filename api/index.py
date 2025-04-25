from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import sys
import os

# Import the get_transcript script from the same directory
from get_transcript import get_transcript, extract_video_id

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests for YouTube transcript."""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Parse URL parameters
        url_components = urlparse(self.path)
        query_params = parse_qs(url_components.query)
        
        video_id = query_params.get('videoId', [''])[0]
        languages = query_params.get('languages', ['en'])
        
        if not video_id:
            response = {
                'success': False, 
                'error': 'Missing videoId parameter',
                'transcript': None,
                'videoInfo': {}
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            # Extract video ID if full URL
            video_id = extract_video_id(video_id)
            
            # Get transcript
            result = get_transcript(video_id, languages)
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as error:
            response = {
                'success': False,
                'error': str(error),
                'transcript': None,
                'videoInfo': {}
            }
            self.wfile.write(json.dumps(response).encode())

# Export for Vercel Serverless Function
handler = handler
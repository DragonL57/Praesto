from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import sys
import os

# Import the get_transcript script from the same directory
from get_transcript import get_transcript, extract_video_id

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours
        self.end_headers()
        
    def do_GET(self):
        """Handle GET requests for YouTube transcript."""
        # Set CORS headers for all responses
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        # Print request info for debugging
        print(f"Request path: {self.path}")
        print(f"Request headers: {self.headers}")
        
        # Parse URL parameters
        url_components = urlparse(self.path)
        query_params = parse_qs(url_components.query)
        
        print(f"Query parameters: {query_params}")
        
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
            print(f"Processing video ID: {video_id}")
            
            # Get transcript
            result = get_transcript(video_id, languages)
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as error:
            print(f"Error in handler: {str(error)}")
            response = {
                'success': False,
                'error': str(error),
                'transcript': None,
                'videoInfo': {}
            }
            self.wfile.write(json.dumps(response).encode())

# Export for Vercel Serverless Function
handler = handler
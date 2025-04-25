from urllib.parse import parse_qs
from get_transcript import get_transcript, extract_video_id
import json
import os
import sys

def handler(req, res):
    # Handle OPTIONS requests for CORS preflight
    if req.method == "OPTIONS":
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'  # 24 hours
            }
        }
    
    # Set up response headers for all responses
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Debug info - print environment and request details
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Method: {req.method}")
    print(f"URL: {req.url}")
    
    # For GET requests
    if req.method == "GET":
        # Extract query parameters
        query = {}
        try:
            if hasattr(req, 'query'):
                query = parse_qs(req.query)
            elif hasattr(req, 'url') and '?' in req.url:
                query_str = req.url.split('?', 1)[1]
                query = parse_qs(query_str)
        except Exception as e:
            print(f"Error parsing query: {e}")
        
        print(f"Query parameters: {query}")
        
        # Get the video ID and languages
        video_id = ''
        languages = ['en']
        
        if 'videoId' in query:
            video_id = query['videoId'][0]
        
        if 'languages' in query:
            languages = query['languages']
        
        print(f"Processing YouTube transcript request for video: {video_id}")
        print(f"Languages: {languages}")
        
        if not video_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing videoId parameter',
                    'transcript': None,
                    'videoInfo': {}
                })
            }
        
        try:
            # Extract video ID from URL if needed
            video_id = extract_video_id(video_id)
            
            # Get transcript
            result = get_transcript(video_id, languages)
            
            # Return response
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result)
            }
        except Exception as error:
            print(f"Error getting transcript: {str(error)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': str(error),
                    'transcript': None,
                    'videoInfo': {}
                })
            }
    
    # If not GET or OPTIONS, return method not allowed
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({
            'success': False,
            'error': 'Method not allowed',
            'transcript': None,
            'videoInfo': {}
        })
    }
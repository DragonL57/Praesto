from urllib.parse import parse_qs
from get_transcript import get_transcript, extract_video_id
import json
import os
import sys
import traceback
import time

def handler(req, res):
    # Create a debug log function
    def log_debug(message):
        print(f"[DEBUG {time.time()}] {message}")
    
    # Set up response headers for all responses
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Debug',
        'X-Debug-Enabled': 'true'
    }
    
    # Debug environment details
    debug_info = {
        'python_version': sys.version,
        'working_directory': os.getcwd(),
        'environment_vars': {k: v for k, v in os.environ.items() if not 'SECRET' in k.upper() and not 'KEY' in k.upper()},
        'request_info': {}
    }
    
    try:
        # Handle OPTIONS requests for CORS preflight
        if hasattr(req, 'method') and req.method == "OPTIONS":
            log_debug("Handling OPTIONS request for CORS preflight")
            return {
                'statusCode': 200,
                'headers': headers
            }
        
        # Log request details for debugging
        log_debug(f"Request received: {dir(req)}")
        
        # Try to gather as much request info as possible
        if hasattr(req, 'method'):
            debug_info['request_info']['method'] = req.method
            log_debug(f"Method: {req.method}")
        
        if hasattr(req, 'url'):
            debug_info['request_info']['url'] = req.url
            log_debug(f"URL: {req.url}")
            
        if hasattr(req, 'headers'):
            try:
                debug_info['request_info']['headers'] = dict(req.headers)
                log_debug(f"Headers: {dict(req.headers)}")
            except:
                debug_info['request_info']['headers'] = 'Could not parse headers'
                log_debug("Could not parse headers")
                
        # Extract query parameters with multiple fallback methods
        query = {}
        query_parsing_methods = []
        
        try:
            # Method 1: Direct query property
            if hasattr(req, 'query'):
                query = parse_qs(req.query)
                query_parsing_methods.append("req.query property")
                log_debug(f"Query from req.query: {query}")
        except Exception as e:
            log_debug(f"Error parsing query from req.query: {str(e)}")
            
        try:
            # Method 2: From URL
            if hasattr(req, 'url') and '?' in req.url:
                query_str = req.url.split('?', 1)[1]
                parsed_query = parse_qs(query_str)
                if not query:
                    query = parsed_query
                query_parsing_methods.append("url splitting")
                log_debug(f"Query from URL splitting: {parsed_query}")
        except Exception as e:
            log_debug(f"Error parsing query from URL: {str(e)}")
            
        try:
            # Method 3: From body for POST requests
            if hasattr(req, 'body') and req.body:
                try:
                    body_data = json.loads(req.body)
                    if 'videoId' in body_data:
                        query['videoId'] = [body_data['videoId']]
                    if 'languages' in body_data:
                        query['languages'] = body_data['languages'] if isinstance(body_data['languages'], list) else [body_data['languages']]
                    query_parsing_methods.append("request body")
                    log_debug(f"Query from request body: {query}")
                except:
                    log_debug("Could not parse request body as JSON")
        except Exception as e:
            log_debug(f"Error accessing request body: {str(e)}")
        
        debug_info['query_parsing_methods'] = query_parsing_methods
        debug_info['parsed_query'] = query
        
        log_debug(f"Final query parameters: {query}")
        
        # Extract video ID and languages with fallbacks
        video_id = ''
        languages = ['en']
        
        if 'videoId' in query and query['videoId']:
            video_id = query['videoId'][0]
        
        if 'languages' in query and query['languages']:
            languages = query['languages']
        
        log_debug(f"Extracted videoId: '{video_id}', languages: {languages}")
        
        # Check for debug mode
        debug_mode = False
        if 'debug' in query and query['debug'] and query['debug'][0].lower() == 'true':
            debug_mode = True
            log_debug("Debug mode enabled via query parameter")
        
        # Handle missing video ID
        if not video_id:
            log_debug("Missing videoId parameter")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing videoId parameter',
                    'debug_info': debug_info if debug_mode else None,
                    'transcript': None,
                    'videoInfo': {}
                })
            }
        
        # Process the transcript request
        try:
            # Extract video ID from URL if needed
            original_video_id = video_id
            video_id = extract_video_id(video_id)
            log_debug(f"Extracted video ID: '{video_id}' from original: '{original_video_id}'")
            
            # Get transcript
            log_debug(f"Calling get_transcript for video '{video_id}'")
            result = get_transcript(video_id, languages)
            
            # Add debugging info if in debug mode
            if debug_mode and result:
                if isinstance(result, dict):
                    result['debug_info'] = debug_info
                
            # Return successful response
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result)
            }
            
        except Exception as error:
            error_details = traceback.format_exc()
            log_debug(f"Error getting transcript: {str(error)}\n{error_details}")
            
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': str(error),
                    'error_details': error_details,
                    'debug_info': debug_info,
                    'transcript': None,
                    'videoInfo': {}
                })
            }
    
    except Exception as unexpected_error:
        error_details = traceback.format_exc()
        log_debug(f"Unexpected error in handler: {str(unexpected_error)}\n{error_details}")
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': f"Unexpected error in API handler: {str(unexpected_error)}",
                'error_details': error_details,
                'debug_info': debug_info,
                'transcript': None,
                'videoInfo': {}
            })
        }
from urllib.parse import parse_qs
from get_transcript import get_transcript, extract_video_id
import json

def handler(req, res):
    # Extract query parameters
    query = parse_qs(req.query)
    
    # Get the video ID and languages
    video_id = query.get('videoId', [''])[0]
    languages = query.get('languages', ['en'])
    
    # Print debugging info
    print(f"Processing YouTube transcript request for video: {video_id}")
    print(f"Languages: {languages}")
    
    if not video_id:
        return {
            'statusCode': 400,
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
            'body': json.dumps(result),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        }
    except Exception as error:
        print(f"Error getting transcript: {error}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(error),
                'transcript': None,
                'videoInfo': {}
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        }
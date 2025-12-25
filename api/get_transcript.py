"""
YouTube Transcript API Handler for Vercel Serverless Functions.

This module provides an HTTP API endpoint that retrieves YouTube video transcripts
using the youtube-transcript-api Python library.
"""

import json
import sys
import argparse

# Dependencies are expected to be installed in the environment
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import JSONFormatter
import requests


def extract_video_id(url_or_id):
    """Extract YouTube video ID from URL or return the ID if already provided."""
    video_id = url_or_id

    if 'youtube.com' in url_or_id or 'youtu.be' in url_or_id:
        if 'youtube.com/watch' in url_or_id and 'v=' in url_or_id:
            video_id = url_or_id.split('v=')[1].split('&')[0]
        elif 'youtu.be/' in url_or_id:
            video_id = url_or_id.split('youtu.be/')[1].split('?')[0]
        elif 'youtube.com/embed/' in url_or_id:
            video_id = url_or_id.split('embed/')[1].split('?')[0]
    
    return video_id


def get_video_info(video_id):
    """Get video title and channel information."""
    try:
        url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
        response = requests.get(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout=5  # Add timeout of 5 seconds
        )
        
        if response.status_code != 200:
            return {}
            
        data = response.json()
        return {
            'title': data.get('title'),
            'channel': data.get('author_name')
        }
    except (requests.RequestException, ValueError) as error:
        print(f"Error getting video info: {error}", file=sys.stderr)
        return {}


def get_transcript(video_id, languages=None):
    """Get transcript for a YouTube video."""
    if languages is None:
        languages = ['en']
    
    result = {
        'success': False,
        'error': None,
        'transcript': None,
        'videoInfo': {}
    }
    
    try:
        # Get video info
        video_info = get_video_info(video_id)
        result['videoInfo'] = video_info
        
        # First try with direct retrieval (simpler approach)
        try:
            # This will get either manually created OR auto-generated transcript
            # Pass an array of language codes as the languages parameter
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages)
            
            # The direct get_transcript() returns a list of dictionaries - no need to use formatter
            # Just pass this directly as our transcript data
            result['transcript'] = transcript_data
            result['success'] = True
            result['languageUsed'] = languages[0]
            
            # Add basic video info
            result['videoInfo'].update({
                'language': languages[0],
                'language_code': languages[0],
                'is_generated': True,  # Assume generated since we can't tell
                'is_translatable': True  # Assume translatable
            })
            
            return result
            
        except Exception as direct_err:
            print(f"Direct transcript retrieval failed: {direct_err}", file=sys.stderr)
            # Continue to more complex approaches
        
        # If direct retrieval failed, try with the TranscriptList approach
        try:
            # Get available transcripts
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try to find transcript in requested languages
            transcript = None
            language_used = None
            
            # First try to find manual transcripts
            for lang in languages:
                try:
                    transcript = transcript_list.find_manually_created_transcript([lang])
                    language_used = lang
                    break
                except Exception as err:
                    print(f"Error finding manual transcript for {lang}: {err}", file=sys.stderr)
                    continue
            
            # If no manual transcript, try auto-generated ones
            if not transcript:
                for lang in languages:
                    try:
                        transcript = transcript_list.find_generated_transcript([lang])
                        language_used = lang
                        break
                    except Exception as err:
                        print(f"Error finding generated transcript for {lang}: {err}", file=sys.stderr)
                        continue
            
            # If still no transcript, try to get any available transcript
            if not transcript:
                try:
                    # Get all available languages
                    available_languages = []
                    for transcript_item in transcript_list:
                        available_languages.append(transcript_item.language_code)
                        
                    if available_languages:
                        # Try to get the first available transcript that matches our language preferences
                        matching_langs = [l for l in languages if l in available_languages]
                        if matching_langs:
                            transcript = transcript_list.find_transcript([matching_langs[0]])
                            language_used = matching_langs[0]
                        # If no match, just get the first available transcript
                        else:
                            transcript = transcript_list.find_transcript([available_languages[0]])
                            language_used = available_languages[0]
                            
                            # Try to translate if possible
                            if transcript.is_translatable and languages[0] in [
                                l['language_code'] for l in transcript.translation_languages
                            ]:
                                transcript = transcript.translate(languages[0])
                                language_used = languages[0]
                except Exception as err:
                    print(f"Error finding any transcript: {err}", file=sys.stderr)
            
            if transcript:
                # Fetch the transcript data
                transcript_data = transcript.fetch()
                
                # Return the transcript data
                result['transcript'] = transcript_data
                result['success'] = True
                result['languageUsed'] = language_used
                
                # Add video info
                result['videoInfo'].update({
                    'language': transcript.language,
                    'language_code': transcript.language_code,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })
            else:
                result['error'] = f"No transcript available for video {video_id} in languages: {', '.join(languages)}"
                
        except Exception as error:
            print(f"TranscriptList approach failed: {error}", file=sys.stderr)
            result['error'] = str(error)
            
    except Exception as error:
        print(f"Overall transcript retrieval failed: {error}", file=sys.stderr)
        result['error'] = str(error)
    
    return result


def main():
    """Main entry point for command line usage."""
    parser = argparse.ArgumentParser(description='Get YouTube transcript')
    parser.add_argument('--video-id', required=True, help='YouTube video ID or URL')
    parser.add_argument('--languages', nargs='+', default=['en'], help='Languages to try')
    
    args = parser.parse_args()
    video_id = extract_video_id(args.video_id)
    
    result = get_transcript(video_id, args.languages)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
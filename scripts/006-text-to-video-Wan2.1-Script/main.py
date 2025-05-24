#!/usr/bin/env python3
"""
🎬 Comput3 Text-to-Video Generator

This script generates videos from text prompts using ComfyUI through the Comput3 platform.
It uses the WanVideo model to produce high-quality videos based on text descriptions.
Now with improved video downloading and authentication similar to the React web app.
"""

import os
import argparse
import sys
import logging
import random
import base64
import time
from pathlib import Path
from typing import Optional, Dict, List, Any, Callable

from config import C3_API_KEY, DEFAULT_OUTPUT_DIR, WORKFLOW_TEMPLATE_PATH
from comput3_api import Comput3API
from comfyui_client import ComfyUIClient

# For caching videos
CACHE_DIR = os.path.join(os.getcwd(), "cache")

def parse_arguments():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(description="Generate videos from text prompts using Comput3")
    parser.add_argument("--prompt", "-p", type=str, required=True, 
                        help="Text prompt describing the video to generate")
    parser.add_argument("--negative-prompt", "-n", type=str, default="poor quality, blurry, pixelated, low resolution, watermark, signature, text, letters, words", 
                        help="Negative prompt to guide the generation away from unwanted content")
    parser.add_argument("--width", "-W", type=int, default=832,
                        help="Width of the generated video (default: 832)")
    parser.add_argument("--height", "-H", type=int, default=480,
                        help="Height of the generated video (default: 480)")
    parser.add_argument("--frames", "-f", type=int, default=16,
                        help="Number of frames to generate (default: 16)")
    parser.add_argument("--fps", type=int, default=24,
                        help="Frames per second for the output video (default: 24)")
    parser.add_argument("--steps", "-s", type=int, default=25,
                        help="Number of sampling steps (default: 25)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducible results (default: random)")
    parser.add_argument("--output-dir", "-o", type=str, default=DEFAULT_OUTPUT_DIR, 
                        help=f"Directory to save output files (default: {DEFAULT_OUTPUT_DIR})")
    parser.add_argument("--timeout", "-t", type=int, default=120,
                        help="Timeout in minutes (default: 120)")
    parser.add_argument("--cache", action="store_true", 
                        help="Cache videos for faster access in case of network issues")
    parser.add_argument("--cache-dir", type=str, default=CACHE_DIR,
                        help=f"Directory to store cached videos (default: {CACHE_DIR})")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    return parser.parse_args()

def setup_logging(verbose: bool = False):
    """Set up logging configuration"""
    log_level = logging.DEBUG if verbose else logging.INFO
    
    # Ensure output directory exists
    os.makedirs(DEFAULT_OUTPUT_DIR, exist_ok=True)
    log_file = os.path.join(DEFAULT_OUTPUT_DIR, "text_to_video.log")
    
    # Create a custom filter for console output
    class ConsoleFilter(logging.Filter):
        def filter(self, record):
            # If the record has the 'console' attribute and it's False, don't show on console
            return not (hasattr(record, 'console') and record.console is False)
    
    # Create handlers
    file_handler = logging.FileHandler(log_file)
    console_handler = logging.StreamHandler()
    
    # Add filter to console handler only
    console_handler.addFilter(ConsoleFilter())
    
    # Configure logging
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[file_handler, console_handler]
    )
    
    logging.info(f"📝 Logging to: {log_file}")

def check_requirements():
    """Check if all requirements are met"""
    # Check for API key
    if not C3_API_KEY:
        logging.error("🔑 C3 API key not found. Please set the C3_API_KEY environment variable or add it to .env file.")
        logging.error("🌐 Get your API key from https://launch.comput3.ai")
        return False
    
    # Check if workflow template exists
    if not os.path.exists(WORKFLOW_TEMPLATE_PATH):
        logging.error(f"🔍 Workflow template not found at {WORKFLOW_TEMPLATE_PATH}")
        return False
    
    return True

def print_status_update(status: str):
    """Print a status update to the console with a progress bar"""
    # Get terminal width
    try:
        import shutil
        width = shutil.get_terminal_size().columns
    except:
        width = 80
    
    # Parse the status to extract percentage and message
    parts = status.split(" - ", 1)
    percentage = parts[0] if parts else "??%"
    message = parts[1] if len(parts) > 1 else "Processing"
    
    # Determine if we're in queue or processing
    is_queue = "Queued:" in message
    
    # Create a progress bar
    bar_length = min(40, width - 30)  # Ensure the bar fits in the terminal
    
    # For queued status, use a different style of progress bar
    if is_queue:
        # For queued items, show a waiting animation
        spinner = '⣾⣽⣻⢿⡿⣟⣯⣷'[int(time.time() * 3) % 8]
        bar = spinner * 3
    else:
        try:
            # Extract percentage value
            pct_value = int(percentage.rstrip('%'))
        except ValueError:
            pct_value = 0
            
        filled_length = int(bar_length * pct_value / 100)
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
    
    # ANSI escape sequences for clearing line
    CURSOR_UP_ONE = '\033[1A'
    ERASE_LINE = '\033[2K'
    
    # Move cursor to beginning of line and clear it
    print(f"\r{ERASE_LINE}", end="")
    
    # For queued status, show queue position with spinner
    if is_queue:
        print(f"\r⌛ {bar} {message}", end="", flush=True)
        # Also log to file for reference but not to console
        logging.info(f"Queue status: {message}", extra={"console": False})
    else:
        # Show progress bar with percentage
        print(f"\r🔄 [{bar}] {percentage} - {message}", end="", flush=True)
        
        # Log significant progress milestones to file
        if "Complete" in message:
            # Complete is handled in the client
            pass
        elif "Completed:" in message:
            logging.info(f"Progress: {message}", extra={"console": False})
        elif "error" in message.lower():
            logging.error(f"Error: {message}", extra={"console": False})

def store_video_as_base64(video_path: str, cache_dir: str, filename: str) -> Optional[str]:
    """Store a video as base64 for caching"""
    try:
        os.makedirs(cache_dir, exist_ok=True)
        
        # Read the video file
        with open(video_path, 'rb') as f:
            video_data = f.read()
        
        # Detect mime type (naive approach)
        ext = Path(video_path).suffix.lower()
        mime_type = "video/mp4" if ext == '.mp4' else "video/webm"
        
        # Convert to base64
        base64_data = base64.b64encode(video_data).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        # Save to cache file
        cache_file = os.path.join(cache_dir, f"{filename}.b64")
        with open(cache_file, 'w') as f:
            f.write(data_url)
        
        logging.info(f"🗄️ Stored video as base64 in: {cache_file}")
        return cache_file
        
    except Exception as e:
        logging.error(f"❌ Error storing video as base64: {str(e)}")
        return None

def load_video_from_base64(cache_dir: str, filename: str) -> Optional[str]:
    """Load a cached base64 video"""
    cache_file = os.path.join(cache_dir, f"{filename}.b64")
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                return f.read()
        except Exception as e:
            logging.error(f"❌ Error loading cached video: {str(e)}")
    
    return None

def main():
    """Main entry point"""
    # Parse arguments
    args = parse_arguments()
    setup_logging(args.verbose)
    
    print("=" * 60)
    print("🎬 Comput3 Text-to-Video Generator")
    print("=" * 60)
    
    # Check requirements
    if not check_requirements():
        return 1
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Create cache directory if caching is enabled
    if args.cache:
        os.makedirs(args.cache_dir, exist_ok=True)
    
    # Create debug directory for workflow payloads
    debug_dir = os.path.join(os.getcwd(), "debug")
    os.makedirs(debug_dir, exist_ok=True)
    
    # Generate a random seed if not provided
    seed = args.seed if args.seed is not None else random.randint(0, 2**32 - 1)
    logging.info(f"🎲 Using seed: {seed}")
    
    # Initialize Comput3 API client
    logging.info("🚀 Initializing Comput3 API client...")
    c3_client = Comput3API(C3_API_KEY)
    
    # Get ComfyUI URL from running instance
    comfyui_url = c3_client.get_comfyui_url()
    if not comfyui_url:
        logging.error("❌ No running media instance found.")
        logging.error("💡 Please launch a media instance first at https://launch.comput3.ai")
        return 1
    
    logging.info(f"🖥️ Using ComfyUI instance at: {comfyui_url}")
    
    # Initialize ComfyUI client
    comfy_client = ComfyUIClient(comfyui_url, C3_API_KEY)
    
    # Step 1: Load and update workflow
    logging.info("📋 Loading workflow template...")
    try:
        workflow = comfy_client.load_workflow(WORKFLOW_TEMPLATE_PATH)
    except Exception as e:
        logging.error(f"❌ Failed to load workflow template: {str(e)}")
        return 1
    
    # Update workflow with prompts and parameters
    logging.info("🔄 Updating workflow with inputs...")
    updated_workflow = comfy_client.update_text_to_video_workflow(
        workflow,
        positive_prompt=args.prompt,
        negative_prompt=args.negative_prompt,
        width=args.width,
        height=args.height,
        frames=args.frames,
        fps=args.fps,
        seed=seed,
        steps=args.steps
    )
    
    # Step 2: Queue workflow
    logging.info("🚀 Queueing workflow...")
    prompt_id = comfy_client.queue_workflow(updated_workflow)
    
    if not prompt_id:
        logging.error("❌ Failed to queue workflow. Exiting.")
        return 1
    
    logging.info(f"✅ Workflow queued with ID: {prompt_id}")
    
    # Log initial queue status
    queue_info = comfy_client.get_queue_status(prompt_id)
    queue_position = queue_info.get("queue_position")
    queue_size = queue_info.get("queue_size", 0)
    
    if queue_position is not None and queue_position > 0:
        logging.info(f"⌛ Initial queue position: {queue_position+1} of {queue_size}")
        print_status_update(f"0% - Queued: Position {queue_position+1} of {queue_size}")
    else:
        logging.info("🚀 Prompt started executing immediately")
        print_status_update("0% - Processing")
    
    # Step 3: Wait for workflow to complete
    logging.info(f"⏳ Waiting for workflow to complete (max {args.timeout} minutes)...")
    if not comfy_client.wait_for_workflow_completion(
        prompt_id, 
        args.timeout, 
        status_callback=print_status_update
    ):
        print()  # Add a newline after status updates
        logging.error("❌ Workflow processing failed or timed out.")
        logging.error("💡 Common reasons for failure:")
        logging.error("   • Server resources insufficient for processing")
        logging.error("   • Complex prompt requiring more processing time")
        logging.error("   • Server timeout or network issues")
        return 1
    
    print()  # Add a newline after status updates
    logging.info("✅ Workflow completed successfully. Retrieving video...")
    
    # Step 4: Get output files
    logging.info("🔍 Getting output files...")
    output_files = comfy_client.get_output_files(prompt_id)
    
    if not output_files:
        logging.error("❌ No output files found. Exiting.")
        return 1
    
    # Get videos from outputs
    videos = [f for f in output_files if f.get("filename", "").lower().endswith(('.mp4', '.avi', '.mov', '.webm'))]
    
    if not videos:
        logging.error("❌ No videos found in output.")
        return 1
    
    # Step 5: Download output files with robustness
    logging.info(f"📥 Downloading output videos to: {args.output_dir}")
    
    # VHS_VideoCombine node output is typically in node 30
    node_30_videos = [v for v in videos if v["node_id"] == "30"]
    
    if node_30_videos:
        # Download the most recent video (last in the list)
        latest_video = node_30_videos[-1]
        filename = latest_video["filename"]
        subfolder = latest_video["subfolder"]
        
        logging.info(f"📹 Downloading video: {filename}")
        
        # Try to download the video with format info if available
        format_type = latest_video.get("format", "video/h264-mp4")
        frame_rate = latest_video.get("frame_rate", 24.0)
        
        output_path = comfy_client.download_file(
            filename, 
            args.output_dir,
            subfolder,
            format_type,
            frame_rate
        )
        
        if output_path:
            # Successful download
            print("\n" + "=" * 60)
            print(f"✨ Video generation complete! ✨")
            print(f"📁 Output saved to: {output_path}")
            
            # If caching is enabled, also store as base64
            if args.cache:
                cache_path = store_video_as_base64(output_path, args.cache_dir, filename)
                if cache_path:
                    print(f"🗄️ Video also cached for future use")
            
            # Generate direct URLs for the video
            video_url = comfy_client.get_video_url(filename, subfolder)
            
            print("\n📋 Video Details:")
            print(f"  • Prompt: {args.prompt}")
            print(f"  • Negative Prompt: {args.negative_prompt}")
            print(f"  • Size: {args.width}x{args.height}")
            print(f"  • Frames: {args.frames}, FPS: {args.fps}")
            print(f"  • Steps: {args.steps}")
            print(f"  • Seed: {seed}")
            print("\n🔗 Direct Video URL:")
            print(f"  • URL: {video_url}")
            print("=" * 60)
        else:
            logging.error("❌ Failed to download video.")
            
            # Try to load from cache if available
            if args.cache:
                cached_video = load_video_from_base64(args.cache_dir, filename)
                if cached_video:
                    logging.info("🗄️ Found cached version of the video")
                    cache_file_path = os.path.join(args.cache_dir, f"{filename}.b64")
                    print("\n" + "=" * 60)
                    print(f"⚠️ Failed to download video, but found cached version")
                    print(f"📁 Cached video data: {cache_file_path}")
                    print("=" * 60)
                    return 0
            
            return 1
    else:
        # If no videos from node 30, try to download any videos found
        success = False
        for video in videos:
            output_path = comfy_client.download_file(
                video["filename"],
                args.output_dir,
                video["subfolder"]
            )
            if output_path:
                success = True
                
                # If caching is enabled, also store as base64
                if args.cache:
                    store_video_as_base64(output_path, args.cache_dir, video["filename"])
                
                print("\n" + "=" * 60)
                print(f"✨ Video generation complete! ✨")
                print(f"📁 Output saved to: {output_path}")
                
                # Generate direct URL for the video
                video_url = comfy_client.get_video_url(video["filename"], video["subfolder"])
                
                print("\n📋 Video Details:")
                print(f"  • Prompt: {args.prompt}")
                print(f"  • Negative Prompt: {args.negative_prompt}")
                print(f"  • Size: {args.width}x{args.height}")
                print(f"  • Frames: {args.frames}, FPS: {args.fps}")
                print(f"  • Steps: {args.steps}")
                print(f"  • Seed: {seed}")
                print("\n🔗 Direct Video URL:")
                print(f"  • URL: {video_url}")
                print("=" * 60)
                break
        
        if not success:
            logging.error("❌ Failed to download any videos.")
            return 1
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Operation canceled by user")
        sys.exit(1)
    except Exception as e:
        logging.exception(f"❌ Unhandled exception: {str(e)}")
        sys.exit(1) 
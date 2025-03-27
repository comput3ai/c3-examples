import os
import requests
import json
import time
import logging
import uuid
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image
from mutagen import File

logger = logging.getLogger(__name__)

class ComfyUIClient:
    """Client for interacting with ComfyUI API through Comput3"""
    
    def __init__(self, server_url: str, api_key: str):
        """Initialize with ComfyUI server URL and Comput3 API key"""
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.client_id = self._get_client_id()
        logger.info(f"🔌 Initialized ComfyUIClient with server URL: {self.server_url}")
    
    def _get_client_id(self) -> str:
        """Get a client ID from the server or generate one if the endpoint doesn't exist"""
        try:
            # Try to get a client ID from the server
            response = requests.get(
                f"{self.server_url}/prompt/get_client_id",
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()["client_id"]
            
            # If the endpoint doesn't exist (404), generate our own client ID
            return str(uuid.uuid4())
        except Exception as e:
            logger.warning(f"⚠️ Failed to get client ID: {str(e)}")
            return str(uuid.uuid4())
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with Comput3 API key"""
        return {
            "X-C3-API-KEY": self.api_key
        }
    
    def upload_file(self, file_path: str, file_type: str = "input") -> Optional[str]:
        """Upload a file to the ComfyUI server"""
        if not os.path.exists(file_path):
            logger.error(f"❌ File not found: {file_path}")
            return None
        
        filename = os.path.basename(file_path)
        logger.info(f"📤 Uploading file: {filename}")
        
        # Always use the /upload/image endpoint since there's no /upload/audio
        upload_url = f"{self.server_url}/upload/image"
        
        try:
            with open(file_path, 'rb') as f:
                files = {'image': (filename, f)}
                data = {'type': file_type}
                
                response = requests.post(upload_url, files=files, data=data, headers=self._get_headers())
                
                if response.status_code == 200:
                    response_data = response.json()
                    logger.info(f"✅ File uploaded successfully: {response_data.get('name')}")
                    return response_data.get('name')
                else:
                    logger.error(f"❌ Upload failed: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            logger.error(f"❌ Exception during upload: {str(e)}")
            return None
    
    def load_workflow(self, workflow_path: str) -> Dict[str, Any]:
        """Load a workflow from a JSON file"""
        try:
            with open(workflow_path, 'r') as f:
                workflow = json.load(f)
            return workflow
        except Exception as e:
            logger.error(f"❌ Error loading workflow from {workflow_path}: {str(e)}")
            raise
    
    def update_workflow(self, workflow: Dict[str, Any], image_name: str, audio_path: str) -> Dict[str, Any]:
        """Update the workflow with image and audio information"""
        # Make a copy of the workflow to avoid modifying the original
        updated_workflow = json.loads(json.dumps(workflow))
        
        # Get audio duration
        audio_duration = self.get_audio_duration(audio_path)
        
        # Get the actual image path from the uploaded image name
        # First check if the image was uploaded from a local path
        original_image_path = audio_path.replace(os.path.basename(audio_path), image_name)
        
        # If original_image_path doesn't exist, try using the image_name directly
        if not os.path.exists(original_image_path):
            # Try checking in the input directory
            input_dir = os.path.join(os.getcwd(), "input")
            if os.path.exists(input_dir):
                possible_path = os.path.join(input_dir, image_name)
                if os.path.exists(possible_path):
                    original_image_path = possible_path
        
        # Get optimal dimensions for the image if the file exists
        if os.path.exists(original_image_path):
            optimal_width, optimal_height = self.get_optimal_dimensions(original_image_path)
            logger.info(f"🔍 Determined optimal dimensions for image: {optimal_width}x{optimal_height}")
        else:
            # Default dimensions if we can't find the image
            optimal_width, optimal_height = 576, 576
            logger.warning(f"⚠️ Could not find original image to determine dimensions, using default: {optimal_width}x{optimal_height}")
        
        # Update the workflow nodes
        for node_id, node in updated_workflow.items():
            # Update LoadImage node
            if node.get("class_type") == "LoadImage":
                node["inputs"]["image"] = image_name
                logger.info(f"🖼️ Updated LoadImage node with image: {image_name}")
            
            # Update Image Resize node
            if node.get("class_type") == "Image Resize":
                # Save original dimensions for logging
                original_width = node["inputs"].get("resize_width", 576)
                original_height = node["inputs"].get("resize_height", 576)
                
                # Update with optimal dimensions
                node["inputs"]["resize_width"] = optimal_width
                node["inputs"]["resize_height"] = optimal_height
                
                logger.info(f"📐 Updated Image Resize dimensions from {original_width}x{original_height} to {optimal_width}x{optimal_height}")
            
            # Update the LoadAudio or VHS_LoadAudio node with the audio path
            if node.get("class_type") in ["LoadAudio", "VHS_LoadAudio"]:
                # Handle different node structures
                if "audio" in node["inputs"]:
                    node["inputs"]["audio"] = os.path.basename(audio_path)
                elif "audio_file" in node["inputs"]:
                    node["inputs"]["audio_file"] = f"input/{os.path.basename(audio_path)}"
                logger.info(f"🔊 Updated audio node with: {os.path.basename(audio_path)}")
            
            # Update the SONIC_PreData node with the duration
            if node.get("class_type") == "SONIC_PreData" and "duration" in node["inputs"]:
                node["inputs"]["duration"] = audio_duration
                logger.info(f"⏱️ Set animation duration to {audio_duration} seconds")
            
            # Specifically target node 33 (SONIC_PreData) if it exists
            if node_id == "33" and node.get("class_type") == "SONIC_PreData":
                node["inputs"]["duration"] = audio_duration
                logger.info(f"⏱️ Set node 33 (SONIC_PreData) duration to {audio_duration} seconds")
        
        return updated_workflow
    
    def get_audio_duration(self, audio_path: str) -> int:
        """
        Get the duration of an audio file in seconds, with proper rounding
        
        The duration is calculated by:
        1. Reading the actual audio file duration
        2. Rounding UP to the nearest second (e.g. 3.1s -> 4s)
        3. Adding a 1-second safety margin
        
        This ensures the animation will cover the entire audio without cutting off.
        """
        try:
            audio = File(audio_path)
            if audio is None:
                logger.warning(f"⚠️ Could not load audio file: {audio_path}")
                return 5  # Default fallback duration
            
            # Get the raw duration in seconds
            raw_duration = audio.info.length
            
            # Round up to the next second (math.ceil equivalent)
            rounded_duration = int(raw_duration) + (1 if raw_duration % 1 > 0 else 0)
            
            # Add 1 second safety margin
            final_duration = rounded_duration + 1
            
            logger.info(f"⏱️ Audio duration: {raw_duration:.2f}s → {final_duration}s (rounded up + safety margin)")
            return final_duration
        except Exception as e:
            logger.error(f"❌ Error getting audio duration: {e}")
            return 5  # Default duration if we can't read the file
    
    def get_optimal_dimensions(self, image_path: str) -> Tuple[int, int]:
        """Determine optimal dimensions for the image based on aspect ratio"""
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                aspect_ratio = width / height
                logger.info(f"📐 Original image dimensions: {width}x{height}, aspect ratio: {aspect_ratio:.2f}")

                # Define target formats
                LANDSCAPE = (1024, 576)  # 16:9
                PORTRAIT = (576, 1024)   # 9:16
                SQUARE = (576, 576)      # 1:1

                # Calculate differences from target ratios
                landscape_diff = abs(aspect_ratio - (16/9))
                portrait_diff = abs(aspect_ratio - (9/16))
                square_diff = abs(aspect_ratio - 1)

                if landscape_diff <= min(portrait_diff, square_diff):
                    logger.info("🖼️ Selected landscape format (16:9)")
                    return LANDSCAPE
                elif portrait_diff <= min(landscape_diff, square_diff):
                    logger.info("🖼️ Selected portrait format (9:16)")
                    return PORTRAIT
                else:
                    logger.info("🖼️ Selected square format (1:1)")
                    return SQUARE
        except Exception as e:
            logger.error(f"❌ Error determining optimal dimensions: {e}")
            return (576, 576)  # Default to square if we can't process the image
    
    def queue_workflow(self, workflow: Dict[str, Any]) -> Optional[str]:
        """Queue a workflow for execution"""
        try:
            logger.info("🚀 Queueing workflow")
            
            # Structure the payload
            payload = {
                "prompt": workflow,
                "client_id": self.client_id
            }
            
            response = requests.post(
                f"{self.server_url}/prompt",
                json=payload,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                prompt_id = result.get("prompt_id")
                logger.info(f"✅ Workflow queued with ID: {prompt_id}")
                return prompt_id
            else:
                logger.error(f"❌ Failed to queue workflow: {response.status_code} - {response.text}")
                return None
        
        except Exception as e:
            logger.error(f"❌ Error queueing workflow: {str(e)}")
            return None
    
    def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get execution history for a prompt"""
        try:
            response = requests.get(
                f"{self.server_url}/history/{prompt_id}",
                headers=self._get_headers()
            )
            if response.status_code != 200:
                return None
            
            history_data = response.json()
            
            # Handle both direct and nested response formats
            if prompt_id in history_data:
                return history_data[prompt_id]
            
            return history_data
        except Exception as e:
            logger.error(f"❌ Error getting history: {e}")
            return None
    
    def check_workflow_status(self, prompt_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Check if a workflow has completed or encountered an error
        Returns: (is_complete, history_data, error_message)
        """
        try:
            # Get history data
            history_data = self.get_history(prompt_id)
            
            if not history_data:
                return False, None, None
            
            # Check for error status
            if "status" in history_data:
                status = history_data["status"]
                
                # Check if there's an error
                if status.get("status_str") == "error":
                    error_message = "Workflow execution failed"
                    
                    # Try to get detailed error information
                    for msg in status.get("messages", []):
                        if msg[0] == "execution_error" and len(msg) > 1:
                            error_details = msg[1]
                            node_id = error_details.get("node_id", "unknown")
                            node_type = error_details.get("node_type", "unknown")
                            exception = error_details.get("exception_message", "Unknown error")
                            error_message = f"Error in node {node_id} ({node_type}): {exception}"
                    
                    logger.error(f"❌ {error_message}")
                    return False, history_data, error_message
                
                # Check for successful completion
                if status.get("completed") == True:
                    return True, history_data, None
            
            # Check if workflow has outputs
            if "outputs" not in history_data:
                return False, history_data, None
            
            # Check for VHS_VideoCombine output in node 13 (common in avatar generation workflows)
            node_13_output = history_data["outputs"].get("13", {})
            has_node_13_videos = False
            
            # Check for videos in 'gifs' field (primary location for VHS_VideoCombine)
            if "gifs" in node_13_output and node_13_output["gifs"]:
                has_node_13_videos = True
            
            # Check for videos in 'videos' field (alternative location)
            if "videos" in node_13_output and node_13_output["videos"]:
                has_node_13_videos = True
            
            # Check if workflow is still in a queue
            queue_response = requests.get(
                f"{self.server_url}/queue",
                headers=self._get_headers()
            )
            if queue_response.status_code == 200:
                queue_data = queue_response.json()
                
                # Check if our prompt is in the queue
                running_prompts = [item.get("prompt_id") for item in queue_data.get("queue_running", [])]
                pending_prompts = [item.get("prompt_id") for item in queue_data.get("queue_pending", [])]
                
                if prompt_id in running_prompts or prompt_id in pending_prompts:
                    return False, history_data, None
                
                # If we have videos from node 13 and we're not in any queue, consider it complete
                if has_node_13_videos:
                    return True, history_data, None
            
            # Final determination based on available information
            if has_node_13_videos or history_data.get("executed", False):
                return True, history_data, None
            
            return False, history_data, None
        
        except Exception as e:
            logger.error(f"❌ Error checking workflow status: {str(e)}")
            return False, None, str(e)
    
    def get_output_files(self, prompt_id: str) -> List[Dict[str, Any]]:
        """Get output files from a completed workflow"""
        history_data = self.get_history(prompt_id)
        
        if not history_data or "outputs" not in history_data:
            return []
        
        outputs = []
        
        # Extract node outputs
        for node_id, node_output in history_data["outputs"].items():
            # Check for VHS_VideoCombine node (common node id is 13)
            if "gifs" in node_output:
                # Handle 'gifs' outputs (often used for videos)
                for gif_info in node_output["gifs"]:
                    file_info = {
                        "node_id": node_id,
                        "type": "video",
                        "filename": gif_info.get("filename", ""),
                        "subfolder": gif_info.get("subfolder", ""),
                        "fullpath": gif_info.get("fullpath", "")
                    }
                    outputs.append(file_info)
                    logger.info(f"📹 Found video: {file_info['filename']}")
            
            # Check for 'videos' field in any node
            if "videos" in node_output:
                for video_info in node_output["videos"]:
                    file_info = {
                        "node_id": node_id,
                        "type": "video",
                        "filename": video_info.get("filename", ""),
                        "subfolder": video_info.get("subfolder", ""),
                        "fullpath": video_info.get("fullpath", "")
                    }
                    outputs.append(file_info)
                    logger.info(f"📹 Found video: {file_info['filename']}")
        
        return outputs
    
    def download_file(self, filename: str, output_dir: str, subfolder: str = "") -> Optional[str]:
        """Download a file from the server"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Construct the URL
        params = {"filename": filename}
        
        if subfolder:
            params["subfolder"] = subfolder
        
        import urllib.parse
        url_with_params = f"{self.server_url}/view?{urllib.parse.urlencode(params)}"
        logger.info(f"📥 Downloading: {filename}")
        
        try:
            response = requests.get(
                url_with_params,
                stream=True,
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Download failed: {response.status_code}")
                return None
            
            # Save the file to the output directory
            output_path = os.path.join(output_dir, filename)
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"💾 File saved to: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"❌ Error downloading file: {str(e)}")
            return None
    
    def wait_for_workflow_completion(self, prompt_id: str, timeout_minutes: int = 25) -> bool:
        """Wait for a workflow to complete, with progress updates"""
        logger.info(f"⏳ Waiting for workflow to complete (timeout: {timeout_minutes} minutes)")
        
        start_time = time.time()
        timeout_seconds = timeout_minutes * 60
        
        # Give the workflow a little time to start
        logger.info(f"⏱️ Initial wait period (5 seconds)...")
        time.sleep(5)
        
        attempt = 1
        while time.time() - start_time < timeout_seconds:
            elapsed_minutes = (time.time() - start_time) / 60
            logger.info(f"🔄 Check attempt #{attempt} (elapsed: {elapsed_minutes:.1f} minutes)")
            
            is_complete, _, error_message = self.check_workflow_status(prompt_id)
            
            if error_message:
                logger.error(f"❌ Workflow failed with error: {error_message}")
                return False
            
            if is_complete:
                logger.info("✅ Workflow completed successfully!")
                return True
            
            # Wait before checking again
            remaining_time = int(timeout_seconds - (time.time() - start_time))
            logger.info(f"⏳ Still in progress... Checking again in 30s (timeout in {remaining_time}s)")
            
            time.sleep(30)
            attempt += 1
        
        logger.error(f"⏰ Workflow did not complete within timeout of {timeout_minutes} minutes")
        return False 
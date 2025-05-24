import os
import requests
import json
import time
import logging
import uuid
import base64
from urllib.parse import urlencode, urlparse
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

class ComfyUIClient:
    """Client for interacting with ComfyUI API through Comput3"""
    
    def __init__(self, server_url: str, api_key: str):
        """Initialize with ComfyUI server URL and Comput3 API key"""
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.client_id = self._get_client_id()
        self.session = self._create_session()
        logger.info(f"🔌 Initialized ComfyUIClient with server URL: {self.server_url}")
    
    def _create_session(self) -> requests.Session:
        """Create a session with persistent cookies for authentication"""
        session = requests.Session()
        session.headers.update(self._get_headers())
        
        # Set API key as cookie for authentication
        session.cookies.set("c3_api_key", self.api_key, domain=urlparse(self.server_url).netloc)
        
        return session
    
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
            "X-C3-API-KEY": self.api_key,
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        }
    
    def _get_image_headers(self) -> Dict[str, str]:
        """Get headers specifically for image requests"""
        return {
            "X-C3-API-KEY": self.api_key,
            "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        }
    
    def load_workflow(self, workflow_path: str) -> Dict[str, Any]:
        """Load a workflow from a JSON file"""
        try:
            with open(workflow_path, 'r') as f:
                workflow = json.load(f)
            return workflow
        except Exception as e:
            logger.error(f"❌ Error loading workflow from {workflow_path}: {str(e)}")
            raise
    
    def validate_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that a workflow has the required structure and nodes"""
        errors = []
        warnings = []
        
        if not workflow:
            errors.append('Workflow is null or undefined')
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        if not isinstance(workflow, dict):
            errors.append(f'Workflow is not an object: {type(workflow)}')
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        # Check if workflow has nodes array
        if "nodes" not in workflow:
            errors.append('Workflow is missing "nodes" property')
        elif not isinstance(workflow["nodes"], list):
            errors.append(f'Workflow "nodes" is not an array: {type(workflow["nodes"])}')
        elif not workflow["nodes"]:
            errors.append('Workflow "nodes" array is empty')
        
        # Basic validation of node types
        if "nodes" in workflow and isinstance(workflow["nodes"], list):
            required_node_types = {
                "positive_prompt": False,
                "negative_prompt": False,
                "sampler": False,
                "latent_image": False
            }
            
            for node in workflow["nodes"]:
                if node["type"] == "CLIPTextEncode" and node.get("title") == "Positive Prompt":
                    required_node_types["positive_prompt"] = True
                elif node["type"] == "CLIPTextEncode" and node.get("title") == "Negative Prompt":
                    required_node_types["negative_prompt"] = True
                elif node["type"] in ["KSampler", "SONICSampler"]:
                    required_node_types["sampler"] = True
                elif node["type"] in ["EmptySD3LatentImage", "EmptyLatentImage"]:
                    required_node_types["latent_image"] = True
            
            # Check for required nodes
            for node_type, found in required_node_types.items():
                if not found:
                    errors.append(f'Missing required node type: {node_type}')
        
        validation_result = {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
        
        if validation_result["valid"]:
            logger.info("✅ Workflow validation passed")
            if warnings:
                logger.warning("⚠️ Validation warnings: " + ", ".join(warnings))
        else:
            logger.error(f"❌ Workflow validation failed: {', '.join(errors)}")
        
        return validation_result
    
    def update_text_to_image_workflow(self, workflow: Dict[str, Any], 
                                      positive_prompt: str, 
                                      negative_prompt: str, 
                                      width: int = 1024, 
                                      height: int = 1024, 
                                      seed: int = None, 
                                      steps: int = 35) -> Dict[str, Any]:
        """Update the workflow with text-to-image parameters"""
        # Validate input workflow
        validation = self.validate_workflow(workflow)
        if not validation["valid"]:
            error_message = f"Invalid workflow: {', '.join(validation['errors'])}"
            logger.error(f"❌ {error_message}")
            raise ValueError(error_message)
        
        logger.info(f"Updating workflow with parameters: prompt={positive_prompt[:20]}..., "
                   f"negativePrompt={negative_prompt[:20]}..., width={width}, height={height}, "
                   f"seed={seed}, steps={steps}")
        
        # Make a copy of the workflow to avoid modifying the original
        updated_workflow = json.loads(json.dumps(workflow))
        
        # Log diagnostic info
        logger.info(f"Workflow contains {len(updated_workflow['nodes'])} nodes")
        
        # Track if we found and updated each required node
        nodes_updated = {
            "positive_prompt": False,
            "negative_prompt": False,
            "sampler": False,
            "latent": False
        }
        
        # Find and update nodes
        for node in updated_workflow["nodes"]:
            # Update positive prompt
            if node["type"] == "CLIPTextEncode" and node.get("title") == "Positive Prompt":
                if "widgets_values" in node:
                    node["widgets_values"][0] = positive_prompt
                    logger.info("✅ Updated positive prompt")
                    nodes_updated["positive_prompt"] = True
            
            # Update negative prompt
            elif node["type"] == "CLIPTextEncode" and node.get("title") == "Negative Prompt":
                if "widgets_values" in node:
                    node["widgets_values"][0] = negative_prompt
                    logger.info("✅ Updated negative prompt")
                    nodes_updated["negative_prompt"] = True
            
            # Update KSampler settings
            elif node["type"] == "KSampler":
                if "widgets_values" in node:
                    # Update seed if provided
                    if seed is not None and len(node["widgets_values"]) > 0:
                        node["widgets_values"][0] = seed
                        logger.info(f"⚙️ Updated KSampler seed to {seed}")
                    
                    # Update steps
                    if len(node["widgets_values"]) > 2:
                        node["widgets_values"][2] = steps
                        logger.info(f"⚙️ Updated KSampler steps to {steps}")
                    
                    nodes_updated["sampler"] = True
            
            # Update latent image dimensions
            elif node["type"] in ["EmptyLatentImage", "EmptySD3LatentImage"]:
                if "widgets_values" in node:
                    if len(node["widgets_values"]) >= 2:
                        node["widgets_values"][0] = width
                        node["widgets_values"][1] = height
                        logger.info(f"📐 Updated image dimensions to {width}x{height}")
                        nodes_updated["latent"] = True
            
            # Update SaveImage node if present
            elif node["type"] == "SaveImage" and "widgets_values" in node:
                # Generate a unique filename based on the prompt and timestamp
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                prompt_slug = ''.join(c if c.isalnum() else '_' for c in positive_prompt[:20])
                filename = f"{prompt_slug}_{timestamp}"
                
                # Update the filename widget value
                if node["widgets_values"]:
                    node["widgets_values"][0] = filename
                    logger.info(f"💾 Updated save filename to: {filename}")
        
        # Log whether all required nodes were found and updated
        logger.info(f"Required nodes updated: positive={nodes_updated['positive_prompt']}, "
                   f"negative={nodes_updated['negative_prompt']}, "
                   f"sampler={nodes_updated['sampler']}, "
                   f"latent={nodes_updated['latent']}")
        
        return updated_workflow
    
    def queue_workflow(self, workflow: Dict[str, Any]) -> Optional[str]:
        """Queue a workflow for execution"""
        try:
            # Removed duplicate log message - main.py already logs this
            
            # Transform workflow to API format
            api_prompt = self._transform_workflow_to_api_format(workflow)
            
            # Create the final payload
            payload = {
                "prompt": api_prompt,
                "client_id": self.client_id
            }
            
            # Log the payload structure for debugging
            logger.info(f"Sending payload with {len(api_prompt)} nodes")
            
            response = self.session.post(
                f"{self.server_url}/prompt",
                json=payload
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
    
    def _transform_workflow_to_api_format(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a visual workflow format to the API format"""
        # If it's already in API format, return as is
        if not workflow.get("nodes"):
            if workflow.get("prompt"):
                return workflow["prompt"]
            return workflow
        
        api_prompt = {}
        
        # Process each node
        for node in workflow["nodes"]:
            # Skip Note nodes as they're not supported by the API
            if node["type"] == "Note":
                continue
            
            # Create the node configuration
            node_config = {
                "class_type": node.get("class_type") or node["type"],
                "inputs": {},
            }
            
            # Add title if present
            if node.get("title"):
                node_config["_meta"] = {"title": node["title"]}
            
            # Process inputs from both connections and widget values
            self._process_node_inputs(node, node_config, workflow)
            
            # Add to API prompt
            api_prompt[str(node["id"])] = node_config
        
        return api_prompt
    
    def _process_node_inputs(self, node: Dict[str, Any], node_config: Dict[str, Any], workflow: Dict[str, Any]):
        """Process node inputs from both connections and widget values"""
        # Process widget values
        if "widgets_values" in node:
            widget_values = node["widgets_values"]
            
            # Handle different node types
            if node["type"] == "CLIPTextEncode":
                if node.get("title") == "Positive Prompt":
                    node_config["inputs"]["text"] = widget_values[0] if widget_values else ""
                elif node.get("title") == "Negative Prompt":
                    node_config["inputs"]["text"] = widget_values[0] if widget_values else ""
            
            elif node["type"] == "KSampler":
                if len(widget_values) >= 7:
                    node_config["inputs"].update({
                        "seed": widget_values[0],
                        "steps": widget_values[2],
                        "cfg": widget_values[3],
                        "sampler_name": widget_values[4],
                        "scheduler": widget_values[5],
                        "denoise": widget_values[6]
                    })
            
            elif node["type"] in ["EmptyLatentImage", "EmptySD3LatentImage"]:
                if len(widget_values) >= 3:
                    node_config["inputs"].update({
                        "width": widget_values[0],
                        "height": widget_values[1],
                        "batch_size": widget_values[2]
                    })
            
            elif node["type"] == "SaveImage":
                if widget_values:
                    node_config["inputs"]["filename_prefix"] = widget_values[0]
            
            elif node["type"] == "VAELoader":
                if widget_values:
                    node_config["inputs"]["vae_name"] = widget_values[0]
            
            elif node["type"] == "UNETLoader":
                if len(widget_values) >= 2:
                    node_config["inputs"].update({
                        "unet_name": widget_values[0],
                        "weight_dtype": widget_values[1] or "default"
                    })
            
            elif node["type"] == "QuadrupleCLIPLoader":
                if len(widget_values) >= 4:
                    node_config["inputs"].update({
                        "clip_name1": widget_values[0],
                        "clip_name2": widget_values[1],
                        "clip_name3": widget_values[2],
                        "clip_name4": widget_values[3]
                    })
                    logger.info(f"✅ Updated QuadrupleCLIPLoader with CLIP models")
            
            elif node["type"] == "ModelSamplingSD3":
                # Handle ModelSamplingSD3 node with default values if needed
                shift_value = widget_values[0] if widget_values and len(widget_values) > 0 else 5
                node_config["inputs"]["shift"] = shift_value
                logger.info(f"✅ Updated ModelSamplingSD3 shift value: {shift_value}")
        
        # Process connections/links
        if "inputs" in node and workflow.get("links"):
            for input_data in node["inputs"]:
                input_name = input_data["name"]
                link_id = input_data.get("link")
                
                if link_id is not None:
                    # Find the corresponding link
                    for link in workflow["links"]:
                        if link[0] == link_id:  # link[0] is the link ID
                            source_node_id = str(link[1])  # link[1] is the source node ID
                            output_index = link[2]  # link[2] is the output index
                            node_config["inputs"][input_name] = [source_node_id, output_index]
                            break
    
    def get_history_direct(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get history directly for the specific prompt_id"""
        try:
            response = self.session.get(f"{self.server_url}/history/{prompt_id}")
            
            if response.status_code == 200:
                logger.info("✅ Successfully retrieved direct history")
                return response.json()
            else:
                logger.warning(f"⚠️ Failed to get direct history: {response.status_code}")
                return None
                
        except Exception as e:
            logger.warning(f"⚠️ Error getting direct history: {str(e)}")
            return None
    
    def get_queue_status(self) -> Optional[Dict[str, Any]]:
        """Get the current queue status to check if our prompt is still running"""
        try:
            response = self.session.get(f"{self.server_url}/queue")
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"⚠️ Failed to get queue status: {response.status_code}")
                return None
                
        except Exception as e:
            logger.warning(f"⚠️ Error getting queue status: {str(e)}")
            return None
    
    def is_prompt_in_queue(self, prompt_id: str) -> Tuple[bool, str]:
        """
        Check if a prompt is still in the queue (running or pending)
        
        Returns:
        - bool: Whether the prompt is in the queue
        - str: The status of the prompt ("running", "pending", or "not_found")
        """
        queue_data = self.get_queue_status()
        
        if not queue_data:
            return False, "unknown"
        
        # Check running queue
        if "queue_running" in queue_data:
            for job in queue_data["queue_running"]:
                if len(job) > 1 and job[1] == prompt_id:
                    return True, "running"
        
        # Check pending queue
        if "queue_pending" in queue_data:
            for job in queue_data["queue_pending"]:
                if len(job) > 1 and job[1] == prompt_id:
                    return True, "pending"
        
        # Not found in queue, likely completed
        return False, "not_found"
    
    def check_workflow_status(self, prompt_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Check the status of a workflow
        
        Returns:
        - bool: Whether the workflow is complete
        - Dict: The execution history data if available, None otherwise
        - str: Error message if there was an error, None otherwise
        """
        try:
            # First check if the prompt is still in queue
            in_queue, queue_status = self.is_prompt_in_queue(prompt_id)
            
            if in_queue:
                return False, None, f"Still in queue: {queue_status}"
            
            # Try to get the history
            direct_history = self.get_history_direct(prompt_id)
            
            if direct_history and prompt_id in direct_history:
                # Get the prompt-specific data using the prompt_id as key
                prompt_data = direct_history[prompt_id]
                
                # Check if the workflow has completed successfully
                if "status" in prompt_data:
                    if prompt_data["status"].get("completed") == True:
                        # Check if there are outputs in the response
                        if "outputs" in prompt_data:
                            return True, prompt_data, None
                    
                    # Check for errors
                    if prompt_data["status"].get("status_str") == "error":
                        error = prompt_data["status"].get("error", "Unknown error")
                        return False, prompt_data, f"Error: {error}"
            
            # Still processing or unknown status
            return False, None, "Still processing"
            
        except Exception as e:
            logger.error(f"❌ Error checking workflow status: {str(e)}")
            return False, None, str(e)
    
    def get_output_files(self, prompt_id: str) -> List[Dict[str, Any]]:
        """Get a list of output files from a completed workflow"""
        try:
            direct_history = self.get_history_direct(prompt_id)
            output_files = []
            
            if direct_history and prompt_id in direct_history:
                # Get the prompt-specific data using the prompt_id as key
                prompt_data = direct_history[prompt_id]
                
                if "outputs" in prompt_data:
                    for node_id, node_outputs in prompt_data["outputs"].items():
                        if isinstance(node_outputs, dict) and "images" in node_outputs:
                            for img in node_outputs["images"]:
                                output_file = {
                                    "node_id": node_id,
                                    "filename": img["filename"],
                                    "type": "image", 
                                    "subfolder": img.get("subfolder", ""),
                                    "url": self.get_image_url(img["filename"], img.get("subfolder", ""))
                                }
                                output_files.append(output_file)
            
            logger.info(f"📋 Found {len(output_files)} output files")
            return output_files
            
        except Exception as e:
            logger.error(f"❌ Error getting output files: {str(e)}")
            return []
    
    def get_image_url(self, filename: str, subfolder: str = "") -> str:
        """Get the direct URL for an image"""
        params = {
            "filename": filename,
            "type": "output"
        }
        
        # Only add subfolder parameter if it's not empty
        if subfolder:
            params["subfolder"] = subfolder
        
        url = f"{self.server_url}/api/view?{urlencode(params)}"
        return url
    
    def get_clean_image_url(self, filename: str, subfolder: str = "") -> str:
        """Get a direct URL for an image without the type=output parameter"""
        params = {
            "filename": filename
        }
        
        # Only add subfolder parameter if it's not empty
        if subfolder:
            params["subfolder"] = subfolder
        
        url = f"{self.server_url}/api/view?{urlencode(params)}"
        return url
    
    def prepare_image_for_viewing(self, image_url: str) -> str:
        """
        Two-step approach to prepare an image for viewing
        
        Step 1: First make a request through the session to set up cookies/authentication
        Step 2: Return the direct URL that should now work with the established session
        """
        if not image_url:
            logger.error("❌ No image URL provided")
            return ""
            
        try:
            logger.info(f"🔍 Preparing image for viewing: {image_url}")
            
            # Step 1: First access the URL to set up cookies/authentication
            response = self.session.get(
                image_url,
                headers=self._get_headers(),
                stream=True  # Don't download the entire file, just establish session
            )
            
            # Close the response without reading the entire content
            response.close()
            
            if response.status_code == 200:
                logger.info("✅ Image URL accessed successfully, authentication prepared")
                return image_url
            else:
                logger.warning(f"⚠️ Failed to access image: {response.status_code}")
                return image_url
                
        except Exception as e:
            logger.error(f"❌ Error preparing image: {str(e)}")
            return image_url
    
    def download_file(self, filename: str, output_dir: str, subfolder: str = "") -> Optional[str]:
        """Download a file from the ComfyUI server"""
        try:
            logger.info(f"📥 Downloading file: {filename}")
            
            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Get the image URL
            image_url = self.get_image_url(filename, subfolder)
            
            # Output file path
            output_path = os.path.join(output_dir, filename)
            
            # First prepare authentication by accessing the URL
            self.prepare_image_for_viewing(image_url)
            
            # Now download the file using the same session
            response = self.session.get(
                image_url,
                headers=self._get_image_headers(),
                stream=True
            )
            
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                logger.info(f"✅ Successfully downloaded to: {output_path}")
                return output_path
            else:
                logger.error(f"❌ Download failed with status: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error downloading file: {str(e)}")
            return None
    
    def wait_for_workflow_completion(self, prompt_id: str, timeout_minutes: int = 15, 
                                     status_callback=None) -> bool:
        """
        Wait for workflow completion with timeout and optional status callback
        
        Args:
            prompt_id: The ID of the prompt to wait for
            timeout_minutes: Maximum time to wait in minutes
            status_callback: Optional callback function to report status
            
        Returns:
            bool: True if workflow completed successfully, False otherwise
        """
        # Removed duplicate log message - main.py already logs this
        
        # Calculate timeout
        timeout_seconds = timeout_minutes * 60
        start_time = time.time()
        check_interval = 2.0  # Start with 2 seconds between checks
        
        while True:
            # Check for timeout
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout_seconds:
                logger.error(f"⏰ Workflow processing timed out after {timeout_minutes} minutes")
                return False
            
            # Calculate percentage completion based on time
            percent_complete = min(95, int((elapsed_time / timeout_seconds) * 100))
            
            # First check if it's in queue
            in_queue, queue_status = self.is_prompt_in_queue(prompt_id)
            
            if in_queue:
                # If in queue, report the status
                if status_callback:
                    status_callback(f"Running ({percent_complete}% time elapsed)")
                time.sleep(check_interval)
                continue
            
            # Check workflow status
            is_complete, history, error_msg = self.check_workflow_status(prompt_id)
            
            # If there's a callback, call it
            if status_callback:
                if is_complete:
                    status_callback("100% - Complete")
                elif error_msg:
                    status_callback(f"{percent_complete}% - {error_msg}")
                else:
                    status_callback(f"{percent_complete}% - Processing")
            
            # If complete, return success
            if is_complete:
                logger.info("✅ Workflow completed successfully")
                return True
            
            # If there's an error, return failure
            if error_msg and "Error:" in error_msg:
                logger.error(f"❌ Workflow failed: {error_msg}")
                return False
            
            # Adaptive waiting: increase interval gradually to reduce polling frequency
            check_interval = min(10.0, check_interval * 1.2)  # Cap at 10 seconds
            time.sleep(check_interval) 
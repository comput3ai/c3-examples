import os
import requests
import json
import time
import logging
import uuid
import base64
from urllib.parse import urlencode, urlparse, parse_qs
from typing import Optional, Dict, Any, List, Tuple, Union, BinaryIO

logger = logging.getLogger(__name__)

class ComfyUIClient:
    """Client for interacting with ComfyUI API through Comput3"""
    
    def __init__(self, server_url: str, api_key: str):
        """Initialize with ComfyUI server URL and Comput3 API key"""
        self.server_url = server_url.rstrip('/')
        self.original_server_url = self.server_url  # Keep the original URL for direct access
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
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        }
    
    def _get_video_headers(self) -> Dict[str, str]:
        """Get headers specifically for video requests"""
        return {
            "X-C3-API-KEY": self.api_key,
            "accept": "video/mp4,video/webm,video/*;q=0.8,*/*;q=0.5",
            "accept-language": "en-US,en;q=0.9",
            "sec-fetch-dest": "video",
            "sec-fetch-mode": "no-cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
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
            with open(workflow_path, 'r', encoding='utf-8') as f:
                workflow = json.load(f)
            return workflow
        except Exception as e:
            logger.error(f"❌ Error loading workflow from {workflow_path}: {str(e)}")
            raise
    
    def validate_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that a workflow has the required structure and nodes for text-to-video
        """
        errors = []
        warnings = []
        
        if not workflow:
            errors.append('Workflow is null or undefined')
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        if not isinstance(workflow, dict):
            errors.append(f'Workflow is not an object: {type(workflow)}')
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        # Check if workflow has nodes
        if "nodes" not in workflow:
            errors.append('Workflow is missing "nodes" property')
        
        # If nodes exist in dictionary format, check for required node types
        if "nodes" in workflow:
            if isinstance(workflow["nodes"], dict):
                # Check for WanVideoTextEncode node (for text encoding)
                has_text_encode = False
                for node_id, node in workflow["nodes"].items():
                    if node.get("class_type") == "WanVideoTextEncode":
                        has_text_encode = True
                        break
                
                if not has_text_encode:
                    errors.append('Missing WanVideoTextEncode node')
            
            # If nodes are in list format
            elif isinstance(workflow["nodes"], list):
                # Check for WanVideoTextEncode node (for text encoding)
                has_text_encode = False
                for node in workflow["nodes"]:
                    if node.get("type") == "WanVideoTextEncode":
                        has_text_encode = True
                        break
                
                if not has_text_encode:
                    errors.append('Missing WanVideoTextEncode node')
            else:
                errors.append(f'Workflow "nodes" is not a list or dictionary: {type(workflow["nodes"])}')
        
        # Return validation result
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def update_workflow(self, workflow: Dict[str, Any], prompt: str) -> Dict[str, Any]:
        """Update the workflow with the text prompt (simple version)"""
        # Make a copy of the workflow to avoid modifying the original
        updated_workflow = json.loads(json.dumps(workflow))
        
        # Flag to track if we found and updated the prompt
        prompt_updated = False
        
        # Update text encoding nodes with the prompt
        if "nodes" in updated_workflow:
            if isinstance(updated_workflow["nodes"], list):
                # Handle nodes as a list
                for node in updated_workflow["nodes"]:
                    # Look for the WanVideoTextEncode node (node ID 16 in the template workflow)
                    if node.get("type") == "WanVideoTextEncode":
                        # Update the positive prompt
                        if "widgets_values" in node and len(node["widgets_values"]) >= 1:
                            node["widgets_values"][0] = prompt
                            logger.info(f"✏️ Updated text prompt: {prompt[:50]}...")
                            prompt_updated = True
            elif isinstance(updated_workflow["nodes"], dict):
                # Handle nodes as a dictionary
                for _, node in updated_workflow["nodes"].items():
                    # Look for the WanVideoTextEncode node
                    if node.get("type") == "WanVideoTextEncode":
                        # Update the positive prompt
                        if "widgets_values" in node and len(node["widgets_values"]) >= 1:
                            node["widgets_values"][0] = prompt
                            logger.info(f"✏️ Updated text prompt: {prompt[:50]}...")
                            prompt_updated = True
        
        if not prompt_updated:
            logger.warning("⚠️ Could not find WanVideoTextEncode node to update prompt")
        
        return updated_workflow
    
    def update_text_to_video_workflow(self, workflow: Dict[str, Any], 
                                     positive_prompt: str, 
                                     negative_prompt: str, 
                                     width: int = 832, 
                                     height: int = 480, 
                                     frames: int = 48,
                                     fps: int = 24,
                                     seed: int = None, 
                                     steps: int = 25) -> Dict[str, Any]:
        """
        Update the workflow with text-to-video parameters
        """
        logger.info(f"Updating workflow with parameters: prompt={positive_prompt[:20]}..., "
                   f"negativePrompt={negative_prompt[:20]}..., width={width}, height={height}, "
                   f"frames={frames}, fps={fps}, seed={seed}, steps={steps}")
        
        # Create a new API-compatible workflow
        api_workflow = {}
        
        # Build a workflow based on the template in text_to_video_json_api.json
        
        # 1. T5 Encoder
        api_workflow["11"] = {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "offload_model": "offload_device",
                "offload_type": "disabled"
            }
        }
        
        # 2. Empty Embeds
        api_workflow["37"] = {
            "class_type": "WanVideoEmptyEmbeds",
            "inputs": {
                "width": width,
                "height": height,
                "num_frames": frames
            }
        }
        
        # 3. VAE Loader
        api_workflow["38"] = {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_1_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        }
        
        # 4. Block Swap - CRITICAL NODE: this must be properly configured
        api_workflow["39"] = {
            "class_type": "WanVideoBlockSwap",
            "inputs": {
                "blocks_to_swap": 20,
                "offload_txt_emb": False,
                "offload_img_emb": False,
                "non_blocking": True,
                "vace_blocks_to_swap": 0  # IMPORTANT: This value must be 0 or explicitly set
            }
        }
        
        # 5. Torch Compile Settings - Disable compilation by setting inputs for minimal processing
        api_workflow["35"] = {
            "class_type": "WanVideoTorchCompileSettings",
            "inputs": {
                "backend": "inductor",  # Must be inductor or cudagraphs
                "mode": "default",
                "fullgraph": False,
                "max_autotune": False,
                "max_autotune_gemm_backends": 64,
                "use_fp16_cast": False,  # Setting to False to reduce compilation overhead
                "max_autotune_gemm_warmup": 128,
                "compile_transformer_blocks_only": True,  # Limit to transformer blocks only
                "dynamic": False,
                "dynamo_cache_size_limit": 64
            }
        }
        
        # 6. TeaCache
        api_workflow["52"] = {
            "class_type": "WanVideoTeaCache",
            "inputs": {
                "start_step": 0.25,
                "end_step": 1.0,
                "rel_l1_thresh": 0.97,
                "cache_device": "offload_device",
                "use_coefficients": True,
                "coeff_mode": "e"
            }
        }
        
        # 7. Enhance-A-Video
        api_workflow["55"] = {
            "class_type": "WanVideoEnhanceAVideo",
            "inputs": {
                "enhance_factor": 2,
                "enhance_start": 0,
                "enhance_end": 1,
                "start_percent": 0,
                "end_percent": 1,
                "weight": 1
            }
        }
        
        # 8. Text Encode Node
        api_workflow["16"] = {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["11", 0],  # Connect to T5 encoder
                "positive_prompt": positive_prompt,
                "negative_prompt": negative_prompt,
                "force_zeros": True
            }
        }
        
        # 9. Model Loader Node - CRITICAL node - Change quantization from fp8_e4m3fn to disabled
        api_workflow["22"] = {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "compile_args": ["35", 0],  # Connect to torch compile settings
                "block_swap_args": ["39", 0],  # Connect to block swap
                "model": "WanVideo/Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
                "base_precision": "fp16",
                "quantization": "disabled",  # Changed from fp8_e4m3fn to disabled
                "load_device": "offload_device",
                "attention_implementation": "sdpa"
            }
        }
        
        # 10. Sampler
        api_workflow["27"] = {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["22", 0],  # Connect to model loader
                "text_embeds": ["16", 0],  # Connect to text encoder
                "image_embeds": ["37", 0],  # Connect to empty embeds
                "teacache_args": ["52", 0],  # Connect to TeaCache
                "feta_args": ["55", 0],  # Connect to enhance-a-video
                "steps": steps,
                "cfg": 6.0,
                "seed": seed if seed is not None else int(time.time() * 1000) % (2**32),
                "sampler_name": "fixed",
                "diffusion_type": True,
                "scheduler": "unipc",
                "riflex_freq_index": 0,
                "shift": 5.0,
                "force_offload": False,
                "implementation": "comfy"
            }
        }
        
        # 11. Decoder
        api_workflow["28"] = {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["38", 0],  # Connect to VAE
                "samples": ["27", 0],  # Connect to sampler
                "restore_faces": True,
                "tile_x": 272,
                "tile_y": 272,
                "tile_stride_x": 144,
                "tile_stride_y": 128,
                "enable_vae_tiling": True
            }
        }
        
        # 12. Video Combiner
        api_workflow["30"] = {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["28", 0],  # Connect to decoder
                "frame_rate": fps,
                "loop_count": 0,
                "filename_prefix": "video_output",
                "format": "video/h264-mp4",
                "pingpong": False,
                "save_output": True
            }
        }
        
        # Return the completed workflow
        return {
            "nodes": api_workflow,
            "extra_data": {
                "version": 0.4,
                "node_versions": {
                    "ComfyUI-WanVideoWrapper": "5a2383621a05825d0d0437781afcb8552d9590fd",
                    "comfy-core": "0.3.26",
                    "ComfyUI-VideoHelperSuite": "0a75c7958fe320efcb052f1d9f8451fd20c730a8"
                }
            }
        }
    
    def _validate_workflow_nodes(self, workflow: Dict[str, Any]) -> List[str]:
        """
        Validate workflow nodes to ensure required parameters are present
        Returns a list of validation errors, empty list if valid
        """
        errors = []
        
        # Check if nodes dictionary exists
        if not isinstance(workflow.get("nodes"), dict):
            return ["Workflow has no valid nodes dictionary"]
        
        nodes = workflow["nodes"]
        
        # Validation for specific nodes
        for node_id, node in nodes.items():
            class_type = node.get("class_type")
            inputs = node.get("inputs", {})
            
            # Check WanVideoTorchCompileSettings
            if class_type == "WanVideoTorchCompileSettings":
                required_fields = ["compile_transformer_blocks_only", "dynamic", "dynamo_cache_size_limit"]
                for field in required_fields:
                    if field not in inputs:
                        errors.append(f"Node {node_id} ({class_type}) missing required input: {field}")
            
            # Check WanVideoTeaCache
            elif class_type == "WanVideoTeaCache":
                if "rel_l1_thresh" in inputs and inputs["rel_l1_thresh"] < 0:
                    errors.append(f"Node {node_id} ({class_type}) has invalid value for rel_l1_thresh: {inputs['rel_l1_thresh']} (must be >= 0)")
                
            # Check WanVideoEnhanceAVideo
            elif class_type == "WanVideoEnhanceAVideo":
                required_fields = ["start_percent", "weight", "end_percent"]
                for field in required_fields:
                    if field not in inputs:
                        errors.append(f"Node {node_id} ({class_type}) missing required input: {field}")
            
            # Check WanVideoDecode
            elif class_type == "WanVideoDecode":
                if "enable_vae_tiling" not in inputs:
                    errors.append(f"Node {node_id} ({class_type}) missing required input: enable_vae_tiling")
        
        return errors

    def queue_workflow(self, workflow: Dict[str, Any]) -> Optional[str]:
        """Queue a workflow for execution"""
        try:
            # Transform workflow to API format
            api_prompt = self._transform_workflow_to_api_format(workflow)
            
            # Validate workflow nodes before sending
            validation_errors = self._validate_workflow_nodes({"nodes": api_prompt})
            if validation_errors:
                logger.error(f"❌ Workflow validation failed with the following errors:")
                for error in validation_errors:
                    logger.error(f"  - {error}")
                logger.error("Please fix these errors before submitting the workflow.")
            
            # Create the final payload
            payload = {
                "prompt": api_prompt,
                "client_id": self.client_id
            }
            
            # If the original workflow had extra_data, include it
            if "extra_data" in workflow:
                payload["extra_data"] = workflow["extra_data"]
            
            # For debugging - Save the payload to a file
            debug_dir = os.path.join(os.getcwd(), "debug")
            os.makedirs(debug_dir, exist_ok=True)
            debug_file = os.path.join(debug_dir, f"workflow_payload_{int(time.time())}.json")
            with open(debug_file, 'w') as f:
                json.dump(payload, f, indent=2)
            logger.debug(f"Wrote payload to {debug_file}")
            
            # Add a small delay before API call to prevent rate limiting
            time.sleep(1)
            
            # Retry mechanism for API call
            max_retries = 3
            retry_delay = 2
            
            for retry in range(max_retries):
                try:
                    logger.debug(f"Attempt {retry + 1} of {max_retries} to queue workflow")
                    
                    response = self.session.post(
                        f"{self.server_url}/prompt",
                        json=payload,
                        timeout=30  # Set a timeout
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        prompt_id = result.get("prompt_id")
                        logger.info(f"✅ Workflow queued with ID: {prompt_id}")
                        return prompt_id
                    else:
                        logger.error(f"❌ Failed to queue workflow: {response.status_code} - {response.text}")
                        if retry < max_retries - 1:
                            logger.info(f"Retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                        else:
                            return None
                
                except requests.RequestException as e:
                    logger.error(f"❌ Network error: {str(e)}")
                    if retry < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        return None
            
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
        
        # If nodes is a dictionary (already in API format), return as is
        if isinstance(workflow.get("nodes"), dict):
            return workflow["nodes"]
        
        # If nodes is a list (visual workflow format), convert to API format
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
            if node["type"] == "WanVideoTextEncode":
                # Set positive and negative prompts
                if len(widget_values) >= 2:
                    node_config["inputs"].update({
                        "positive_prompt": widget_values[0],
                        "negative_prompt": widget_values[1],
                        "force_zeros": widget_values[2] if len(widget_values) > 2 else True
                    })
            
            elif node["type"] == "WanVideoBlockSwap":
                # Set block swap parameters
                if len(widget_values) >= 5:
                    node_config["inputs"].update({
                        "blocks_to_swap": widget_values[0],
                        "offload_txt_emb": widget_values[1],
                        "offload_img_emb": widget_values[2],
                        "non_blocking": widget_values[3],
                        "vace_blocks_to_swap": widget_values[4]
                    })
            
            elif node["type"] == "WanVideoEmptyEmbeds":
                # Set empty embeds parameters
                if len(widget_values) >= 3:
                    node_config["inputs"].update({
                        "width": widget_values[0], 
                        "height": widget_values[1],
                        "num_frames": widget_values[2]
                    })
            
            elif node["type"] == "WanVideoTorchCompileSettings":
                # Handle torch compile settings
                if len(widget_values) >= 7:
                    node_config["inputs"].update({
                        "backend": widget_values[0],
                        "fullgraph": widget_values[1],
                        "mode": widget_values[2],
                        "max_autotune": widget_values[3],
                        "max_autotune_gemm_backends": widget_values[4],
                        "use_fp16_cast": widget_values[5],
                        "max_autotune_gemm_warmup": widget_values[6],
                        "compile_transformer_blocks_only": False,  # Default value
                        "dynamic": False,  # Default value
                        "dynamo_cache_size_limit": 64  # Default value
                    })
            
            elif node["type"] == "WanVideoTeaCache":
                # Handle tea cache settings
                if len(widget_values) >= 6:
                    node_config["inputs"].update({
                        "start_step": widget_values[0],
                        "end_step": widget_values[1],
                        "rel_l1_thresh": max(0.0, float(widget_values[2])),  # Ensure minimum of 0.0
                        "cache_device": widget_values[3],
                        "use_coefficients": widget_values[4] == "true" if isinstance(widget_values[4], str) else widget_values[4],
                        "coeff_mode": widget_values[5]
                    })
            
            elif node["type"] == "WanVideoEnhanceAVideo":
                # Handle enhance-a-video settings
                if len(widget_values) >= 3:
                    node_config["inputs"].update({
                        "enhance_factor": widget_values[0],
                        "enhance_start": widget_values[1],
                        "enhance_end": widget_values[2],
                        "start_percent": 0,  # Default values for required fields
                        "end_percent": 1,
                        "weight": 1
                    })
            
            elif node["type"] == "WanVideoSampler":
                # Set sampler parameters
                if len(widget_values) >= 10:
                    node_config["inputs"].update({
                        "steps": widget_values[0],
                        "cfg": widget_values[1],
                        "shift": widget_values[2],
                        "seed": widget_values[3],
                        "sampler_name": widget_values[4],
                        "diffusion_type": widget_values[5],
                        "scheduler": widget_values[6],
                        "riflex_freq_index": widget_values[7],
                        "implementation": widget_values[10] if len(widget_values) > 10 else "comfy"
                    })
            
            elif node["type"] == "WanVideoDecode":
                # Set decoder parameters
                if len(widget_values) >= 5:
                    node_config["inputs"].update({
                        "restore_faces": widget_values[0],
                        "tile_x": widget_values[1],
                        "tile_y": widget_values[2],
                        "tile_stride_x": widget_values[3],
                        "tile_stride_y": widget_values[4],
                        "enable_vae_tiling": True  # Add the required parameter
                    })
            
            elif node["type"] == "WanVideoVAELoader":
                # Set VAE Loader parameters
                if len(widget_values) >= 2:
                    node_config["inputs"].update({
                        "model_name": widget_values[0],
                        "precision": widget_values[1]
                    })
            
            elif node["type"] == "WanVideoModelLoader":
                # Handle model loader settings
                if len(widget_values) >= 5:
                    # Ensure quantization doesn't use fp8_e4m3fn which causes errors
                    quantization = widget_values[2] if len(widget_values) > 2 else "disabled"
                    if "fp8" in quantization.lower():
                        quantization = "disabled"  # Replace fp8 with disabled to avoid errors
                    
                    node_config["inputs"].update({
                        "model": widget_values[0],
                        "base_precision": widget_values[1],
                        "quantization": quantization,
                        "load_device": widget_values[3],
                        "attention_implementation": widget_values[4]
                    })
            
            elif node["type"] == "VHS_VideoCombine":
                # Handle complex widgets_values for VHS_VideoCombine
                if isinstance(widget_values, dict):
                    frame_rate = widget_values.get("frame_rate", 24)
                    loop_count = widget_values.get("loop_count", 0)
                    filename_prefix = widget_values.get("filename_prefix", "video_output")
                    format_type = widget_values.get("format", "video/h264-mp4")
                    pingpong = widget_values.get("pingpong", False)
                    save_output = widget_values.get("save_output", True)
                    
                    node_config["inputs"].update({
                        "frame_rate": frame_rate,
                        "loop_count": loop_count,
                        "filename_prefix": filename_prefix,
                        "format": format_type,
                        "pingpong": pingpong,
                        "save_output": save_output
                    })
        
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
    
    def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get the history of a prompt execution"""
        try:
            url = f"{self.server_url}/history/{prompt_id}"
            response = self.session.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"❌ Failed to get history: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting history: {str(e)}")
            return None
    
    def check_workflow_status(self, prompt_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Check the status of a workflow execution
        
        Returns:
            Tuple[bool, Dict, str]: 
                - is_complete: Whether the workflow execution is complete
                - history_data: The full history data if available
                - error_message: Error message if there was an error
        """
        try:
            url = f"{self.server_url}/history/{prompt_id}"
            response = self.session.get(url)
            
            if response.status_code == 200:
                history_data = response.json()
                
                # Check if the prompt_id key exists in the history data
                if prompt_id in history_data:
                    # Get the prompt-specific data
                    prompt_data = history_data[prompt_id]
                    
                    # Check if there's a status field with completed=true
                    if "status" in prompt_data and prompt_data["status"].get("completed") == True:
                        logger.info("✅ Workflow marked as completed in status field")
                        return True, history_data, None
                    
                    # Check for errors in the status field
                    if "status" in prompt_data and prompt_data["status"].get("status_str") == "error":
                        error_msg = prompt_data["status"].get("error", "Unknown error")
                        logger.error(f"❌ Workflow error in status field: {error_msg}")
                        return False, history_data, f"Error: {error_msg}"
                    
                    # Check for node 30 in outputs within the prompt_data
                    if "outputs" in prompt_data and "30" in prompt_data["outputs"]:
                        logger.info("✅ Found node 30 in prompt_data outputs")
                        return True, history_data, None
                
                # Check if there's an error in the history
                if "error" in history_data:
                    error_msg = history_data.get("error", "Unknown error")
                    logger.error(f"❌ Workflow error: {error_msg}")
                    return True, history_data, error_msg
                
                # Check for node 30 in outputs directly in history_data
                if "outputs" in history_data and "30" in history_data["outputs"]:
                    logger.info("✅ Found node 30 in history_data outputs")
                    return True, history_data, None
                
                # Check if all nodes have executed
                nodes_in_prompt = set()
                executed_nodes = set()
                executing_nodes = set()
                
                # First collect all nodes in the prompt
                if prompt_id in history_data and "prompt" in history_data[prompt_id]:
                    # Look in prompt_data
                    for node_id in history_data[prompt_id]["prompt"]:
                        # Only add non-special nodes (that don't start with $)
                        if not node_id.startswith('$'):
                            nodes_in_prompt.add(node_id)
                elif "prompt" in history_data:
                    # Look directly in history_data
                    for node_id in history_data["prompt"]:
                        # Only add non-special nodes (that don't start with $)
                        if not node_id.startswith('$'):
                            nodes_in_prompt.add(node_id)
                
                # Then collect all executed nodes from prompt_data or directly
                if prompt_id in history_data and "outputs" in history_data[prompt_id]:
                    # Get outputs from prompt_data
                    for node_id in history_data[prompt_id]["outputs"]:
                        if not node_id.startswith('$'):
                            executed_nodes.add(node_id)
                elif "outputs" in history_data:
                    # Get outputs directly from history_data
                    for node_id in history_data["outputs"]:
                        if not node_id.startswith('$'):
                            executed_nodes.add(node_id)
                
                # Also check for nodes currently executing
                if prompt_id in history_data and "executing" in history_data[prompt_id]:
                    # Get executing nodes from prompt_data
                    for node_id in history_data[prompt_id]["executing"]:
                        if not node_id.startswith('$'):
                            executing_nodes.add(node_id)
                elif "executing" in history_data:
                    # Get executing nodes directly from history_data
                    for node_id in history_data["executing"]:
                        if not node_id.startswith('$'):
                            executing_nodes.add(node_id)
                
                # Check for output node 30 (VHS_VideoCombine in our workflow)
                is_complete = "30" in executed_nodes
                
                # Log status details for debugging
                if executing_nodes:
                    for node_id in executing_nodes:
                        # Calculate progress for this node if available
                        node_progress = None
                        if prompt_id in history_data and "progress" in history_data[prompt_id]:
                            node_progress = history_data[prompt_id]["progress"].get(node_id)
                        elif "progress" in history_data:
                            node_progress = history_data["progress"].get(node_id)
                        
                        if node_progress:
                            logger.debug(f"🔄 Executing node {node_id}: {node_progress:.1f}% complete")
                        else:
                            logger.debug(f"🔄 Executing node {node_id}")
                
                if is_complete:
                    logger.info("✅ Workflow execution complete")
                elif executed_nodes:
                    logger.debug(f"🔄 Progress: {len(executed_nodes)}/{len(nodes_in_prompt)} nodes completed")
                
                return is_complete, history_data, None
            
            else:
                logger.error(f"❌ Failed to get history: {response.status_code} - {response.text}")
                return False, None, f"API error: {response.status_code}"
                
        except Exception as e:
            logger.error(f"❌ Error checking workflow status: {str(e)}")
            return False, None, str(e)
    
    def get_video_url(self, filename: str, subfolder: str = "", format_type: str = "video/h264-mp4", frame_rate: float = 24.0) -> str:
        """Get the direct URL to a video file"""
        base_url = f"{self.server_url}/api/viewvideo"
        params = {
            "filename": filename,
            "type": "output"
        }
        if subfolder:
            params["subfolder"] = subfolder
        if format_type:
            params["format"] = format_type
        if frame_rate:
            params["frame_rate"] = frame_rate
        
        # Create URL with query parameters
        return f"{base_url}?{urlencode(params)}"
    
    def get_output_files(self, prompt_id: str) -> List[Dict[str, Any]]:
        """Get the output files from a completed workflow"""
        try:
            logger.info("🔍 Getting list of output files...")
            
            # Get the history data directly
            history_data = self.get_history(prompt_id)
            
            if not history_data:
                logger.error("❌ Cannot get output files: No history data")
                return []
            
            # Extract files from the outputs
            output_files = []
            
            # Check if the history data has the prompt_id as a key (new format)
            if prompt_id in history_data:
                # Get the prompt-specific data
                prompt_data = history_data[prompt_id]
                
                if "outputs" in prompt_data:
                    for node_id, node_outputs in prompt_data["outputs"].items():
                        # Handle different output formats
                        if isinstance(node_outputs, dict):
                            for output_type, output_data in node_outputs.items():
                                if isinstance(output_data, list):
                                    for item in output_data:
                                        if isinstance(item, dict) and "filename" in item:
                                            # Determine file type
                                            file_type = "video" if item.get("format", "").startswith("video/") else "image"
                                            
                                            file_info = {
                                                "filename": item["filename"],
                                                "subfolder": item.get("subfolder", ""),
                                                "type": item.get("type", "output"),
                                                "node_id": node_id,
                                                "file_type": file_type
                                            }
                                            
                                            # Add video specific info if available
                                            if file_type == "video":
                                                file_info["format"] = item.get("format", "video/h264-mp4")
                                                file_info["frame_rate"] = item.get("frame_rate", 24.0)
                                                # Generate the video URL
                                                file_info["url"] = self.get_video_url(
                                                    item["filename"], 
                                                    item.get("subfolder", ""),
                                                    item.get("format", "video/h264-mp4"),
                                                    item.get("frame_rate", 24.0)
                                                )
                                            else:
                                                # Generate image URL
                                                base_url = f"{self.server_url}/api/view"
                                                url_params = {
                                                    "filename": item["filename"],
                                                    "type": "output"
                                                }
                                                if item.get("subfolder"):
                                                    url_params["subfolder"] = item["subfolder"]
                                                file_info["url"] = f"{base_url}?{urlencode(url_params)}"
                                            
                                            output_files.append(file_info)
            else:
                # Original format where outputs is directly in the history data
                if "outputs" in history_data:
                    for node_id, node_outputs in history_data["outputs"].items():
                        # Look for different types of outputs
                        for output_type, output_data in node_outputs.items():
                            if isinstance(output_data, list):
                                for item in output_data:
                                    if isinstance(item, dict) and "filename" in item:
                                        # Determine file type
                                        file_type = "video" if item.get("format", "").startswith("video/") else "image"
                                        
                                        file_info = {
                                            "filename": item["filename"],
                                            "subfolder": item.get("subfolder", ""),
                                            "type": item.get("type", "output"),
                                            "node_id": node_id,
                                            "file_type": file_type
                                        }
                                        
                                        # Add video specific info if available
                                        if file_type == "video":
                                            file_info["format"] = item.get("format", "video/h264-mp4")
                                            file_info["frame_rate"] = item.get("frame_rate", 24.0)
                                            # Generate the video URL
                                            file_info["url"] = self.get_video_url(
                                                item["filename"], 
                                                item.get("subfolder", ""),
                                                item.get("format", "video/h264-mp4"),
                                                item.get("frame_rate", 24.0)
                                            )
                                        else:
                                            # Generate image URL
                                            base_url = f"{self.server_url}/api/view"
                                            url_params = {
                                                "filename": item["filename"],
                                                "type": "output"
                                            }
                                            if item.get("subfolder"):
                                                url_params["subfolder"] = item["subfolder"]
                                            file_info["url"] = f"{base_url}?{urlencode(url_params)}"
                                        
                                        output_files.append(file_info)
            
            # Special handling for VHS_VideoCombine output (node 30)
            vhs_output_files = [f for f in output_files if f["node_id"] == "30"]
            if vhs_output_files:
                logger.info(f"📄 Found {len(vhs_output_files)} video files from VHS_VideoCombine node")
            
            logger.info(f"📄 Found {len(output_files)} total output files")
            return output_files
            
        except Exception as e:
            logger.error(f"❌ Error getting output files: {str(e)}")
            return []
    
    def prepare_video_for_viewing(self, video_url: str) -> str:
        """
        Prepare a video for viewing by sending a request to the server first
        This helps establish authentication
        """
        try:
            # First, make a HEAD request to establish authentication
            response = self.session.head(
                video_url,
                headers=self._get_video_headers()
            )
            
            if response.status_code < 300:
                logger.debug(f"✅ Successfully prepared video URL: {video_url}")
                return video_url
            else:
                logger.warning(f"⚠️ Failed to prepare video URL: {response.status_code}")
                return video_url
                
        except Exception as e:
            logger.error(f"❌ Error preparing video URL: {str(e)}")
            return video_url
    
    def download_file(self, filename: str, output_dir: str, subfolder: str = "", 
                     format_type: str = None, frame_rate: float = None) -> Optional[str]:
        """Download a file from the ComfyUI server"""
        try:
            # Determine the file type
            is_video = filename.lower().endswith(('.mp4', '.avi', '.mov', '.webm'))
            
            # Set the download URL
            if is_video:
                # If format_type and frame_rate are provided, use them
                download_url = self.get_video_url(
                    filename, 
                    subfolder, 
                    format_type or "video/h264-mp4", 
                    frame_rate or 24.0
                )
            else:
                # For other file types, use the view endpoint
                base_url = f"{self.server_url}/api/view"
                params = {
                    "filename": filename,
                    "type": "output"
                }
                if subfolder:
                    params["subfolder"] = subfolder
                download_url = f"{base_url}?{urlencode(params)}"
                
            logger.info(f"📥 Downloading file: {filename}{' (subfolder: ' + subfolder + ')' if subfolder else ''}")
            
            # Try the two-step approach for downloading
            # Step 1: Prepare authentication
            if is_video:
                self.prepare_video_for_viewing(download_url)
            
            # Step 2: Download the file
            response = self.session.get(
                download_url,
                headers=self._get_video_headers() if is_video else self._get_headers(),
                stream=True
            )
            
            if response.status_code == 200:
                # Ensure output directory exists
                os.makedirs(output_dir, exist_ok=True)
                
                # Define output path
                output_path = os.path.join(output_dir, filename)
                
                # Save the file
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                
                logger.info(f"✅ Downloaded file to: {output_path}")
                return output_path
            else:
                logger.error(f"❌ Download failed: {response.status_code} - {response.text}")
                
                # Try a different approach - direct download with API key in both headers and URL
                logger.info("🔄 Trying direct download with API key...")
                direct_url = f"{download_url}&api_key={self.api_key}"
                direct_response = requests.get(
                    direct_url,
                    headers=self._get_video_headers() if is_video else self._get_headers(),
                    stream=True
                )
                
                if direct_response.status_code == 200:
                    # Ensure output directory exists
                    os.makedirs(output_dir, exist_ok=True)
                    
                    # Define output path
                    output_path = os.path.join(output_dir, filename)
                    
                    # Save the file
                    with open(output_path, 'wb') as f:
                        for chunk in direct_response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    
                    logger.info(f"✅ Downloaded file to: {output_path} (direct method)")
                    return output_path
                else:
                    logger.error(f"❌ Direct download also failed: {direct_response.status_code}")
                    return None
                
        except Exception as e:
            logger.error(f"❌ Error downloading file: {str(e)}")
            return None
    
    def get_queue_status(self, prompt_id: str) -> Dict[str, Any]:
        """
        Get the queue status of a workflow from the ComfyUI API
        
        Returns:
            Dict with queue information including position and progress
        """
        try:
            url = f"{self.server_url}/prompt"
            response = self.session.get(url)
            
            queue_info = {
                "queue_position": None,
                "queue_remaining": None,
                "queue_size": 0,
                "queue_running": False,
                "is_in_queue": False,  # Flag to indicate if prompt is in any queue
                "queue_details": {}
            }
            
            if response.status_code == 200:
                queue_data = response.json()
                
                # Check if the prompt is in queue_running array
                if "queue_running" in queue_data and queue_data["queue_running"]:
                    for item in queue_data["queue_running"]:
                        # queue_running items are arrays with prompt_id at index 1
                        if isinstance(item, list) and len(item) > 1 and item[1] == prompt_id:
                            queue_info["queue_position"] = 0
                            queue_info["queue_running"] = True
                            queue_info["is_in_queue"] = True
                            logger.debug(f"Prompt {prompt_id} is currently running")
                            break
                
                # Check if the prompt is in queue_pending array
                if "queue_pending" in queue_data and not queue_info["is_in_queue"]:
                    queue_pending = queue_data["queue_pending"]
                    queue_info["queue_size"] += len(queue_pending)
                    
                    # Find our prompt's position in pending queue
                    for idx, item in enumerate(queue_pending):
                        if isinstance(item, list) and len(item) > 1 and item[1] == prompt_id:
                            queue_info["queue_position"] = idx + 1  # +1 because position 0 is running
                            queue_info["queue_remaining"] = idx + 1
                            queue_info["is_in_queue"] = True
                            logger.debug(f"Prompt {prompt_id} is pending at position {idx + 1}")
                            break
                
                # Get executing prompt progress if available
                if queue_info["queue_running"] and "progress" in queue_data and queue_data["progress"] is not None:
                    progress_data = queue_data["progress"]
                    if "value" in progress_data:
                        queue_info["queue_details"]["progress"] = progress_data["value"]
                    if "max" in progress_data:
                        queue_info["queue_details"]["max_progress"] = progress_data["max"]
                    if "node" in progress_data:
                        queue_info["queue_details"]["current_node"] = progress_data["node"]
                
                logger.debug(f"Queue status: {queue_info}")
                return queue_info
            else:
                logger.error(f"❌ Failed to get queue status: {response.status_code} - {response.text}")
                return queue_info
                
        except Exception as e:
            logger.error(f"❌ Error getting queue status: {str(e)}")
            return queue_info

    def wait_for_workflow_completion(self, prompt_id: str, timeout_minutes: int = 120, 
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
        # Calculate timeout
        timeout_seconds = timeout_minutes * 60
        start_time = time.time()
        check_interval = 5.0  # Start with 5 seconds between checks
        last_update_time = 0
        last_queue_check_time = 0
        queue_check_interval = 5.0  # Check queue every 5 seconds
        
        # Wait a moment before first check
        time.sleep(1)
        
        # For tracking which nodes have completed
        known_executed_nodes = set()
        total_nodes = 12  # Our text-to-video workflow has approximately 12 nodes
        
        # Expected node sequence for reporting
        node_descriptions = {
            "11": "Loading T5 encoder model",
            "16": "Encoding text prompt",
            "37": "Preparing latent space",
            "39": "Setting up block swap",
            "22": "Loading video model",
            "38": "Loading VAE model",
            "52": "Configuring tea cache",
            "55": "Setting up video enhancement",
            "27": "Generating frames with sampler",
            "28": "Decoding video frames",
            "30": "Combining frames into video"
        }
        
        # Progress milestones to report for visual feedback
        progress_milestones = {
            "11": 5,    # T5 encoder loading
            "16": 10,   # Text encoding  
            "37": 15,   # Latent space preparation
            "39": 20,   # Block swap setup
            "22": 25,   # Model loading
            "38": 30,   # VAE loading
            "52": 35,   # TeaCache configuration
            "55": 40,   # Video enhancement setup
            "27": 50,   # Frame generation (main work)
            "28": 85,   # Decoding frames  
            "30": 95,   # Combining into video
        }
        
        # Percentage estimates for different stages
        stage_percentages = {
            "11": 5,    # T5 encoder loading
            "16": 10,   # Text encoding  
            "37": 15,   # Latent space preparation
            "39": 20,   # Block swap setup
            "22": 25,   # Model loading
            "38": 30,   # VAE loading
            "52": 35,   # TeaCache configuration
            "55": 40,   # Video enhancement setup
            "27": 50,   # Frame generation (main work)
            "28": 85,   # Decoding frames  
            "30": 95,   # Combining into video
        }
        
        # Progress estimate - video generation usually takes around 5-10 minutes
        # Each frame takes about 15-20 seconds to generate
        estimated_total_time = 600  # 10 minutes estimated total time
        progress_interval = 5  # Update progress every 5 seconds (reduced from 10)
        
        # Flags to track state
        prompt_left_queue = False
        showed_finalizing = False
        consecutive_not_in_queue = 0  # Count consecutive times the prompt is not found in queue
        required_not_in_queue = 5     # Require more consecutive checks before concluding it left the queue
        last_node_executing = None
        
        # Estimate frame-based progress
        frames_per_minute = 3  # Approximately 3 frames per minute (20s per frame)
        generating_progress_base = 40  # Start at 40% when frame generation begins
        generating_progress_max = 85   # Max at 85% before decoding
        
        # Map to keep track of nodes reported as complete for status display
        reported_nodes = set()
        
        while True:
            # Check for timeout
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout_seconds:
                logger.error(f"⏰ Workflow processing timed out after {timeout_minutes} minutes")
                return False
            
            # Check history for completion status first
            is_complete, history_data, error_msg = self.check_workflow_status(prompt_id)
            
            # If we're complete, return immediately
            if is_complete:
                if status_callback:
                    status_callback("100% - Complete")
                logger.info("✅ Workflow completed successfully")
                return True
            
            # Extract data from history_data
            # This could be either directly in history_data or nested in prompt_id key
            outputs = {}
            executing = []
            prompt_data = history_data.get(prompt_id, {}) if history_data else {}
            
            # Check for outputs in both locations
            if prompt_data and "outputs" in prompt_data:
                outputs = prompt_data["outputs"]
            elif history_data and "outputs" in history_data:
                outputs = history_data["outputs"]
            
            # Check for executing nodes in both locations
            if prompt_data and "executing" in prompt_data:
                executing = prompt_data["executing"]
            elif history_data and "executing" in history_data:
                executing = history_data["executing"]
            
            # Quick check for node 30
            if "30" in outputs:
                if status_callback:
                    status_callback("100% - Complete")
                logger.info("✅ Workflow completed successfully (found node 30 output)")
                return True
            
            # Build a progress summary based on completed nodes
            if outputs and status_callback and time.time() - last_update_time > progress_interval:
                executed_nodes = set()
                for node_id in outputs:
                    if node_id.isdigit():  # Only track numbered nodes
                        executed_nodes.add(node_id)
                        
                # Get the highest completed node stage percentage
                completed_percentage = 0
                for node_id in executed_nodes:
                    if node_id in stage_percentages:
                        completed_percentage = max(completed_percentage, stage_percentages[node_id])
                
                # Add nodes that have been completed but not yet reported
                new_completed = executed_nodes - reported_nodes
                if new_completed:
                    # Update reported nodes
                    reported_nodes.update(new_completed)
                    
                    # Find the latest completed node for reporting
                    latest_node = max(new_completed, key=lambda x: int(x) if x.isdigit() else 0)
                    latest_desc = node_descriptions.get(latest_node, f"Step {latest_node}")
                    
                    logger.info(f"✅ Completed node {latest_node}: {latest_desc}")
                    
                    # Update status with the latest completed node
                    status_callback(f"{completed_percentage}% - Completed: {latest_desc}")
                    last_update_time = time.time()
            
            # Check queue status periodically
            if not prompt_left_queue and time.time() - last_queue_check_time > queue_check_interval:
                last_queue_check_time = time.time()
                
                # Get the queue information
                queue_info = self.get_queue_status(prompt_id)
                is_in_queue = queue_info.get("is_in_queue", False)
                queue_position = queue_info.get("queue_position")
                queue_running = queue_info.get("queue_running", False)
                
                # If prompt is in queue
                if is_in_queue:
                    consecutive_not_in_queue = 0  # Reset counter
                    
                    # If we're in the pending queue
                    if queue_position is not None and queue_position > 0:
                        queue_size = queue_info.get("queue_size", 0)
                        if status_callback:
                            status = f"0% - Queued: Position {queue_position} of {queue_size}"
                            status_callback(status)
                        logger.info(f"⌛ Prompt queued at position {queue_position} of {queue_size}")
                        time.sleep(check_interval)
                        continue
                    
                    # If we're running
                    elif queue_running:
                        # Check for progress info in the queue response
                        current_node = None
                        progress_pct = None
                        
                        if "queue_details" in queue_info and "current_node" in queue_info["queue_details"]:
                            current_node = queue_info["queue_details"]["current_node"]
                            last_node_executing = current_node
                            
                            # Update the last node executing
                            if current_node and current_node.isdigit():
                                last_node_executing = current_node
                                
                                # Get progress percentage based on current node
                                if current_node in stage_percentages:
                                    progress_pct = stage_percentages[current_node]
                                    
                                    # If we're in the frame generation stage, estimate progress based on elapsed time
                                    if current_node == "27":  # Generating frames
                                        # Estimate progress based on elapsed time for frame generation
                                        generation_time = elapsed_time - 60  # Subtract time for setup
                                        if generation_time > 0:
                                            # Calculate progress within the generating stage
                                            progress_range = generating_progress_max - generating_progress_base
                                            progress_pct = generating_progress_base + min(progress_range, 
                                                                                        int((generation_time / 240) * progress_range))
                            
                            # If we have a node but no percentage, use the stage percentages
                            if progress_pct is None and current_node in stage_percentages:
                                progress_pct = stage_percentages[current_node]
                        
                        # If no node info, use time-based estimate
                        if progress_pct is None:
                            progress_pct = min(90, int((elapsed_time / estimated_total_time) * 100))
                        
                        # Get node description
                        node_desc = node_descriptions.get(current_node, "Processing")
                        
                        # Update status with specific node name
                        if status_callback and time.time() - last_update_time > progress_interval:
                            last_update_time = time.time()
                            status = f"{progress_pct}% - Processing: {node_desc}"
                            status_callback(status)
                            logger.debug(f"⏳ Current node: {current_node} - {node_desc} ({progress_pct}%)")
                        
                        time.sleep(check_interval)
                        continue
                else:
                    # Not in queue - increment counter
                    consecutive_not_in_queue += 1
                    
                    # Check if there's node activity even if not in queue
                    if executing:
                        # There are executing nodes - we should reset the counter
                        consecutive_not_in_queue = 0
                        logger.debug(f"Prompt not in queue but has executing nodes: {executing}")
                    
                    # Only consider it left the queue after multiple consecutive checks
                    # and when history data shows signs of processing
                    if consecutive_not_in_queue >= required_not_in_queue:
                        # Double check that we have outputs showing we're processing
                        has_outputs = bool(outputs)
                        
                        if has_outputs:
                            logger.info("✓ Prompt has left the execution queue, continuing with history checks")
                            prompt_left_queue = True
                            
                            # Only show finalizing once
                            if not showed_finalizing and status_callback:
                                showed_finalizing = True
                                status = "95% - Finalizing"
                                status_callback(status)
            
            # If there's an error, log it and return failure
            if error_msg and "Error:" in error_msg:
                logger.error(f"❌ Workflow failed: {error_msg}")
                if status_callback:
                    status_callback(f"Error: {error_msg}")
                return False
            
            # If we have history data, track progress with executed nodes
            if outputs:
                executed_nodes = set()
                for node_id in outputs:
                    if node_id.isdigit():  # Only track numbered nodes
                        executed_nodes.add(node_id)
                
                # Report newly executed nodes
                new_executed = executed_nodes - known_executed_nodes
                for node_id in sorted(new_executed, key=int):
                    desc = node_descriptions.get(node_id, f"Step {node_id}")
                    logger.debug(f"✅ Completed node {node_id}: {desc}")
                
                # Update known executed nodes
                known_executed_nodes = executed_nodes
                
                # If we found node 30 in outputs, we're definitely done
                if "30" in executed_nodes:
                    if status_callback:
                        status_callback("100% - Complete")
                    logger.info("✅ Workflow completed successfully")
                    return True
            
            # Check if there are executing nodes
            if executing:
                for node_id in executing:
                    if node_id.isdigit():
                        # Update the last node executing
                        last_node_executing = node_id
                        
                        # Report currently executing node with more detailed description
                        if node_id in node_descriptions and time.time() - last_update_time > progress_interval:
                            desc = node_descriptions[node_id]
                            progress_pct = stage_percentages.get(node_id, 50)
                            
                            # If we're in frame generation, provide more granular updates
                            if node_id == "27":
                                # Calculate progress within the generating stage
                                generation_time = elapsed_time - 60  # Subtract time for setup
                                if generation_time > 0:
                                    progress_range = generating_progress_max - generating_progress_base
                                    progress_pct = generating_progress_base + min(progress_range, 
                                                                                int((generation_time / 240) * progress_range))
                            
                            # Show node-specific progress
                            if status_callback:
                                last_update_time = time.time()
                                status = f"{progress_pct}% - Processing: {desc}"
                                status_callback(status)
                                logger.debug(f"⏳ Processing node {node_id}: {desc} ({progress_pct}%)")
            
            # For time-based progress updates if nothing else is happening
            if time.time() - last_update_time > progress_interval:
                last_update_time = time.time()
                
                # Estimate progress based on elapsed time and last known node
                progress_pct = None
                
                if last_node_executing and last_node_executing in stage_percentages:
                    progress_pct = stage_percentages[last_node_executing]
                    
                    # If in frame generation, estimate progress
                    if last_node_executing == "27":
                        generation_time = elapsed_time - 60
                        if generation_time > 0:
                            progress_range = generating_progress_max - generating_progress_base
                            progress_pct = generating_progress_base + min(progress_range, 
                                                                        int((generation_time / 240) * progress_range))
                
                # Fall back to time-based estimate if we don't have node info
                if progress_pct is None:
                    progress_pct = min(90, int((elapsed_time / estimated_total_time) * 100))
                
                if status_callback:
                    desc = "Processing"
                    if last_node_executing and last_node_executing in node_descriptions:
                        desc = node_descriptions[last_node_executing]
                        
                    status = f"{progress_pct}% - {desc}"
                    status_callback(status)
            
            # Adaptive waiting: increase interval gradually to reduce polling frequency
            check_interval = min(8, check_interval * 1.05)  # Cap at 8 seconds, slower growth
            time.sleep(check_interval) 
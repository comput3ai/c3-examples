import requests
import json
import logging
from typing import Dict, Optional, List, Any

logger = logging.getLogger(__name__)

class Comput3API:
    """Client for interacting with Comput3 API"""
    
    def __init__(self, api_key: str):
        """Initialize with Comput3 API key"""
        self.api_key = api_key
        self.api_url = "https://api.comput3.ai/api/v0/workloads"
        
        if not api_key:
            logger.error("🔑 C3 API key is not provided. Please set your C3_API_KEY in .env file.")
        
    def get_headers(self) -> Dict[str, str]:
        """Get the headers for API requests"""
        return {
            "accept": "/",
            "accept-language": "en,en-US;q=0.9",
            "content-type": "application/json",
            "origin": "https://launch.comput3.ai",
            "referer": "https://launch.comput3.ai/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            "x-c3-api-key": self.api_key
        }
    
    def get_running_workloads(self) -> List[Dict[str, Any]]:
        """Get all running workloads from Comput3 API"""
        if not self.api_key:
            logger.error("❌ Cannot get workloads: C3 API key is missing")
            return []
        
        try:
            response = requests.post(
                self.api_url,
                headers=self.get_headers(),
                json={"running": True}
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to get workloads: {response.status_code} - {response.text}")
                return []
            
            workloads = response.json()
            logger.info(f"🔍 Found {len(workloads)} running workloads")
            return workloads
            
        except Exception as e:
            logger.error(f"❌ Error getting workloads: {str(e)}")
            return []
    
    def get_media_instance(self) -> Optional[Dict[str, Any]]:
        """Get a running media instance if available"""
        workloads = self.get_running_workloads()
        
        # Filter for media instances
        media_instances = [w for w in workloads if w.get("type", "").startswith("media")]
        
        if not media_instances:
            logger.warning("⚠️ No running media instances found")
            return None
        
        # Return the first media instance
        instance = media_instances[0]
        logger.info(f"✅ Found media instance: {instance.get('node')} (type: {instance.get('type')})")
        return instance
    
    def get_comfyui_url(self) -> Optional[str]:
        """Get the ComfyUI URL for a running media instance"""
        instance = self.get_media_instance()
        
        if not instance or "node" not in instance:
            return None
        
        node = instance["node"]
        comfyui_url = f"https://ui-{node}"
        
        # Validate URL format - check for common typos in the node name
        if "comput3.ai" not in node:
            comfyui_url = f"https://ui-{node}.comput3.ai"
            
        logger.info(f"🌐 ComfyUI URL: {comfyui_url}")
        
        # Test connection to URL
        try:
            test_response = requests.head(comfyui_url, timeout=5)
            if test_response.status_code >= 400:
                logger.warning(f"⚠️ ComfyUI URL test failed with status code: {test_response.status_code}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ ComfyUI URL may be incorrect, connection test failed: {str(e)}")
            logger.warning("⚠️ Will attempt to use the URL anyway, but there may be connection issues")
                
        return comfyui_url 
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
        
    def get_fast_instance(self) -> Optional[Dict[str, Any]]:
        """Get a running fast instance if available along with its index in the workload list"""
        workloads = self.get_running_workloads()

        for index, workload in enumerate(workloads):
            if workload.get("type", "").endswith("fast"):
                logger.info(f"✅ Found fast instance at index {index}: {workload.get('node')} (type: {workload.get('type')})")
                # Optionally attach the index to the workload dictionary
                workload["index"] = index
                return workload

        logger.warning("⚠️ No running fast instances found")
        return None
    
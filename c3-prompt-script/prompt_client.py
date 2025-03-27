import requests
import json
import logging
import os
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)

class PromptClient:
    """Client for sending prompts to Comput3 API"""
    
    def __init__(self, api_key: str):
        """Initialize with Comput3 API key"""
        self.api_key = api_key
        self.api_url = "https://app.comput3.ai/0/api/generate"
        
        if not api_key:
            logger.error("🔑 C3 API key is not provided. Please set your C3_API_KEY in .env file.")
    
    def get_headers(self) -> Dict[str, str]:
        """Get the headers for API requests"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def send_prompt(self, prompt: str, model: str = "llama3:70b") -> Optional[Dict[str, Any]]:
        """Send a prompt to the C3 API and return the response"""
        if not self.api_key:
            logger.error("❌ Cannot send prompt: C3 API key is missing")
            return None
        
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            
            logger.info(f"🚀 Sending prompt to model: {model}")
            response = requests.post(
                self.api_url,
                headers=self.get_headers(),
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to send prompt: {response.status_code} - {response.text}")
                return None
            
            logger.info("✅ Successfully received response from model")
            return response.json()
            
        except Exception as e:
            logger.error(f"❌ Error sending prompt: {str(e)}")
            return None
    
    def save_response_to_file(self, response: Dict[str, Any], prompt_num: int, output_dir: str = "./results") -> Optional[str]:
        """Save the model response to a file"""
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Create a filename based on prompt number
            output_file = os.path.join(output_dir, f"response_{prompt_num}.txt")
            
            # Extract the response text from the API response
            response_text = response.get("response", "")
            
            # Write to file
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(response_text)
                
            return output_file
            
        except Exception as e:
            logger.error(f"❌ Error saving response to file: {str(e)}")
            return None

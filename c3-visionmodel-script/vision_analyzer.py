import base64
import requests
import logging
import os
from typing import Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class VisionAnalyzer:
    """Class for analyzing images using vision models on Comput3"""
    
    def __init__(self, node_index: int, api_key: str):
        """Initialize with node index and API key"""
        self.node_index = node_index
        self.api_key = api_key
        self.api_url = f"https://app.comput3.ai/{node_index}/api/generate"
        
    def encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """Encode an image file to base64"""
        try:
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                logger.info(f"✅ Successfully encoded image: {image_path}")
                return encoded_string
        except Exception as e:
            logger.error(f"❌ Error encoding image: {str(e)}")
            return None
    
    def analyze_image(self, image_path: str, prompt: str = None) -> Optional[Dict[str, Any]]:
        """Analyze an image using vision model on Comput3"""
        if not prompt:
            prompt = "Please analyze the image with as much detail as you can, provide detailed description of what you see. Including what you see in the background, the colours and the potential character(s) in the image."
        
        # Encode image to base64
        base64_image = self.encode_image_to_base64(image_path)
        if not base64_image:
            return None
            
        # Prepare payload
        payload = {
            "model": "llama3.2-vision:11b",
            "prompt": prompt,
            "stream": False,
            "images": [base64_image]
        }
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"🔄 Sending analysis request to {self.api_url}")
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to analyze image: {response.status_code} - {response.text}")
                return None
                
            result = response.json()
            logger.info("✅ Successfully received analysis result")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error analyzing image: {str(e)}")
            return None
    
    def save_analysis_to_file(self, analysis_result: Dict[str, Any], image_path: str) -> Optional[str]:
        """Save analysis result to a file in the output directory"""
        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename based on original image name and timestamp
        image_name = os.path.basename(image_path).split('.')[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f"{image_name}_analysis_{timestamp}.txt")
        
        try:
            with open(output_file, "w") as f:
                if "response" in analysis_result:
                    f.write(analysis_result["response"])
                else:
                    f.write(str(analysis_result))
                    
            logger.info(f"✅ Analysis saved to: {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"❌ Error saving analysis: {str(e)}")
            return None

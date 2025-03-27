import os
import argparse
import logging
import sys
import time
from typing import Optional
from dotenv import load_dotenv

from comput3_api import Comput3API
from vision_analyzer import VisionAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def main():
    print("Script starting...")  # Add this line for immediate feedback
    # Load environment variables (assuming C3_API_KEY is in .env)
    load_dotenv()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Analyze images using vision models on Comput3")
    parser.add_argument("-i", "--image", required=True, help="Path to the image file for analysis")
    args = parser.parse_args()
    
    # Validate image path
    if not os.path.exists(args.image):
        logger.error(f"❌ Image file not found: {args.image}")
        sys.exit(1)
    
    # Get API key from environment
    api_key = os.getenv("C3_API_KEY")
    if not api_key:
        logger.error("❌ C3_API_KEY not found in environment variables or .env file")
        sys.exit(1)
    
    # Initialize Comput3 API client
    c3_client = Comput3API(api_key)
    
    # Check for fast GPU instance
    logger.info("🔍 Looking for available fast GPU instances...")
    fast_instance = c3_client.get_fast_instance()
    
    if not fast_instance:
        logger.error("❌ No fast GPU instances found. Please launch a fast instance on Comput3.")
        sys.exit(1)
    
    # Extract node index from instance information
    node_index = fast_instance.get("index")






    logger.info(f"✅  Found fast GPU instance at node index: {node_index}")
    
    # Initialize the vision analyzer
    analyzer = VisionAnalyzer(node_index, api_key)
    
    # Analyze the image
    logger.info(f"🖼️ Analyzing image: {args.image}")
    analysis_result = analyzer.analyze_image(args.image)
    
    if not analysis_result:
        logger.error("❌ Failed to analyze image")
        sys.exit(1)
    
    # Save results to file
    output_file = analyzer.save_analysis_to_file(analysis_result, args.image)
    
    if output_file:
        logger.info(f"✅ Analysis complete! Results saved to: {output_file}")
    else:
        logger.error("❌ Failed to save analysis results")
        sys.exit(1)

if __name__ == "__main__":
    main()

import os
import argparse
import logging
import sys
from typing import List
from dotenv import load_dotenv

from prompt_client import PromptClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def read_prompts_from_file(file_path: str) -> List[str]:
    """Read prompts from a text file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Split by lines and filter out empty lines
            prompts = [line.strip() for line in f.readlines() if line.strip()]
        return prompts
    except Exception as e:
        logger.error(f"❌ Error reading prompts from file: {str(e)}")
        return []

def main():
    print("Script starting...")  # Add this line for immediate feedback
    # Load environment variables (assuming C3_API_KEY is in .env)
    load_dotenv()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Send prompts to large language models on Comput3")
    parser.add_argument("-p", "--prompt-file", required=True, help="Path to the text file containing prompts")
    parser.add_argument("-m", "--model", default="llama3:70b", help="Model name to use (default: llama3:70b)")
    parser.add_argument("-o", "--output-dir", default="./results", help="Directory to save responses (default: ./results)")
    args = parser.parse_args()
    
    # Validate prompt file path
    if not os.path.exists(args.prompt_file):
        logger.error(f"❌ Prompt file not found: {args.prompt_file}")
        sys.exit(1)
    
    # Get API key from environment
    api_key = os.getenv("C3_API_KEY")
    if not api_key:
        logger.error("❌ C3_API_KEY not found in environment variables or .env file")
        sys.exit(1)
    
    # Read prompts from file
    logger.info(f"📄 Reading prompts from: {args.prompt_file}")
    prompts = read_prompts_from_file(args.prompt_file)
    
    if not prompts:
        logger.error("❌ No prompts found in the file or the file is empty")
        sys.exit(1)
        
    logger.info(f"✅ Found {len(prompts)} prompts to process")
    
    # Initialize prompt client
    prompt_client = PromptClient(api_key)
    
    # Process each prompt
    for i, prompt in enumerate(prompts):
        logger.info(f"🔄 Processing prompt {i+1}/{len(prompts)}")
        
        # Send prompt to API
        response = prompt_client.send_prompt(prompt, model=args.model)
        
        if not response:
            logger.error(f"❌ Failed to get response for prompt {i+1}")
            continue
        
        # Save response to file
        output_file = prompt_client.save_response_to_file(response, i+1, args.output_dir)
        
        if output_file:
            logger.info(f"✅ Response saved to: {output_file}")
        else:
            logger.error(f"❌ Failed to save response for prompt {i+1}")
    
    logger.info(f"🎉 All prompts processed! Responses saved to: {args.output_dir}")

if __name__ == "__main__":
    main()

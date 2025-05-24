import os
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Comput3 API configuration
C3_API_KEY = os.getenv('C3_API_KEY')
C3_API_URL = "https://api.comput3.ai/api/v0/workloads"

# Default paths
DEFAULT_OUTPUT_DIR = os.path.join(os.getcwd(), "output")
WORKFLOW_TEMPLATE_PATH = os.path.join(os.getcwd(), "workflows", "text_to_image.json")

# ComfyUI configuration
DEFAULT_TIMEOUT_MINUTES = 30
CHECK_INTERVAL_SECONDS = 10
INITIAL_WAIT_SECONDS = 5 
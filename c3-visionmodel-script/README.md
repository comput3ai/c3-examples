# 🖼️ Comput3 Vision Model Image Analyzer 🤖

A simple Python script to analyze images using Llama 3.2 Vision model on Comput3's GPU infrastructure.

## 📋 What Does This Script Do?

This script allows you to:
1. 🔍 Connect to your running Comput3 GPU instance
2. 🖼️ Send an image for analysis
3. 📝 Get detailed AI description/analysis of the image
4. 💾 Save the results to a text file

## 📁 Project Structure

```
c3-visionmodel-script/
├── main.py               # Entry point - runs the script
├── comput3_api.py        # Handles Comput3 API communication
├── vision_analyzer.py    # Processes images with vision models
├── .env                  # Stores your API key (you need to create this)
└── output/               # Folder where analysis results are saved
    └── image_analysis_TIMESTAMP.txt  # Analysis results
```

## 🚀 Prerequisites

Before you start, you'll need:

- Python 3.6 or higher
- A Comput3 account with API key
- A running "fast" GPU instance on Comput3
- An image file to analyze

## ⚙️ Usage Instructions

1. **Clone or download this repository**:
   ```bash
   git clone <repository-url>
   cd c3-visionmodel-script
   ```

2. **Install required packages**:
   ```bash
   pip install requests python-dotenv
   ```

3. **Create a `.env` file** in the project directory and add your Comput3 API key:
   ```
   C3_API_KEY=your_c3_api_key_here
   ```

   To find your API key:
   - Log in to [Comput3](https://launch.comput3.ai/)
   - Scroll down - Press reveal on the API key
   - Copy the API key and paste in your .env variable.

## 🎮 How to Use

### Step 1: Launch a GPU Instance

Before running the script, make sure you have a running "fast" GPU instance on Comput3:
1. Login to [Comput3](https://launch.comput3.ai/)
2. Launch a "fast" instance type (the script specifically looks for instances with names ending in "fast")
3. Wait for the instance to start running

### Step 2: Run the Script

Use the script with the following command:

```bash
python main.py -i /path/to/your/image.jpg
```

For example:

```bash
python main.py -i ~/Pictures/cat.jpg
```

### Step 3: Find Your Results

The analysis will be saved in the `output` directory with a filename based on the original image name and the current timestamp, for example:
```
output/cat_analysis_20240820_123456.txt
```

## 📋 Example

Running:
```bash
python main.py -i input/c3CodeLama.png
```

Console output:
```
Script starting...
2024-08-20 12:34:56 - INFO - 🔍 Looking for available fast GPU instances...
2024-08-20 12:34:57 - INFO - 🔍 Found 3 running workloads
2024-08-20 12:34:57 - INFO - ✅ Found fast instance at index 0: abc123 (type: gpu-fast)
2024-08-20 12:34:57 - INFO - ✅ Found fast GPU instance at node index: 0
2024-08-20 12:34:57 - INFO - 🖼️ Analyzing image: sample_image.jpg
2024-08-20 12:34:57 - INFO - ✅ Successfully encoded image: sample_image.jpg
2024-08-20 12:34:57 - INFO - 🔄 Sending analysis request to https://app.comput3.ai/0/api/generate
2024-08-20 12:35:10 - INFO - ✅ Successfully received analysis result
2024-08-20 12:35:10 - INFO - ✅ Analysis saved to: /home/user/c3-visionmodel-script/output/sample_image_analysis_20240820_123510.txt
2024-08-20 12:35:10 - INFO - ✅ Analysis complete! Results saved to: /home/user/c3-visionmodel-script/output/sample_image_analysis_20240820_123510.txt
```

## ❓ Troubleshooting

### API Key Issues
- Error: `C3_API_KEY not found in environment variables or .env file`
  - Solution: Make sure you've created a `.env` file with your API key as shown above

### No GPU Instances
- Error: `No fast GPU instances found. Please launch a fast instance on Comput3`
  - Solution: Log in to Comput3 and launch a "fast" GPU instance before running the script

### Image File Issues
- Error: `Image file not found`
  - Solution: Double-check the path to your image and make sure it exists

### Analysis Errors
- If you encounter errors during analysis, check:
  - Your Comput3 account has sufficient credits
  - The GPU instance is still running
  - The image format is supported (JPG, PNG, etc.)

## 🔄 Advanced Usage

You can modify the default prompt by editing the `vision_analyzer.py` file. Look for the `analyze_image` method and change the default prompt string to customize what the AI focuses on when analyzing your images.

## 🛠️ Contributing

Feel free to fork this project and enhance it with your own features!

## 📜 License

This project is licensed under MIT License - see the LICENSE file for details

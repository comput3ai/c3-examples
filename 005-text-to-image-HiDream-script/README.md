# 🎨 Comput3 Text-to-Image Generator

Generate high-quality images from text prompts using ComfyUI through the Comput3 platform.

## ✅ Prerequisites

1. 🔑 A Comput3 account with API key (get it from [launch.comput3.ai](https://launch.comput3.ai))
2. 🐍 Python 3.7 or higher
3. 🖥️ A running media instance on Comput3 (media:fast type)

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/comput3ai/c3-examples.git
   cd c3-examples/005-text-to-image-HiDream-script
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Comput3 API key:
   ```bash
   cp .env.example .env
   # Edit the .env file and add your API key
   ```
   
   Your `.env` file should contain:
   ```
   C3_API_KEY=your_c3_api_key_here
   ```

4. Create output directory for images (if it doesn't exist):
   ```bash
   mkdir -p output
   ```

## 📋 Usage

### 🖥️ Launching a Media Instance

Before using this tool, you need to have a media instance running on Comput3. You can launch one through:

1. The web interface at [launch.comput3.ai](https://launch.comput3.ai)
2. The c3-launcher CLI tool from [GitHub](https://github.com/comput3/c3-launcher)

### 🎭 Generating an Image

Once you have a media instance running, you can generate an image using:

```bash
python main.py --prompt "Your detailed text description here"
```

Options:
- `--prompt`, `-p`: 📝 Positive text prompt describing what you want in the image (required)
- `--negative-prompt`, `-n`: ❌ Negative text prompt describing what you don't want (default: "blurry, low quality, distorted, deformed")
- `--width`, `-W`: 📏 Width of the generated image (default: 1024)
- `--height`, `-H`: 📏 Height of the generated image (default: 1024)
- `--steps`, `-s`: 🔄 Number of sampling steps (default: 35)
- `--seed`: 🎲 Random seed for reproducible results (default: random)
- `--output-dir`, `-o`: 📁 Directory to save output files (default: `./output`)
- `--timeout`, `-t`: ⏱️ Timeout in minutes (default: 30)
- `--verbose`, `-v`: 🔍 Enable verbose logging

### 💡 Examples

Generate an image of a fantasy landscape:
```bash
python main.py --prompt "A mystical floating island with waterfalls, lush vegetation, and a small castle, fantasy art style with dramatic lighting"
```

Generate a portrait with custom dimensions:
```bash
python main.py --prompt "Portrait of a young woman with flowers in her hair, digital art style" --width 768 --height 1024
```

Use a specific seed for reproducible results:
```bash
python main.py --prompt "A cyberpunk cityscape at night with neon lights and flying cars" --seed 42
```

## 📁 Project Structure

The project follows a simple structure that makes it easy to understand and modify:

```
007-text-to-image-script/
├── config.py              # Configuration and environment variables
├── comfyui_client.py      # ComfyUI client for workflow execution
├── main.py                # Main script entry point
├── workflows/             # ComfyUI workflow templates
│   └── text_to_image.json # Workflow template for text-to-image generation
├── output/                # Generated images will be saved here
├── .env                   # Your API key (not committed to Git)
├── README.md              # This documentation
└── requirements.txt       # Python dependencies
```

## ⚙️ How It Works

1. 🔍 The script checks if you have a running media instance on Comput3
2. 📋 It loads and validates the text-to-image workflow template
3. 🔄 It updates the workflow with your prompts and parameters
4. 🚀 It queues the workflow for execution and monitors progress
5. 📥 Once complete, it downloads the generated image to the output directory

## 📝 Tips for Better Results

1. **Detailed Prompts**: The more detailed your prompt, the better the results. Include:
   - Subject description (what/who is in the image)
   - Setting (where the subject is)
   - Style (artistic style, medium, etc.)
   - Lighting, mood, and atmosphere

2. **Negative Prompts**: Use negative prompts to avoid unwanted elements:
   - Quality issues: "blurry, pixelated, low quality, distorted"
   - Unwanted elements: "text, watermark, signature, deformed limbs"

3. **Experiment with Settings**:
   - More steps (35-50) generally produce better quality but take longer
   - Try different dimensions depending on your needs (portrait vs. landscape)
   - Use a specific seed if you find a good result and want to make minor variations

## ❓ Troubleshooting

If you encounter issues:

1. **🔴 No running media instance found**
   - Launch a media instance on Comput3 before running the script
   - Make sure to use a "media:fast" instance type

2. **⏰ Workflow timeout**
   - Try increasing the timeout with `--timeout 30`
   - Check if your media instance is still running

3. **🔑 API key issues**
   - Ensure your C3_API_KEY is correctly set in the .env file
   - The API key should start with "c3_api_"
   - Check that your account has access to the ComfyUI service

4. **❌ Image download failures**
   - The script uses a robust process to authenticate and download images
   - If download fails, check your network connection and API key

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 

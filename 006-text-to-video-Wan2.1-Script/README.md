# 🎬 Comput3 Text-to-Video Generator

Generate high-quality videos from text prompts using ComfyUI through the Comput3 platform. This tool uses the WanVideo model to transform your text descriptions into dynamic animated videos.

## ✨ Features

- 🎨 Generate videos from text prompts using state-of-the-art WanVideo model
- 📏 Customize video dimensions, frame count, FPS, and sampling steps
- 📊 Real-time progress display with detailed node-by-node status updates
- 📥 Automatic video downloading and caching capabilities
- 🗃️ Robust error handling and timeout management

## ✅ Prerequisites

1. 🔑 A Comput3 account with API key (get it from [launch.comput3.ai](https://launch.comput3.ai))
2. 🐍 Python 3.7 or higher
3. 🖥️ A running media instance on Comput3 (media:fast type recommended)

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/comput3ai/c3-examples.git
   cd c3-examples/008-text-to-video-script
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

4. Create output directory (if it doesn't exist):
   ```bash
   mkdir -p output
   ```

## 📋 Usage

### 🖥️ Launching a Media Instance

Before using this tool, you need to have a media instance running on Comput3. You can launch one through:

1. The web interface at [launch.comput3.ai](https://launch.comput3.ai)
2. The c3-launcher CLI tool from [GitHub](https://github.com/comput3/c3-launcher)

### 🎭 Generating a Video

Once you have a media instance running, you can generate a video using:

```bash
python3 main.py --prompt "high quality nature video featuring a red panda balancing on a bamboo stem while a bird lands on its head"
```

Options:
- `--prompt`, `-p`: ✏️ Text prompt describing the video to generate (required)
- `--negative-prompt`, `-n`: ❌ Negative prompt to guide generation away from unwanted content
- `--width`, `-W`: 📏 Width of the generated video (default: 832)
- `--height`, `-H`: 📏 Height of the generated video (default: 480)
- `--frames`, `-f`: 🎞️ Number of frames to generate (default: 48)
- `--fps`: 🎥 Frames per second for the output video (default: 24)
- `--steps`, `-s`: 🔄 Number of sampling steps (default: 25)
- `--seed`: 🎲 Random seed for reproducible results (default: random)
- `--output-dir`, `-o`: 📁 Directory to save output files (default: `./output`)
- `--timeout`, `-t`: ⏱️ Timeout in minutes (default: 120)
- `--cache`: 🗃️ Cache videos for faster access in case of network issues
- `--cache-dir`: 📂 Directory to store cached videos (default: `./cache`)
- `--verbose`, `-v`: 🔍 Enable verbose logging

### 💡 Examples

Basic usage:
```bash
python3 main.py -p "cinematic shot of a spaceship landing on an alien planet with two moons in the sky"
```

With custom parameters:
```bash
python3 main.py -p "underwater scene of a coral reef with colorful fish" -n "blurry, low quality, poor lighting, text, watermark" --width 640 --height 360 --frames 24 --fps 30 --steps 30 --seed 42
```

Generate a longer video with more frames:
```bash
python3 main.py -p "timelapse of a blooming flower in a garden" --frames 96
```

With caching enabled:
```bash
python3 main.py -p "time lapse of a blooming flower" --cache
```

## 📁 Project Structure

The project follows a modular structure that makes it easy to understand and modify:

```
008-text-to-video-script/
├── config.py              # Configuration and environment variables
├── comput3_api.py         # API client for Comput3
├── comfyui_client.py      # ComfyUI client for workflow execution
├── main.py                # Main script entry point
├── workflows/             # ComfyUI workflow templates
│   └── text_to_video.json # The WanVideo workflow
├── input/                 # Directory for optional input files
├── output/                # Generated videos will be saved here
├── cache/                 # Cached videos for faster access
├── debug/                 # Debugging information for workflows
├── .env.example           # Example environment file
├── .env                   # Your API key (not committed to Git)
├── README.md              # This documentation
└── requirements.txt       # Python dependencies
```

### 🔧 Key Components

- **main.py**: Entry point script that orchestrates the entire process
- **comput3_api.py**: Handles communication with the Comput3 API
- **comfyui_client.py**: Manages interaction with the ComfyUI instance
- **config.py**: Loads environment variables and default configuration
- **workflows/text_to_video.json**: The ComfyUI workflow template with WanVideo model

## ⚙️ How It Works

1. 🔍 The script checks if you have a running media instance on Comput3
2. 📋 It loads the WanVideo workflow template
3. 🔄 It updates the workflow with your text prompt and parameters
4. 🚀 It queues the workflow for execution and monitors progress with real-time updates
5. 📥 Once complete, it downloads the generated video to the output directory
6. 🗃️ It optionally caches the video for faster access in case of network issues

## 📊 Progress Reporting

This tool provides detailed progress updates during video generation:

- 🔄 Real-time progress bar showing percentage complete
- 📝 Node-specific status updates (e.g., "Loading model", "Generating frames")
- ⏱️ Time-based estimation for longer operations
- ⚠️ Detailed error reporting for troubleshooting

## 🎮 WanVideo Model

This script uses the WanVideo model from Warp Diffusion, which is particularly good at:

- Creating smooth, natural motion in videos
- Following detailed text descriptions
- Generating high-quality, consistent frames
- Producing videos with good temporal coherence

The workflow is set up to use the Wan2_1-T2V-14B model, which provides a good balance of quality and speed.

## 🎛️ Parameter Tuning

To get the best results:

- **Width & Height**: Aspect ratio of 16:9 works well (like 832x480). Higher resolutions require more VRAM.
- **Frames**: More frames = longer video, but requires more processing time. Start with 16-24 frames.
- **FPS**: 24fps gives a cinematic look, 30fps is smoother for motion.
- **Steps**: Higher values (25-35) give better quality but take longer to process.
- **Seed**: Use the same seed to recreate a video with variations in other parameters.

## ❓ Troubleshooting

If you encounter issues:

1. **🔴 No running media instance found**
   - Launch a media instance on Comput3 before running the script
   - Make sure to use a "media:fast" or "media:large" instance type

2. **⏰ Workflow timeout**
   - Try increasing the timeout with `--timeout 180`
   - Complex prompts may require more processing time
   - Check if your media instance is still running

3. **🔑 API key issues**
   - Ensure your C3_API_KEY is correctly set in the .env file
   - The API key should start with "c3_api_"
   - Check that your account has access to the ComfyUI service

4. **📉 Poor results**
   - Improve your prompt with more details
   - Add a stronger negative prompt to guide the generation
   - Try running with different seed values

5. **📥 Download issues**
   - If videos fail to download, try using the `--cache` option
   - Check if there's sufficient disk space
   - Try running the script again with the same parameters to resume

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 
# 🎬 Comput3 Avatar Generator (Node.js)

Generate talking head avatars using ComfyUI through the Comput3 platform. This tool takes a portrait image and an audio file as input, and produces an animated video of the portrait speaking the audio.

## ✅ Prerequisites

1. 🔑 A Comput3 account with API key (get it from [launch.comput3.ai](https://launch.comput3.ai))
2. 🟢 Node.js 16.x or higher
3. 🖥️ A running media instance on Comput3 (media:fast type recommended)

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/comput3ai/c3-examples/c3-comfyUI-script-nodejs.git
   ```

2. Install dependencies:
   ```bash
   cd c3-comfyUI-script-nodejs
   npm install
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

4. Create input directory for your files (if it doesn't exist):
   ```bash
   mkdir -p input output
   ```

## 📋 Usage

### 🖥️ Launching a Media Instance

Before using this tool, you need to have a media instance running on Comput3. You can launch one through:

1. The web interface at [launch.comput3.ai](https://launch.comput3.ai)
2. The c3-launcher CLI tool from [GitHub](https://github.com/comput3/c3-launcher)

### 🎭 Generating an Avatar

Once you have a media instance running, you can generate an avatar using:

```bash
node main.js --image /path/to/portrait.jpg --audio /path/to/speech.mp3
```

Options:
- `--image`, `-i`: 🖼️ Path to portrait image file (required)
- `--audio`, `-a`: 🔊 Path to audio file (required)
- `--output-dir`, `-o`: 📁 Directory to save output files (default: `./output`)
- `--timeout`, `-t`: ⏱️ Timeout in minutes (default: 15)
- `--verbose`, `-v`: 🔍 Enable verbose logging

### 💡 Examples

Using the sample files included in the repository:
```bash
node main.js -i input/lama4.png -a input/audio.mp3
```

Using custom files:
```bash
node main.js -i examples/portrait.jpg -a examples/welcome.mp3
```

## 📁 Project Structure

The project follows a modular structure that makes it easy to understand and modify:

```
comput3-avatar-generator-nodejs/
├── config.js              # Configuration and environment variables
├── comput3_api.js         # API client for Comput3
├── comfyui_client.js      # ComfyUI client for workflow execution
├── main.js                # Main script entry point
├── workflows/             # ComfyUI workflow templates
│   └── avatar_generator.json
├── input/                 # Directory for input files
│   ├── lama4.png          # Sample portrait image
│   └── audio.mp3          # Sample audio file
├── output/                # Generated videos will be saved here
├── examples/              # Additional example files
├── .env.example           # Example environment file
├── .env                   # Your API key (not committed to Git)
├── README.md              # This documentation
└── package.json           # Node.js dependencies
```

### 🔧 Key Components

- **main.js**: Entry point script that orchestrates the entire process
- **comput3_api.js**: Handles communication with the Comput3 API
- **comfyui_client.js**: Manages interaction with the ComfyUI instance
- **config.js**: Loads environment variables and default configuration
- **workflows/avatar_generator.json**: The ComfyUI workflow template

## ⚙️ How It Works

1. 🔍 The script checks if you have a running media instance on Comput3
2. 📤 It uploads your portrait image and audio file to the ComfyUI server
3. 🔄 It loads and updates the workflow template with your inputs:
   - 🖼️ Automatically determines optimal image dimensions based on aspect ratio
   - ⏱️ Analyzes audio file duration and sets the animation duration:
     - Extracts precise audio length (e.g., 3.5 seconds)
     - Rounds up to the next whole second (→ 4 seconds)
     - Adds a safety margin to ensure complete coverage
   - 🎭 Updates specific nodes in the workflow (LoadImage, SONIC_PreData, etc.)
4. 🚀 It queues the workflow for execution and monitors progress
5. 📥 Once complete, it downloads the generated video to the output directory

## 📝 Requirements for Input Files

### 🖼️ Portrait Image
- Should be a clear face portrait (closeup)
- Common formats: JPG, PNG
- Will be automatically resized based on aspect ratio

### 🔊 Audio File
- Common formats: MP3, WAV, FLAC
- Clear speech works best
- Duration is automatically detected and used to set animation length

## 🧩 Extending the Project

The modular design makes it easy to extend the project:

1. **Custom Workflows**: Add new workflow templates to the `workflows/` directory
2. **Additional Models**: Modify the workflow to use different ComfyUI models
3. **UI Integration**: The API clients can be integrated into web or desktop applications

## ❓ Troubleshooting

If you encounter issues:

1. **🔴 No running media instance found**
   - Launch a media instance on Comput3 before running the script
   - Make sure to use a "media:fast" instance type

2. **🔴 Failed to process image**
   - Ensure your image contains a clear face portrait (closeup)
   - "bbox_s" errors occur when the model cannot detect a face in the image
   - Try a different image with a more visible face

3. **⏰ Workflow timeout**
   - Try increasing the timeout with `--timeout 30`
   - Check if your media instance is still running

4. **🔑 API key issues**
   - Ensure your C3_API_KEY is correctly set in the .env file
   - The API key should start with "c3_api_"
   - Check that your account has access to the ComfyUI service

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 
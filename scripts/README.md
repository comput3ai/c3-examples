# 🚀 Comput3 Examples

This repository contains example scripts and tools to help you quickly get started with Comput3's AI infrastructure. These examples demonstrate how to utilize C3's GPU instances for various AI tasks from image analysis to avatar generation, showing the power and flexibility of the Comput3 platform.

## 📂 Available Examples

### 🖥️ [001-comfyui-webui](./001-comfyui-webui)
Create Studio Ghibli-style speaking portrait animations using ComfyUI directly through Comput3's web interface. All necessary assets are included to get started immediately.

**Key Features:**
- Generate talking head animations with ComfyUI workflows
- Easy-to-follow instructions for the web interface
- Includes sample audio and image files

### 🎬 [002-comfyui-script](./002-comfyui-script)
Generate talking head avatars using ComfyUI through the Comput3 platform via a Python script. This tool takes a portrait image and an audio file as input, then produces an animated video of the portrait speaking the audio.

**Key Features:**
- Creates realistic talking head animations
- Processes portrait images and audio inputs
- Uses ComfyUI workflows on Comput3's media instances
- Automatically adapts to different audio durations

### 🤖 [003-prompt-script](./003-prompt-script)
A Python script for sending multiple prompts to large language models running on Comput3's infrastructure and saving the responses. Perfect for batch processing text generation tasks.

**Key Features:**
- Processes multiple prompts from a text file
- Supports various Comput3 language models (default: llama3:70b)
- Saves model responses as individual text files
- Simple command-line interface for ease of use

### 🖼️ [004-visionmodel-script](./004-visionmodel-script)
A Python script for analyzing images using the Llama 3.2 Vision model on Comput3's GPU infrastructure. Simply provide an image, and the script will generate a detailed analysis of its contents.

**Key Features:**
- Connects to Comput3's GPU instances automatically
- Processes images through Llama 3.2 Vision model
- Saves detailed AI descriptions to text files
- Handles different image formats

### 🎨 [005-text-to-image-HiDream-script](./005-text-to-image-HiDream-script)
Generate high-quality images from text prompts using ComfyUI through the Comput3 platform. This script helps you create stunning images based on detailed text descriptions.

**Key Features:**
- Converts text descriptions into high-quality images
- Customizable image dimensions, sampling steps, and seeds
- Support for both positive and negative prompts
- Uses ComfyUI workflows on Comput3's media instances

### 🎬 [006-text-to-video-Wan2.1-Script](./006-text-to-video-Wan2.1-Script)
Generate high-quality videos from text prompts using ComfyUI with the WanVideo model through the Comput3 platform. Transform your text descriptions into dynamic animated videos.

**Key Features:**
- Creates videos from text descriptions using WanVideo model
- Customizable video dimensions, frame count, FPS, and sampling steps
- Real-time progress display with detailed status updates
- Includes caching capabilities for faster access and recovery

## 🚀 Getting Started

1. Clone this repository
2. Sign up for a Comput3 account at [launch.comput3.ai](https://launch.comput3.ai)
3. Create a `.env` file in each example directory with your API key
4. Follow the detailed README in each example directory for specific usage instructions

## 🔑 API Key

All examples require a Comput3 API key. You can obtain your key by:
1. Logging into [Comput3](https://launch.comput3.ai/)
2. Finding your API key, scroll down - press reveal and copy the API key
3. Adding it to a `.env` file in each example directory

## 📚 Documentation

For more detailed information about Comput3's services and API, visit [comput3.ai](https://www.comput3.ai)

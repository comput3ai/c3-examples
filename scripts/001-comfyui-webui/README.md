# 🎨 ComfyUI WebUI - Complete Creative Toolkit

This collection demonstrates various AI-powered creative workflows using ComfyUI on Comput3 AI, from generating images to creating animations and speaking portraits.

## 🚀 Getting Started

1. Log in at [launch.comput3.ai](https://launch.comput3.ai) with your Phantom wallet
   - New users get up to one free hour of GPU time

2. Select MediaFast Workload and Launch
   - Wait for the UI to load
   - Click ComfyUI

## 📚 Available Workflows

### 🖼️ Text to Image - HiDream Style
**File:** `text-to-Image-HiDream.json`

Create beautiful, high-quality images from text descriptions using the HiDream model.

**How to use:**
1. Load the workflow in ComfyUI
2. **Positive Prompt:** Describe what you want to see in detail
3. **Negative Prompt:** Specify what you DON'T want (already pre-filled with good defaults)
4. Click **Queue Prompt** and watch your imagination come to life! ✨

**Tips:**
- Be descriptive in your prompts for better results
- The workflow uses Studio Ghibli style by default
- Experiment with different art styles in your prompts

---

### 🔄 Image to Image Transformation
**File:** `image-to-image.json`

Transform existing images into new styles while preserving the original composition.

**How to use:**
1. Load the workflow in ComfyUI
2. **Upload Image:** Click the LoadImage node and upload your source image
3. **Positive Prompt:** Describe the style or changes you want
4. **Negative Prompt:** Specify what to avoid (pre-configured)
5. **Denoise Strength:** Adjust in the KSampler (0.7 = moderate change, 1.0 = complete transformation)
6. Click **Queue Prompt** to see your image transformed! 🎭

**Perfect for:**
- Style transfers (photo → painting, realistic → cartoon)
- Color scheme changes
- Artistic interpretations of existing images

---

### 🎬 Image to Video Animation
**File:** `image-to-video.json`

⚠️ *Currently being prepared - coming soon!*

Bring your static images to life with AI-generated animations.

**Planned features:**
- Upload any image and animate it
- Control animation strength with denoise settings
- Adjust video length and frame rate
- Add motion descriptions via prompts

---

### 🎥 Text to Video Generation
**File:** `text-to-video.json`

Create stunning videos from text descriptions using the WanVideo model.

**How to use:**
1. Load the workflow in ComfyUI
2. **Text Prompt:** Describe your video scene in detail
3. **Negative Prompt:** Specify what to avoid (pre-configured in Chinese)
4. **Video Settings:**
   - **Steps:** 25 (quality vs speed trade-off)
   - **CFG:** 6 (how closely to follow prompt)
   - **Frame Rate:** 16 FPS in VHS_VideoCombine node
   - **Frames:** 81 frames in WanVideoEmptyEmbeds node
5. Click **Queue Prompt** and wait for your video! 🎬

**Advanced Settings:**
- **TeaCache:** Speeds up generation (adjust threshold for quality vs speed)
- **Enhance-a-Video:** Increases fidelity (higher values = more detail but can be noisy)
- **Block Swap:** Memory optimization for lower VRAM systems

**Pro Tips:**
- Be very detailed in your prompts for better results
- Video generation takes longer than images - be patient!
- Experiment with different frame counts for shorter/longer videos

---

### 🗣️ Speaking Avatar Creation
**File:** `avatar.json`

Create Studio Ghibli-style speaking portrait animations.

**How to use:**
1. Load the workflow in ComfyUI
2. **Upload Portrait:** Select Load a Portrait Image node → upload `comput3ai_ghibli.png` (or your own)
3. **Upload Audio:** Select Load Audio node → upload `comput3ai.mp3` (or your own)
4. Click **Queue Prompt** and wait for your speaking avatar! 🎭

**Customization:**
- Replace PNG with your own portrait image
- Replace MP3 with your own audio file
- Adjust duration settings for longer audio files

## 🛠️ General Tips

### Memory Management
- If you encounter VRAM issues, try the fp8 weight options in model loaders
- Use block swap settings for better memory efficiency
- Close other applications to free up system RAM

### Quality vs Speed
- Higher step counts = better quality but slower generation
- Lower CFG values = faster but less prompt adherence
- Experiment with samplers (euler, uni_pc, lcm) for different results

### Prompt Engineering
- Be specific and detailed in your descriptions
- Include art style, lighting, mood, and composition details
- Use negative prompts to avoid unwanted elements
- Study the example prompts to understand effective patterns

## 🎯 Next Steps

Ready to dive deeper? Try:
- Combining workflows (generate image → animate it → add voice)
- Creating your own custom prompts and styles
- Experimenting with different model settings
- Building longer video sequences

## 🔗 Resources

- Find more examples at [github.com/comput3ai/c3-examples](https://github.com/comput3ai/c3-examples)
- Join our community for tips and tutorials
- Stay tuned for voice cloning and advanced animation tutorials!

---

*Happy creating! 🚀✨*
# 🎨 AI Media Studio v1.0

**Transform CSV data into stunning visual content with AI-powered generation**

AI Media Studio is a powerful web application that enables bulk generation of images and videos from structured data using ComfyUI workflows. Perfect for game developers, NFT creators, content producers, and anyone who needs to generate large volumes of visual assets with consistent styling but unique attributes.

![AI Media Studio](public/images/logo.png)

## ✨ Key Features

### 📊 **Smart CSV Integration**
- **Upload CSV files** or **choose from curated examples** 
- **Automatic column detection** and validation
- **Smart field mapping** to generation parameters
- **Supports any CSV structure** - characters, items, creatures, products, etc.

### 🎭 **Advanced Prompt Customization**
- **Template-based prompt system** with CSV variable injection
- **Conditional enhancements** based on rarity, type, or any CSV attribute
- **Real-time prompt preview** for all items before generation
- **Rarity-specific styling** (Common, Uncommon, Rare, Epic, Legendary)
- **Attribute-driven descriptions** with dynamic prompt building

### 🎬 **Multi-Modal Generation**
- **Text-to-Image**: High-quality images using Stable Diffusion with HiDream
- **Text-to-Video**: Dynamic videos using WanVideo technology
- **Seamless workflow switching** - change between image and video generation instantly
- **Pre-configured parameters** optimized for each generation type
- **Custom workflow support** - upload your own ComfyUI workflows

### 🖥️ **GPU Workload Management**
- **Multi-GPU parallel processing** - use as many GPUs as you have access to
- **Configurable runtime duration** (15 minutes to 24 hours)
- **Real-time workload monitoring** with health status
- **Auto-scaling generation** across available resources
- **Cost-effective GPU utilization** on C3 infrastructure

### 🎯 **Streamlined Workflow**
- **4-step guided process**: Setup → Upload → Workloads → Generation
- **Fixed navigation sidebars** for easy access
- **Real-time generation monitoring** with progress tracking
- **Batch management** and generation history
- **One-click result downloads**

## 🎮 Use Cases

### **Game Development**
- Generate **200+ unique dragons** with different attributes but consistent art style
- Create **weapon variants** with rarity-based visual enhancements
- Produce **character portraits** for RPGs with attribute-driven features
- Design **item collections** with automatic rarity styling

### **NFT Creation**
- **Bulk NFT generation** from trait spreadsheets
- **Rarity-based visual effects** and styling
- **Metadata-driven artwork** with consistent branding
- **Large collection deployment** (1000s of unique items)

### **Content Production**
- **Product visualization** from catalog data
- **Character designs** for storytelling
- **Asset libraries** for creative projects
- **Marketing materials** with data-driven personalization

### **Creative Projects**
- **Art collections** with systematic variation
- **Style experiments** across datasets
- **Batch prototyping** for concept development
- **Educational content** with visual examples

## 🚀 Getting Started

### **1. Setup Your Environment**
```bash
npm install
npm run dev
```

### **2. Configure Your API**
- Add your C3 API key in the setup step
- Verify connectivity to C3 infrastructure

### **3. Upload Your Data**
- **Option A**: Upload a CSV file with your data structure
- **Option B**: Choose from example datasets (anime characters, fantasy items, etc.)

Example CSV structure:
```csv
name,description,rarity,type,flavor_text
"Fire Dragon","A mighty red dragon","Legendary","Creature","Burns with eternal flame"
"Ice Sword","Crystalline blade of frost","Rare","Weapon","Cold as winter's heart"
```

### **4. Customize Your Prompts**
- Edit prompt templates with CSV variable injection: `{name}`, `{description}`, `{rarity}`
- Configure conditional enhancements for different rarities or types
- Preview generated prompts before starting

### **5. Launch GPU Workloads**
- Select number of GPUs to launch (1-10)
- Choose runtime duration (15 min - 24 hours)
- Monitor workload health and availability

### **6. Generate Content**
- Choose between **Text-to-Image** or **Text-to-Video** workflows
- Select number of items to generate (1 to all)
- Monitor real-time generation progress
- Download results individually or in bulk

## 🛠️ Technical Features

### **Workflow Management**
- **ComfyUI Integration**: Native support for ComfyUI workflow files
- **Parameter Configuration**: Adjust steps, CFG, dimensions, and more
- **Prompt Mapping**: Automatic assignment of CSV data to workflow inputs
- **Custom Workflows**: Upload and configure your own generation pipelines

### **CORS Proxy Configuration**
- **Centralized Netlify Proxy**: Automatic CORS handling in production via main `netlify.toml`
- **Development Flexibility**: Configure custom CORS proxy for local development
- **Fallback Support**: User-configurable proxy options for different hosting environments
- **Environment Variables**: `VITE_COMFYUI_PROXY=netlify` enables centralized proxy routing

### **Smart Generation**
- **Parallel Processing**: Distribute jobs across multiple GPUs
- **Progress Tracking**: Real-time status updates for each generation
- **Error Handling**: Automatic retry logic for failed generations
- **Result Management**: Organized storage and retrieval of generated content

### **User Experience**
- **Dark Theme**: Modern, eye-friendly interface
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live progress and status information
- **Intuitive Navigation**: Fixed sidebars with step-by-step guidance

## 📋 Requirements

- **Node.js** 16+ and npm
- **C3 API Access** for GPU workload management
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)
- **CSV Data** structured with your content attributes

## 🎨 Customization

### **Prompt Templates**
Customize how your CSV data transforms into AI prompts:

```javascript
// Positive prompt template
"{name}, {description}, detailed digital art, fantasy style, high quality, use {rarity} as main styling color"

// Conditional enhancement for legendary items
"if rarity is Legendary: add golden effects, dramatic lighting, epic composition"
```

### **Workflow Parameters**
Fine-tune generation settings:
- **Image**: 1024x1024, 35 steps, CFG 5
- **Video**: 832x480, 25 steps, 81 frames, CFG 6
- **Custom**: Upload your own ComfyUI workflow with custom parameters

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) for:
- **New workflow templates** for different generation types
- **Enhanced prompt engineering** features
- **Additional CSV processing** capabilities
- **UI/UX improvements** and dark theme enhancements

**Repository**: [https://github.com/c3-examples/](https://github.com/c3-examples/)

## 📊 Example Workflows

### **Fantasy Game Assets**
1. Upload CSV with: `name`, `type`, `rarity`, `description`, `abilities`
2. Configure prompts: `{name}, {type}, {description}, fantasy art style, {rarity} quality`
3. Add rarity enhancements: Legendary = golden effects, Epic = magical aura
4. Generate 500+ unique assets with consistent style

### **NFT Collection**
1. Prepare traits CSV: `trait_1`, `trait_2`, `background`, `rarity_score`
2. Set prompts: `character with {trait_1} and {trait_2}, {background} background`
3. Map rarity scores to visual effects
4. Bulk generate entire collection with metadata

### **Product Visualization**
1. Upload product data: `name`, `category`, `features`, `color`
2. Configure: `{name}, {category}, {features}, product photography, {color}`
3. Generate marketing visuals for entire catalog
4. Download high-resolution product images

## 🏆 Success Stories

- **Game Studio**: Generated 1000+ unique creature cards in 2 hours
- **NFT Project**: Created 10,000-piece collection with complex trait system
- **Marketing Agency**: Produced 500+ product visualizations from client data
- **Indie Developer**: Built entire game asset library from spreadsheet

## 📈 Performance

- **Multi-GPU Scaling**: Linear performance improvement with additional GPUs
- **Batch Efficiency**: Process hundreds of items without manual intervention
- **Cost Optimization**: Pay only for GPU time used (15 min minimum)
- **Quality Consistency**: Maintain style coherence across large datasets

## 🔮 Roadmap

- **Image-to-Image workflows** for style transfer
- **Image-to-Video workflows** for animation
- **Avatar generation** with facial expressions
- **Custom model integration** beyond Stable Diffusion
- **API access** for programmatic generation
- **Collaborative workspaces** for team projects

---

## 🚀 **Ready to Transform Your Data into Art?**

**[Launch AI Media Studio](http://localhost:3003) and start generating!**

*Built with ❤️ for creators, developers, and visionaries who need to scale their creative output.* 
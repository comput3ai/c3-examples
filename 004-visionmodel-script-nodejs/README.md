# Comput3 Vision Model Analyzer (Node.js)

A Node.js script for analyzing images using vision models on Comput3.

## Prerequisites

- Node.js (v14 or higher)
- A Comput3 account with API key
- A running fast GPU instance on Comput3

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Comput3 API key:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to add your API key.

## Usage

```
node main.js -i /path/to/your/image.jpg
```

Or using npm:

```
npm start -- -i /path/to/your/image.jpg
```

### Options

- `-i, --image`: Path to the image file for analysis (required)
- `-h, --help`: Show help

## Output

The analysis results will be saved to a text file in the `output` directory. The filename includes the original image name and a timestamp.

## Example

```
node main.js -i ./samples/cat.jpg
```

This will:
1. Check for a running fast GPU instance on Comput3
2. Send the image for analysis using the vision model
3. Save the analysis results to `./output/cat_analysis_20231025_123456.txt` 
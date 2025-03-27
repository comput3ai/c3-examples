# C3 Prompt Script 🤖

This script allows you to send multiple prompts to large language models running on Comput3's infrastructure and save the responses.

## Setup ⚙️

1. Clone this repository
2. Install the required dependencies: 📦
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the root directory with your Comput3 API key: 🔑
   ```
   C3_API_KEY=your_api_key_here
   ```

## Usage 🚀

```
python main.py --prompt-file prompts.txt --model llama3:70b --output-dir ./results
```

### Arguments 📋

- `--prompt-file` or `-p`: Path to a text file containing prompts (one prompt per line)
- `--model` or `-m`: Model name to use (default: llama3:70b)
- `--output-dir` or `-o`: Directory to save responses (default: ./results)

### Example ✨

1. Create a text file with multiple prompts (one prompt per line): ✍️

```
Write a short poem about artificial intelligence.
Explain quantum computing in simple terms.
How would you describe the color blue to someone who has never seen colors?
What are three interesting facts about deep learning?
If you could give one piece of advice to humanity, what would it be?
```

2. Run the script: 🏃

```
python main.py --prompt-file my_prompts.txt
```

3. The responses will be saved in the `./results` directory as individual text files. 💾

## How It Works 🧠

1. The script reads multiple prompts from a text file (one prompt per line). 📄
2. For each prompt, it sends a request to the Comput3 API endpoint. 🌐
3. The responses from the language model are saved as individual text files in the output directory. 📂

## API Endpoint Details 🔌

The script uses the following endpoint to send prompts:

```
https://app.comput3.ai/0/api/generate
```

With the following request format:

```
curl --location 'https://app.comput3.ai/0/api/generate' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data '{
    "model": "llama3:70b",
    "prompt": "YOUR_PROMPT_HERE",
    "stream": false
}'
```

## Troubleshooting

- Ensure your API key is correctly set in the `.env` file
- Check that your prompt file exists and is not empty
- If you get an error about missing dependencies, run `pip install -r requirements.txt`
- If you receive API errors, check your internet connection and verify your API key is valid
- If the model is not loaded yet the first response will take some time to start generating as the model needs to be loaded in.

## Advanced Usage

You can process different models by specifying the model parameter:

```
python main.py --prompt-file prompts.txt --model other-model-name
```

For batch processing of large prompt files, the script will handle each prompt sequentially and save all results.

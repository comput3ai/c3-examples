# C3 Prompt Script (C#) 🤖

This C# application allows you to send multiple prompts to large language models running on Comput3's infrastructure and save the responses.

## Setup ⚙️

1. Clone this repository
2. Build the project: 📦
   ```bash
   dotnet build
   ```
3. Create an `appsettings.json` file in the root directory with your Comput3 API key: 🔑
   ```json
   {
     "C3ApiKey": "your_api_key_here"
   }
   ```

## Usage 🚀

```bash
dotnet run -- --prompt-file prompts.txt --model llama3:70b --output-dir ./results
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

2. Run the application: 🏃

```bash
dotnet run -- --prompt-file my_prompts.txt
```

3. The responses will be saved in the `./results` directory as individual text files. 💾

## How It Works 🧠

1. The application reads multiple prompts from a text file (one prompt per line). 📄
2. For each prompt, it sends a request to the Comput3 API endpoint. 🌐
3. The responses from the language model are saved as individual text files in the output directory. 📂

## API Endpoint Details 🔌

The application uses the following endpoint to send prompts:

```
https://app.comput3.ai/0/api/generate
```

With the following request format:

```json
{
    "model": "llama3:70b",
    "prompt": "YOUR_PROMPT_HERE",
    "stream": false
}
```

## Project Structure 📁

```
c3-prompt-script-csharp/
├── Program.cs             # Main entry point
├── Config/                # Configuration classes
│   └── AppSettings.cs
├── Services/              # Service implementations
│   └── Comput3ApiService.cs
├── Models/                # Data models
│   └── PromptResponse.cs
├── results/              # Directory for output files
├── appsettings.json      # Configuration file
└── README.md             # This documentation
```

## Troubleshooting

- Ensure your API key is correctly set in the `appsettings.json` file
- Check that your prompt file exists and is not empty
- If you get build errors, ensure you have .NET 6.0 or higher installed
- If you receive API errors, check your internet connection and verify your API key is valid
- If the model is not loaded yet the first response will take some time to start generating as the model needs to be loaded in.

## Advanced Usage

You can process different models by specifying the model parameter:

```bash
dotnet run -- --prompt-file prompts.txt --model other-model-name
```

For batch processing of large prompt files, the application will handle each prompt sequentially and save all results.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
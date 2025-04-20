using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.CommandLine;

class Program
{
    static async Task<int> Main(string[] args)
    {
        Console.WriteLine("Script starting...");

        // Setup command line arguments
        var rootCommand = new RootCommand("C# application to send multiple prompts to large language models running on Comput3's infrastructure.");
        
        var promptFileOption = new Option<string>(
            aliases: new[] { "--prompt-file", "-p" },
            description: "Path to a text file containing prompts (one prompt per line)"
        );
        
        var modelOption = new Option<string>(
            aliases: new[] { "--model", "-m" },
            description: "Model name to use",
            getDefaultValue: () => "llama3:70b"
        );
        
        var outputDirOption = new Option<string>(
            aliases: new[] { "--output-dir", "-o" },
            description: "Directory to save responses",
            getDefaultValue: () => "./results"
        );

        rootCommand.AddOption(promptFileOption);
        rootCommand.AddOption(modelOption);
        rootCommand.AddOption(outputDirOption);

        rootCommand.SetHandler(async (string promptFile, string model, string outputDir) =>
        {
            await RunProcessor(promptFile, model, outputDir);
        }, promptFileOption, modelOption, outputDirOption);

        return await rootCommand.InvokeAsync(args);
    }
    
    static async Task RunProcessor(string promptFilePath, string model, string outputDir)
    {
        // Setup logging
        using var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder
                .AddSimpleConsole(options =>
                {
                    options.SingleLine = true;
                    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
                })
                .SetMinimumLevel(LogLevel.Information);
        });
        var logger = loggerFactory.CreateLogger<Program>();

        // If no prompt file is provided, use the default
        if (string.IsNullOrEmpty(promptFilePath))
        {
            promptFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Input", "Prompts.txt");
            logger.LogInformation($"No prompt file specified, using default: {promptFilePath}");
        }

        // Load configuration from appsettings.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        var apiKey = configuration["C3ApiKey"];

        if (!File.Exists(promptFilePath))
        {
            logger.LogError($"❌ Prompt file not found: {promptFilePath}");
            Environment.Exit(1);
        }

        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("❌ C3ApiKey not found in appsettings.json.");
            Environment.Exit(1);
        }

        // Ensure output directory exists
        Directory.CreateDirectory(outputDir);

        // Read prompts
        logger.LogInformation($"📄 Reading prompts from: {promptFilePath}");
        var prompts = ReadPromptsFromFile(promptFilePath, logger);

        if (prompts.Count == 0)
        {
            logger.LogError("❌ No prompts found in the file or the file is empty");
            Environment.Exit(1);
        }

        logger.LogInformation($"✅ Found {prompts.Count} prompts to process");
        logger.LogInformation($"🤖 Using model: {model}");
        logger.LogInformation($"📁 Output directory: {outputDir}");

        var promptClient = new PromptClient(apiKey, loggerFactory.CreateLogger<PromptClient>());

        for (int i = 0; i < prompts.Count; i++)
        {
            logger.LogInformation($"🔄 Processing prompt {i + 1}/{prompts.Count}");

            var response = await promptClient.SendPromptAsync(prompts[i], model);

            if (response == null)
            {
                logger.LogError($"❌ Failed to get response for prompt {i + 1}");
                continue;
            }

            var outputFile = promptClient.SaveResponseToFile(response, i + 1, outputDir);

            if (outputFile != null)
            {
                logger.LogInformation($"✅ Response saved to: {outputFile}");
            }
            else
            {
                logger.LogError($"❌ Failed to save response for prompt {i + 1}");
            }
        }

        logger.LogInformation($"🎉 All prompts processed! Responses saved to: {outputDir}");
    }

    private static List<string> ReadPromptsFromFile(string filePath, ILogger logger)
    {
        try
        {
            return File.ReadAllLines(filePath)
                       .Where(line => !string.IsNullOrWhiteSpace(line))
                       .Select(line => line.Trim())
                       .ToList();
        }
        catch (Exception ex)
        {
            logger.LogError($"❌ Error reading prompts from file: {ex.Message}");
            return new List<string>();
        }
    }
}
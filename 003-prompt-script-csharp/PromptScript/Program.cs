using Microsoft.Extensions.Logging;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Script starting...");

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

        var promptFilePath = Path.Combine(Directory.GetCurrentDirectory(), "Input", "Prompts.txt");
        var model = "llama3:70b";
        var outputDir = "Output";

        if (!File.Exists(promptFilePath))
        {
            logger.LogError($"❌ Prompt file not found: {promptFilePath}");
            Environment.Exit(1);
        }

        var apiKey = "your_c3_api_key_here";
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("❌ C3_API_KEY not found in environment variables.");
            Environment.Exit(1);
        }

        // Read prompts
        logger.LogInformation($"📄 Reading prompts from: {promptFilePath}");
        var prompts = ReadPromptsFromFile(promptFilePath, logger);

        if (prompts.Count == 0)
        {
            logger.LogError("❌ No prompts found in the file or the file is empty");
            Environment.Exit(1);
        }

        logger.LogInformation($"✅ Found {prompts.Count} prompts to process");

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
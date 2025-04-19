using Microsoft.Extensions.Configuration;
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

        var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "Input", "c3CodeLama.png");

        if (string.IsNullOrEmpty(imagePath))
        {
            logger.LogError("❌ Image path not provided.");
            Environment.Exit(1);
        }

        if (!File.Exists(imagePath))
        {
            logger.LogError($"❌ Image file not found: {imagePath}");
            Environment.Exit(1);
        }

        var apiKey = "your_c3_api_key_here";
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("❌ C3_API_KEY not found in environment variables.");
            Environment.Exit(1);
        }

        // Initialize Comput3 API client
        var c3Client = new Comput3API(apiKey, loggerFactory.CreateLogger<Comput3API>());

        // Check for fast GPU instance
        logger.LogInformation("🔍 Looking for available fast GPU instances...");
        var fastInstance = await c3Client.GetFastInstanceAsync();
        int nodeIndex = -1;
        if (fastInstance == null || !fastInstance.TryGetValue("index", out var nodeIndexObj) || !int.TryParse(nodeIndexObj.ToString(), out nodeIndex))
        {
            logger.LogError("❌ No fast GPU instances found. Please launch a fast instance on Comput3.");
            Environment.Exit(1);
        }

        logger.LogInformation($"✅ Found fast GPU instance at node index: {nodeIndex}");

        // Initialize the vision analyzer
        var analyzer = new VisionAnalyzer(nodeIndex, apiKey, loggerFactory.CreateLogger<VisionAnalyzer>());

        // Analyze the image
        logger.LogInformation($"🖼️ Analyzing image: {imagePath}");
        var analysisResult = await analyzer.AnalyzeImageAsync(imagePath);

        if (analysisResult == null)
        {
            logger.LogError("❌ Failed to analyze image");
            Environment.Exit(1);
        }

        // Save results to file
        var outputFile = analyzer.SaveAnalysisToFile(analysisResult, imagePath);

        if (!string.IsNullOrEmpty(outputFile))
        {
            logger.LogInformation($"✅ Analysis complete! Results saved to: {outputFile}");
        }
        else
        {
            logger.LogError("❌ Failed to save analysis results");
            Environment.Exit(1);
        }
    }
}

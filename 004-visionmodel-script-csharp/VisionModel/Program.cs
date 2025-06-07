using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.CommandLine;
using System.CommandLine.Invocation;

class Program
{
    static async Task<int> Main(string[] args)
    {
        Console.WriteLine("Application starting...");

        // Setup command line arguments
        var rootCommand = new RootCommand("C# application to analyze images using Llama 3.2 Vision model on Comput3's GPU infrastructure.");
        var imageOption = new Option<string>(
            aliases: new[] { "--image-path", "-i" },
            description: "Path to the image file to analyze"
        )
        {
            IsRequired = true,

        };
        rootCommand.AddOption(imageOption);

        rootCommand.SetHandler(async (string imagePath) =>
        {
            await RunAnalyzer(imagePath);
        }, imageOption);

        return await rootCommand.InvokeAsync(args);
    }

    static async Task RunAnalyzer(string imagePath)
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

        // Load configuration from appsettings.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        var apiKey = configuration["C3ApiKey"];

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

        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("❌ C3ApiKey not found in appsettings.json.");
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

        // Ensure output directory exists
        var outputDir = Path.Combine(Directory.GetCurrentDirectory(), "Output");
        Directory.CreateDirectory(outputDir);

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

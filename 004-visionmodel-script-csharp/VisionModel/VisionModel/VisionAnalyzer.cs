using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

public class VisionAnalyzer
{
    private readonly int _nodeIndex;
    private readonly string _apiKey;
    private readonly string _apiUrl;
    private readonly ILogger<VisionAnalyzer> _logger;
    private readonly HttpClient _httpClient;

    public VisionAnalyzer(int nodeIndex, string apiKey, ILogger<VisionAnalyzer> logger)
    {
        _nodeIndex = nodeIndex;
        _apiKey = apiKey;
        _apiUrl = $"https://app.comput3.ai/{_nodeIndex}/api/generate";
        _logger = logger;
        _httpClient = new HttpClient();
    }

    public string? EncodeImageToBase64(string imagePath)
    {
        try
        {
            byte[] imageBytes = File.ReadAllBytes(imagePath);
            string base64String = Convert.ToBase64String(imageBytes);
            _logger.LogInformation($"✅ Successfully encoded image: {imagePath}");
            return base64String;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error encoding image: {ex.Message}");
            return null;
        }
    }

    public async Task<Dictionary<string, object>?> AnalyzeImageAsync(string imagePath, string? prompt = null)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            prompt = "Please analyze the image with as much detail as you can, provide detailed description of what you see. Including what you see in the background, the colours and the potential character(s) in the image.";
        }

        var base64Image = EncodeImageToBase64(imagePath);
        if (base64Image == null)
        {
            return null;
        }

        var payload = new
        {
            model = "llama3.2-vision:11b",
            prompt = prompt,
            stream = false,
            images = new[] { base64Image }
        };

        var jsonPayload = JsonSerializer.Serialize(payload);

        var request = new HttpRequestMessage(HttpMethod.Post, _apiUrl);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        try
        {
            _logger.LogInformation($"🔄 Sending analysis request to {_apiUrl}");
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"❌ Failed to analyze image: {response.StatusCode} - {errorContent}");
                return null;
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

            _logger.LogInformation("✅ Successfully received analysis result");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error analyzing image: {ex.Message}");
            return null;
        }
    }

    public string? SaveAnalysisToFile(Dictionary<string, object> analysisResult, string imagePath)
    {
        try
        {
            var projectRoot = Directory.GetParent(AppContext.BaseDirectory)?.Parent?.Parent?.Parent?.FullName;

            var outputDir = Path.Combine(projectRoot, "Output");
            Directory.CreateDirectory(outputDir);

            var imageName = Path.GetFileNameWithoutExtension(imagePath);
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var outputFile = Path.Combine(outputDir, $"{imageName}_analysis_{timestamp}.txt");

            var content = analysisResult.ContainsKey("response")
                ? analysisResult["response"]?.ToString()
                : JsonSerializer.Serialize(analysisResult);

            File.WriteAllText(outputFile, content ?? string.Empty);

            _logger.LogInformation($"✅ Analysis saved to: {outputFile}");
            return outputFile;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error saving analysis: {ex.Message}");
            return null;
        }
    }
}

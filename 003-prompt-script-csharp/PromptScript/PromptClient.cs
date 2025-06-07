using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

public class PromptClient
{
    private readonly string _apiKey;
    private readonly string _apiUrl = "https://app.comput3.ai/0/api/generate";
    private readonly ILogger<PromptClient> _logger;
    private readonly HttpClient _httpClient;

    public PromptClient(string apiKey, ILogger<PromptClient> logger)
    {
        _apiKey = apiKey;
        _logger = logger;
        _httpClient = new HttpClient();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogError("🔑 C3 API key is not provided. Please set your C3_API_KEY in .env file.");
        }
    }

    private Dictionary<string, string> GetHeaders()
    {
        return new Dictionary<string, string>
        {
            { "Authorization", $"Bearer {_apiKey}" },
            { "Content-Type", "application/json" }
        };
    }

    public async Task<Dictionary<string, object>?> SendPromptAsync(string prompt, string model = "llama3:70b")
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogError("❌ Cannot send prompt: C3 API key is missing");
            return null;
        }

        try
        {
            var payload = new
            {
                model,
                prompt,
                stream = false
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, _apiUrl);
            foreach (var header in GetHeaders())
            {
                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
            request.Content = content;

            _logger.LogInformation($"🚀 Sending prompt to model: {model}");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                _logger.LogError($"❌ Failed to send prompt: {response.StatusCode} - {errorText}");
                return null;
            }

            _logger.LogInformation("✅ Successfully received response from model");

            var responseStream = await response.Content.ReadAsStreamAsync();
            var result = await JsonSerializer.DeserializeAsync<Dictionary<string, object>>(responseStream);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error sending prompt: {ex.Message}");
            return null;
        }
    }

    public string? SaveResponseToFile(Dictionary<string, object> response, int promptNum, string outputDir = "Output")
    {
        try
        {
            var projectRoot = Directory.GetParent(AppContext.BaseDirectory)?.Parent?.Parent?.Parent?.FullName;

            var outputFile = Path.Combine(projectRoot, outputDir, $"response_{promptNum}.txt");

            response.TryGetValue("response", out var responseTextObj);
            var responseText = responseTextObj?.ToString() ?? "";

            File.WriteAllText(outputFile, responseText, Encoding.UTF8);

            return outputFile;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error saving response to file: {ex.Message}");
            return null;
        }
    }
}

using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;


public class Comput3API
{
    private readonly string _apiKey;
    private readonly string _apiUrl = "https://api.comput3.ai/api/v0/workloads";
    private readonly ILogger<Comput3API> _logger;
    private readonly HttpClient _httpClient;

    public Comput3API(string apiKey, ILogger<Comput3API> logger)
    {
        _apiKey = apiKey;
        _logger = logger;
        _httpClient = new HttpClient();

        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogError("🔑 C3 API key is not provided. Please set your C3_API_KEY.");
        }
    }

    private Dictionary<string, string> GetHeaders()
    {
        return new Dictionary<string, string>
        {            
            { "content-type", "application/json" },
            { "x-c3-api-key", _apiKey }
        };
    }

    public async Task<List<Dictionary<string, object>>> GetRunningWorkloadsAsync()
    {
        var result = new List<Dictionary<string, object>>();

        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogError("❌ Cannot get workloads: C3 API key is missing");
            return result;
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, _apiUrl)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { running = true }), Encoding.UTF8, "application/json")
            };

            foreach (var header in GetHeaders())
            {
                if (header.Key.ToLower() == "content-type")
                    continue; // Already set by StringContent
                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"❌ Failed to get workloads: {response.StatusCode} - {errorContent}");
                return result;
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var workloads = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(responseContent);

            if (workloads != null)
            {
                _logger.LogInformation($"🔍 Found {workloads.Count} running workloads");
                return workloads;
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error getting workloads: {ex.Message}");
            return result;
        }
    }

    public async Task<Dictionary<string, object>?> GetFastInstanceAsync()
    {
        var workloads = await GetRunningWorkloadsAsync();

        for (int i = 0; i < workloads.Count; i++)
        {
            var workload = workloads[i];
            if (workload.TryGetValue("type", out var typeObj) && typeObj?.ToString()?.EndsWith("fast") == true)
            {
                _logger.LogInformation($"✅ Found fast instance at index {i}: {workload.GetValueOrDefault("node")} (type: {typeObj})");
                workload["index"] = i;
                return workload;
            }
        }

        _logger.LogWarning("⚠️ No running fast instances found");
        return null;
    }
}

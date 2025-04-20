using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NAudio.Wave; // For audio file duration
using Microsoft.Extensions.Logging;
using static System.Net.Mime.MediaTypeNames;
using System.Drawing;
using System.Text.Json.Nodes;

public class ComfyUIClient
{
    private readonly string _serverUrl;
    private readonly string _apiKey;
    private readonly string _clientId;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ComfyUIClient> _logger;

    public ComfyUIClient(string serverUrl, string apiKey, ILogger<ComfyUIClient> logger = null)
    {
        _serverUrl = serverUrl.TrimEnd('/');
        _apiKey = apiKey;
        _logger = logger;
        _httpClient = new HttpClient();
        _clientId = GetClientId().Result;
        _logger?.LogInformation($"🔌 Initialized ComfyUIClient with server URL: {_serverUrl}");
    }

    private async Task<string> GetClientId()
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_serverUrl}/prompt/get_client_id");
            request.Headers.Add("X-C3-API-KEY", _apiKey);
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
                return data["client_id"];
            }
            return Guid.NewGuid().ToString();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning($"⚠️ Failed to get client ID: {ex.Message}");
            return Guid.NewGuid().ToString();
        }
    }

    private Dictionary<string, string> GetHeaders()
    {
        return new Dictionary<string, string>
        {
            { "X-C3-API-KEY", _apiKey }
        };
    }

    public async Task<string> UploadFile(string filePath, string fileType = "input")
    {
        if (!File.Exists(filePath))
        {
            _logger?.LogError($"❌ File not found: {filePath}");
            return null;
        }

        var uploadUrl = $"{_serverUrl}/upload/image";

        try
        {
            using var form = new MultipartFormDataContent();
            using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            var streamContent = new StreamContent(fileStream);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            form.Add(streamContent, "image", Path.GetFileName(filePath));
            form.Add(new StringContent(fileType), "type");

            var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
            foreach (var header in GetHeaders())
                request.Headers.Add(header.Key, header.Value);

            request.Content = form;

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
                _logger?.LogInformation($"✅ File uploaded successfully: {data.GetValueOrDefault("name")}");
                return data.GetValueOrDefault("name")?.ToString();
            }
            else
            {
                _logger?.LogError($"❌ Upload failed: {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Exception during upload: {ex.Message}");
            return null;
        }
    }

    public Dictionary<string, object> LoadWorkflow(string workflowPath)
    {
        try
        {
            var json = File.ReadAllText(workflowPath);
            var workflow = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
            return workflow;
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Error loading workflow from {workflowPath}: {ex.Message}");
            throw;
        }
    }

    public Dictionary<string, object> UpdateWorkflow(Dictionary<string, object> workflow, string imageName, string audioPath)
    {
        var updatedWorkflow = JsonConvert.DeserializeObject<Dictionary<string, object>>(
            JsonConvert.SerializeObject(workflow)
        );

        var audioDuration = GetAudioDuration(audioPath);

        var originalImagePath = Path.Combine(Path.GetDirectoryName(audioPath), imageName);
        if (!File.Exists(originalImagePath))
        {
            var inputDir = Path.Combine(Directory.GetCurrentDirectory(), "input");
            if (Directory.Exists(inputDir))
            {
                var possiblePath = Path.Combine(inputDir, imageName);
                if (File.Exists(possiblePath))
                {
                    originalImagePath = possiblePath;
                }
            }
        }

        var (optimalWidth, optimalHeight) = File.Exists(originalImagePath)
            ? GetOptimalDimensions(originalImagePath)
            : (576, 576);

        if (!File.Exists(originalImagePath))
        {
            _logger?.LogWarning($"⚠️ Could not find original image, using default dimensions: {optimalWidth}x{optimalHeight}");
        }

        foreach (var nodePair in updatedWorkflow)
        {
            var node = nodePair.Value as JObject;
            if (node == null) continue;
            var classType = node["class_type"]?.ToString();
            var inputs = node["inputs"] as JObject;

            if (classType == "LoadImage")
            {
                inputs["image"] = imageName;
                _logger?.LogInformation($"🖼️ Updated LoadImage node with image: {imageName}");
            }
            else if (classType == "Image Resize")
            {
                var originalWidth = inputs.GetValue("resize_width")?.Value<int>() ?? 576;
                var originalHeight = inputs.GetValue("resize_height")?.Value<int>() ?? 576;

                inputs["resize_width"] = optimalWidth;
                inputs["resize_height"] = optimalHeight;
                _logger?.LogInformation($"📐 Updated Image Resize dimensions from {originalWidth}x{originalHeight} to {optimalWidth}x{optimalHeight}");
            }
            else if (classType == "LoadAudio" || classType == "VHS_LoadAudio")
            {
                if (inputs.ContainsKey("audio"))
                {
                    inputs["audio"] = Path.GetFileName(audioPath);
                }
                else if (inputs.ContainsKey("audio_file"))
                {
                    inputs["audio_file"] = $"input/{Path.GetFileName(audioPath)}";
                }
                _logger?.LogInformation($"🔊 Updated audio node with: {Path.GetFileName(audioPath)}");
            }
            else if (classType == "SONIC_PreData" && inputs.ContainsKey("duration"))
            {
                inputs["duration"] = audioDuration;
                _logger?.LogInformation($"⏱️ Set animation duration to {audioDuration} seconds");
            }

            if (nodePair.Key == "33" && classType == "SONIC_PreData")
            {
                inputs["duration"] = audioDuration;
                _logger?.LogInformation($"⏱️ Set node 33 (SONIC_PreData) duration to {audioDuration} seconds");
            }
        }

        return updatedWorkflow;
    }

    public int GetAudioDuration(string audioPath)
    {
        try
        {
            using var reader = new AudioFileReader(audioPath);
            var rawDuration = reader.TotalTime.TotalSeconds;
            var roundedDuration = (int)Math.Ceiling(rawDuration);
            var finalDuration = roundedDuration + 1;
            _logger?.LogInformation($"⏱️ Audio duration: {rawDuration:F2}s → {finalDuration}s (rounded + safety margin)");
            return finalDuration;
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Error getting audio duration: {ex.Message}");
            return 5;
        }
    }

    public (int, int) GetOptimalDimensions(string imagePath)
    {
        try
        {
            using var img = System.Drawing.Image.FromFile(imagePath);
            var width = img.Width;
            var height = img.Height;
            var aspectRatio = (double)width / height;
            _logger?.LogInformation($"📐 Original image dimensions: {width}x{height}, aspect ratio: {aspectRatio:F2}");

            var landscapeDiff = Math.Abs(aspectRatio - (16.0 / 9));
            var portraitDiff = Math.Abs(aspectRatio - (9.0 / 16));
            var squareDiff = Math.Abs(aspectRatio - 1.0);

            if (landscapeDiff <= Math.Min(portraitDiff, squareDiff))
            {
                _logger?.LogInformation("🖼️ Selected landscape format (16:9)");
                return (1024, 576);
            }
            else if (portraitDiff <= Math.Min(landscapeDiff, squareDiff))
            {
                _logger?.LogInformation("🖼️ Selected portrait format (9:16)");
                return (576, 1024);
            }
            else
            {
                _logger?.LogInformation("🖼️ Selected square format (1:1)");
                return (576, 576);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Error determining optimal dimensions: {ex.Message}");
            return (576, 576);
        }
    }

    public async Task<string> QueueWorkflow(Dictionary<string, object> workflow)
    {
        try
        {
            _logger?.LogInformation("🚀 Queueing workflow");
            var payload = new
            {
                prompt = workflow,
                client_id = _clientId
            };

            var jsonPayload = JsonConvert.SerializeObject(payload);
            var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_serverUrl}/prompt");
            foreach (var header in GetHeaders())
                request.Headers.Add(header.Key, header.Value);

            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
                var promptId = result.GetValueOrDefault("prompt_id")?.ToString();
                _logger?.LogInformation($"✅ Workflow queued with ID: {promptId}");
                return promptId;
            }
            else
            {
                _logger?.LogError($"❌ Failed to queue workflow: {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Error queueing workflow: {ex.Message}");
            return null;
        }
    }

    public async Task<Dictionary<string, object>> GetHistory(string promptId)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_serverUrl}/history/{promptId}");
            foreach (var header in GetHeaders())
                request.Headers.Add(header.Key, header.Value);

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
                var res =  JsonConvert.DeserializeObject<Dictionary<string, object>>(JsonConvert.SerializeObject(data[promptId]));
                return res;
            }
            else
            {
                _logger?.LogError($"❌ Failed to get history: {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError($"❌ Error getting history: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> WaitForWorkflowCompletion(string promptId, int timeoutMinutes = 25)
    {
        _logger.LogInformation($"⏳ Waiting for workflow to complete (timeout: {timeoutMinutes} minutes)");

        var startTime = DateTime.UtcNow;
        var timeoutSeconds = timeoutMinutes * 60;

        // Initial wait
        _logger.LogInformation("⏱️ Initial wait period (5 seconds)...");
        Thread.Sleep(5000);

        int attempt = 1;
        while ((DateTime.UtcNow - startTime).TotalSeconds < timeoutSeconds)
        {
            var elapsedMinutes = (DateTime.UtcNow - startTime).TotalMinutes;
            _logger.LogInformation($"🔄 Check attempt #{attempt} (elapsed: {elapsedMinutes:F1} minutes)");

            var (isComplete, _, errorMessage) = await CheckWorkflowStatus(promptId);

            if (!string.IsNullOrEmpty(errorMessage))
            {
                _logger.LogError($"❌ Workflow failed with error: {errorMessage}");
                return false;
            }

            if (isComplete)
            {
                _logger.LogInformation("✅ Workflow completed successfully!");
                return true;
            }

            var remainingTime = (int)(timeoutSeconds - (DateTime.UtcNow - startTime).TotalSeconds);
            _logger.LogInformation($"⏳ Still in progress... Checking again in 30s (timeout in {remainingTime}s)");

            Thread.Sleep(30000); // Sleep 30 seconds
            attempt++;
        }

        _logger.LogError($"⏰ Workflow did not complete within timeout of {timeoutMinutes} minutes");
        return false;
    }

    public async Task<(bool isComplete, Dictionary<string, object>? historyData, string? errorMessage)> CheckWorkflowStatus(string promptId)
    {
        try
        {
            // Get history data
            var historyData = await GetHistory(promptId);

            if (historyData == null)
            {
                return (false, null, null);
            }

            // Check for error status
            if (historyData.ContainsKey("status"))
            {
                var status = JsonConvert.DeserializeObject<Dictionary<string, object>>(JsonConvert.SerializeObject(historyData["status"]));

                if (status != null)
                {
                    if (status.TryGetValue("status_str", out var statusStrObj) && statusStrObj?.ToString() == "error")
                    {
                        var errorMessage = "Workflow execution failed";

                        if (status.TryGetValue("messages", out var messagesObj) && messagesObj is List<object> messages)
                        {
                            foreach (var msgObj in messages)
                            {
                                if (msgObj is List<object> msgList && msgList.Count > 1 && msgList[0]?.ToString() == "execution_error")
                                {
                                    var errorDetails = msgList[1] as Dictionary<string, object>;
                                    if (errorDetails != null)
                                    {
                                        var nodeId = errorDetails.ContainsKey("node_id") ? errorDetails["node_id"]?.ToString() : "unknown";
                                        var nodeType = errorDetails.ContainsKey("node_type") ? errorDetails["node_type"]?.ToString() : "unknown";
                                        var exceptionMessage = errorDetails.ContainsKey("exception_message") ? errorDetails["exception_message"]?.ToString() : "Unknown error";

                                        errorMessage = $"Error in node {nodeId} ({nodeType}): {exceptionMessage}";
                                    }
                                }
                            }
                        }

                        _logger.LogError($"❌ {errorMessage}");
                        return (false, historyData, errorMessage);
                    }

                    if (status.TryGetValue("completed", out var completedObj) && completedObj is bool completed && completed)
                    {
                        return (true, historyData, null);
                    }
                }
            }

            // Check if workflow has outputs
            if (!historyData.ContainsKey("outputs"))
            {
                return (false, historyData, null);
            }

            // Check for VHS_VideoCombine output in node 13
            var outputs = historyData["outputs"] as Dictionary<string, object>;
            bool hasNode13Videos = false;

            if (outputs != null && outputs.TryGetValue("13", out var node13Obj) && node13Obj is Dictionary<string, object> node13Output)
            {
                if (node13Output.TryGetValue("gifs", out var gifsObj) && gifsObj is List<object> gifs && gifs.Count > 0)
                {
                    hasNode13Videos = true;
                }

                if (node13Output.TryGetValue("videos", out var videosObj) && videosObj is List<object> videos && videos.Count > 0)
                {
                    hasNode13Videos = true;
                }
            }

            // Check if workflow is still in queue
            var client = new HttpClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("X-C3-API-KEY", _apiKey);
            var response = client.GetAsync($"{_serverUrl}/queue").Result;

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var queueData = JsonConvert.DeserializeObject<Dictionary<string, object>>(content);

                if (queueData != null)
                {
                    var runningPrompts = new List<string>();
                    var pendingPrompts = new List<string>();

                    if (queueData.TryGetValue("queue_running", out var runningObj) && runningObj is List<object> runningList)
                    {
                        foreach (var item in runningList)
                        {
                            if (item is Dictionary<string, object> runningItem && runningItem.TryGetValue("prompt_id", out var prompt))
                            {
                                runningPrompts.Add(prompt?.ToString() ?? "");
                            }
                        }
                    }

                    if (queueData.TryGetValue("queue_pending", out var pendingObj) && pendingObj is List<object> pendingList)
                    {
                        foreach (var item in pendingList)
                        {
                            if (item is Dictionary<string, object> pendingItem && pendingItem.TryGetValue("prompt_id", out var prompt))
                            {
                                pendingPrompts.Add(prompt?.ToString() ?? "");
                            }
                        }
                    }

                    if (runningPrompts.Contains(promptId) || pendingPrompts.Contains(promptId))
                    {
                        return (false, historyData, null);
                    }

                    if (hasNode13Videos)
                    {
                        return (true, historyData, null);
                    }
                }
            }

            // Final determination based on available information
            if (hasNode13Videos || (historyData.ContainsKey("executed") && historyData["executed"] is bool executed && executed))
            {
                return (true, historyData, null);
            }

            return (false, historyData, null);
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Error checking workflow status: {ex.Message}");
            return (false, null, ex.Message);
        }
    }

    public async Task<List<Dictionary<string, object>>> GetOutputFiles(string promptId)
    {
        var historyData = await GetHistory(promptId);

        if (historyData == null || !historyData.ContainsKey("outputs"))
        {
            return new List<Dictionary<string, object>>();
        }

        var outputs = new List<Dictionary<string, object>>();
        var nodeOutputs = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, object>>>(JsonConvert.SerializeObject(historyData["outputs"]));

        foreach (var nodeEntry in nodeOutputs)
        {
            var nodeId = nodeEntry.Key;
            var nodeOutput = nodeEntry.Value;

            // Check for 'gifs' field
            if (nodeOutput.ContainsKey("gifs"))
            {
                var gifs = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(JsonConvert.SerializeObject(nodeOutput["gifs"]));
                if (gifs != null)
                {
                    foreach (var gifInfo in gifs)
                    {
                        var fileInfo = new Dictionary<string, object>
                        {
                            { "node_id", nodeId },
                            { "type", "video" },
                            { "filename", gifInfo.ContainsKey("filename") ? gifInfo["filename"] : "" },
                            { "subfolder", gifInfo.ContainsKey("subfolder") ? gifInfo["subfolder"] : "" },
                            { "fullpath", gifInfo.ContainsKey("fullpath") ? gifInfo["fullpath"] : "" }
                        };
                        outputs.Add(fileInfo);
                        Console.WriteLine($"📹 Found video: {fileInfo["filename"]}");
                    }
                }
            }

            // Check for 'videos' field
            if (nodeOutput.ContainsKey("videos"))
            {
                var videos = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(JsonConvert.SerializeObject(nodeOutput["videos"]));
                if (videos != null)
                {
                    foreach (var videoInfo in videos)
                    {
                        var fileInfo = new Dictionary<string, object>
                        {
                            { "node_id", nodeId },
                            { "type", "video" },
                            { "filename", videoInfo.ContainsKey("filename") ? videoInfo["filename"] : "" },
                            { "subfolder", videoInfo.ContainsKey("subfolder") ? videoInfo["subfolder"] : "" },
                            { "fullpath", videoInfo.ContainsKey("fullpath") ? videoInfo["fullpath"] : "" }
                        };
                        outputs.Add(fileInfo);
                        Console.WriteLine($"📹 Found video: {fileInfo["filename"]}");
                    }
                }
            }
        }

        return outputs;
    }

    public async Task<string> DownloadFileAsync(string filename, string outputDir, string subfolder = "")
    {
        // Check if the output directory exists, if not, create it
        if (!Directory.Exists(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }

        // Construct the URL
        var queryParams = new Dictionary<string, string> { { "filename", filename } };
        if (!string.IsNullOrEmpty(subfolder))
        {
            queryParams["subfolder"] = subfolder;
        }

        var urlWithParams = $"{_serverUrl}/view?{string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"))}";

        Console.WriteLine($"📥 Downloading: {filename}");

        try
        {
            using (var client = new HttpClient())
            {
                // Set any necessary headers here
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("X-C3-API-KEY", _apiKey);
                var response = await client.GetAsync(urlWithParams, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"❌ Download failed: {response.StatusCode}");
                    return null;
                }

                // Save the file to the output directory
                var outputPath = Path.Combine(outputDir, filename);
                using (var fileStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None))
                using (var responseStream = await response.Content.ReadAsStreamAsync())
                {
                    await responseStream.CopyToAsync(fileStream);
                }

                Console.WriteLine($"💾 File saved to: {outputPath}");
                return outputPath;
            }
        }
        catch (Exception e)
        {
            Console.WriteLine($"❌ Error downloading file: {e.Message}");
            return null;
        }
    }
}

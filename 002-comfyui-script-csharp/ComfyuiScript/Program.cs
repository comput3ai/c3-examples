using System;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

class Program
{
    static async Task<int> Main(string[] args)
    {
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

        Console.WriteLine(new string('=', 60));
        Console.WriteLine("🎬 Comput3 Avatar Generator");
        Console.WriteLine(new string('=', 60));

        var apiKey = "YOUR_API_KEY";
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("❌ C3_API_KEY not found in environment variables.");
            Environment.Exit(1);
        }

        var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "Input", "aang.png");
        var audioPath = Path.Combine(Directory.GetCurrentDirectory(), "Input", "audio.mp3");
        var outputDir = "Output";
        var workflowTemplatePath = Path.Combine(Directory.GetCurrentDirectory(), "Workflows", "avatar_generator.json");
        var TimeoutMinutes = 15;

        var c3Client = new Comput3API(apiKey, loggerFactory.CreateLogger<Comput3API>());
        logger.LogInformation("🚀 Initializing Comput3 API client...");

        var comfyuiUrl = await c3Client.GetComfyuiUrlAsync();
        if (string.IsNullOrEmpty(comfyuiUrl))
        {
            logger.LogError("❌ No running media instance found.");
            return 1;
        }

        logger.LogInformation($"🖥️ Using ComfyUI instance at: {comfyuiUrl}");
        var comfyClient = new ComfyUIClient(comfyuiUrl, apiKey, loggerFactory.CreateLogger<ComfyUIClient>());

        logger.LogInformation("📤 Uploading files...");
        //var imageName = await comfyClient.UploadFile(imagePath, "input");
        //if (string.IsNullOrEmpty(imageName))
        //{
        //    logger.LogError("❌ Failed to upload image.");
        //    return 1;
        //}

        //var audioName = await comfyClient.UploadFile(audioPath, "input");
        //if (string.IsNullOrEmpty(audioName))
        //{
        //    logger.LogError("❌ Failed to upload audio.");
        //    return 1;
        //}

        logger.LogInformation("📋 Loading workflow template...");
        Dictionary<string, object> workflow;
        try
        {
            workflow = comfyClient.LoadWorkflow(workflowTemplatePath);
        }
        catch (Exception ex)
        {
            logger.LogError($"❌ Failed to load workflow template: {ex.Message}");
            return 1;
        }

        logger.LogInformation("🔄 Updating workflow with inputs...");
        //var updatedWorkflow = comfyClient.UpdateWorkflow(workflow, imageName, audioPath);

        logger.LogInformation("🚀 Queueing workflow...");
        //var promptId = await comfyClient.QueueWorkflow(updatedWorkflow);
        //if (string.IsNullOrEmpty(promptId))
        //{
        //    logger.LogError("❌ Failed to queue workflow.");
        //    return 1;
        //}
        var promptId = "4521faf3-5884-4528-8d75-2dd45a4abd0a";
        logger.LogInformation($"⏳ Waiting for workflow to complete (max {TimeoutMinutes} minutes)...");
        var workflowCompleted = await comfyClient.WaitForWorkflowCompletion(promptId, TimeoutMinutes);
        if (!workflowCompleted)
        {
            logger.LogError("❌ Workflow processing failed or timed out.");
            return 1;
        }

        logger.LogInformation("🔍 Getting output files...");
        var outputFiles = await comfyClient.GetOutputFiles(promptId);
        if (outputFiles == null || outputFiles.Count == 0)
        {
            logger.LogError("❌ No output files found.");
            return 1;
        }

        var videos = outputFiles.FindAll(f => f["type"] == "video");
        if (videos.Count == 0)
        {
            logger.LogError("❌ No videos found in output.");
            return 1;
        }

        logger.LogInformation($"📥 Downloading output videos to: {outputDir}");

        //var node13Videos = outputFiles.FindAll(v => v["node_id"] == "13");
        var node13Videos = new List<Dictionary<string, object>>();
        foreach (var item in videos)
        {
            if (item.Keys.Contains("node_id"))
            {
                var v = item["node_id"].ToString();
                if (v == "13")
                {
                    node13Videos.Add(item);
                }
            }

        }

        var downloadSuccess = false;
        if (node13Videos.Count > 0)
        {
            var latestVideo = node13Videos[^1]; // last one
            var outputPath = await comfyClient.DownloadFileAsync(latestVideo["filename"].ToString(), outputDir, latestVideo["subfolder"].ToString());

            if (!string.IsNullOrEmpty(outputPath))
            {
                Console.WriteLine(new string('=', 60));
                Console.WriteLine($"✨ Avatar generation complete! ✨");
                Console.WriteLine($"📁 Output saved to: {outputPath}");
                Console.WriteLine(new string('=', 60));
                downloadSuccess = true;
            }
        }
        else
        {
            foreach (var video in videos)
            {
                var outputPath = await comfyClient.DownloadFileAsync(video["filename"].ToString(), outputDir, video["subfolder"].ToString());
                if (!string.IsNullOrEmpty(outputPath))
                {
                    Console.WriteLine(new string('=', 60));
                    Console.WriteLine($"✨ Avatar generation complete! ✨");
                    Console.WriteLine($"📁 Output saved to: {outputPath}");
                    Console.WriteLine(new string('=', 60));
                    downloadSuccess = true;
                    break;
                }
            }
        }

        if (!downloadSuccess)
        {
            logger.LogError("❌ Failed to download any videos.");
            return 1;
        }

        return 0;
    }
}

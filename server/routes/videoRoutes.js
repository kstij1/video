const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Video = require('../models/Video');
const runwayService = require('../services/runwayService');

const router = express.Router();
const { requireWeamAuth } = require('../middleware/weamSession');
const { v4: uuid } = require('uuid');

// Providers availability based on env vars
router.get('/providers', (req, res) => {
  try {
    const availability = {
      runway: Boolean(process.env.RUNWAY_API_KEY),
      banana: Boolean(process.env.BANANA_API_KEY),
      veo3: Boolean(process.env.VEO3_API_KEY)
    };
    return res.json(availability);
  } catch (e) {
    return res.json({ runway: false, banana: false, veo3: false });
  }
});

// Test Runway API connection
router.get('/test-runway', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing Runway API connection...');
    
    // Try to make a simple request to test the connection
    const testResponse = await runwayService.client.get('/');
    res.json({ 
      success: true, 
      message: 'Runway API connection successful',
      response: testResponse.data 
    });
  } catch (error) {
    console.error('Runway API test failed:', error.response?.data || error.message);
    
    // Try to get more details about the error
    let errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    };
    
    res.status(500).json({ 
      success: false, 
      error: errorDetails,
      message: 'Runway API connection failed'
    });
  }
});

// Test the new development API hostname specifically
router.get('/test-dev-api', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing Runway Development API connection...');
    
    // Test the new development API hostname with a valid endpoint
    const testResponse = await runwayService.client.get('/v1/organization');
    res.json({ 
      success: true, 
      message: 'Runway Development API connection successful',
      baseURL: runwayService.baseURL,
      response: testResponse.data 
    });
  } catch (error) {
    console.error('Runway Development API test failed:', error.response?.data || error.message);
    
    let errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      baseURL: runwayService.baseURL
    };
    
    res.status(500).json({ 
      success: false, 
      error: errorDetails,
      message: 'Runway Development API connection failed'
    });
  }
});

// Test API version discovery
router.get('/test-version-discovery', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing API version discovery...');
    
    const workingVersion = await runwayService.discoverApiVersion();
    res.json({ 
      success: true, 
      message: 'API version discovery successful',
      workingVersion: workingVersion,
      baseURL: runwayService.baseURL
    });
  } catch (error) {
    console.error('API version discovery failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'API version discovery failed'
    });
  }
});

// Test Runway API with specific endpoint
router.get('/test-runway-endpoint', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing specific Runway API endpoint...');
    
    // Try to get the available models or endpoints
    const testResponse = await runwayService.client.get('/models');
    res.json({ 
      success: true, 
      message: 'Runway models endpoint successful',
      response: testResponse.data 
    });
  } catch (error) {
    console.error('Runway models endpoint test failed:', error.response?.data || error.message);
    
    let errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    };
    
    res.status(500).json({ 
      success: false, 
      error: errorDetails,
      message: 'Runway models endpoint test failed'
    });
  }
});

// Test video generation endpoint specifically
router.get('/test-video-generation', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing video generation endpoint...');
    
    // Try to make a simple test request to see what the API expects
    const testResponse = await runwayService.client.get('/gen-4');
    res.json({ 
      success: true, 
      message: 'Video generation endpoint test successful',
      response: testResponse.data 
    });
  } catch (error) {
    console.error('Video generation endpoint test failed:', error.response?.data || error.message);
    
    let errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    };
    
    res.status(500).json({ 
      success: false, 
      error: errorDetails,
      message: 'Video generation endpoint test failed'
    });
  }
});

// Check Runway job status directly
router.get('/job-status/:jobId', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    const { jobId } = req.params;
    
    console.log('Checking Runway job status for:', jobId);
    const jobStatus = await runwayService.getJobStatus(jobId);
    
    res.json({ 
      success: true, 
      message: 'Job status retrieved successfully',
      jobStatus: jobStatus
    });
  } catch (error) {
    console.error('Failed to get job status:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to get job status'
    });
  }
});

// Discover available Runway API endpoints
router.get('/discover-endpoints', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Discovering available Runway API endpoints...');
    
    const endpoints = await runwayService.discoverEndpoints();
    res.json({ 
      success: true, 
      message: 'Endpoint discovery completed',
      endpoints: endpoints
    });
  } catch (error) {
    console.error('Endpoint discovery failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Endpoint discovery failed'
    });
  }
});

// Test different authorization formats
router.get('/test-auth-formats', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Testing different authorization formats...');
    
    const authResults = await runwayService.testAuthFormats();
    res.json({ 
      success: true, 
      message: 'Authorization format test completed',
      results: authResults
    });
  } catch (error) {
    console.error('Authorization format test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Authorization format test failed'
    });
  }
});

// Validate API key
router.get('/validate-api-key', async (req, res) => {
  try {
    const runwayService = require('../services/runwayService');
    console.log('Validating API key...');
    
    const validation = await runwayService.validateApiKey();
    res.json({ 
      success: true, 
      message: 'API key validation completed',
      validation: validation
    });
  } catch (error) {
    console.error('API key validation failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'API key validation failed'
    });
  }
});

// Simple health check for the video API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Video API is running',
    timestamp: new Date().toISOString()
  });
});

// Create a new video generation request
router.post('/generate', requireWeamAuth, async (req, res) => {
  try {
    const { prompt, duration = 5, aspectRatio = '16:9', model = 'gen4_turbo' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Create video generation job with Runway
    const runwayResponse = await runwayService.createVideoGeneration(prompt, duration, aspectRatio, model);
    
    console.log('Runway API response:', runwayResponse);
    
    // Create video record in database
    const video = new Video({
      videoId: uuidv4(),
      prompt,
      duration,
      aspectRatio,
      quality: req.body.quality || '1080p',
      runwayJobId: runwayResponse.id,
      status: 'PENDING', // Use Runway's status values
      model: model || 'gen4_turbo',
      user: {
        id: req.user._id,
        email: req.user.email
      },
      companyId: req.user.companyId,
      createdBy: {
        id: req.user._id,
        email: req.user.email
      },
      metadata: {
        runwayResponse: runwayResponse,
        createdAt: new Date()
      }
    });

    await video.save();
    console.log('Video saved to database:', video.videoId);

    // Start polling for job status in background
    runwayService.pollJobStatus(video.videoId).catch(error => {
      console.error('Background polling error:', error);
    });

    res.status(201).json({
      success: true,
      video: {
        videoId: video.videoId,
        prompt: video.prompt,
        status: video.status,
        runwayJobId: video.runwayJobId,
        createdAt: video.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating video generation:', error);
    
    // Provide more detailed error information
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status;
      errorMessage = `API Error (${statusCode}): ${error.response.data?.message || error.response.data?.error || error.message}`;
      
      if (error.response.status === 401) {
        errorMessage = 'Unauthorized: Please check your Runway API key';
      } else if (error.response.status === 404) {
        errorMessage = 'API endpoint not found: The Runway API structure may have changed';
      } else if (error.response.status === 429) {
        errorMessage = 'Rate limited: Please wait before making another request';
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from Runway API: Please check your internet connection';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get video status
router.get('/:videoId/status', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findOne({ 
      videoId,
      'user.id': req.user._id // Ensure user can only access their own videos
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      videoId: video.videoId,
      status: video.status,
      prompt: video.prompt,
      videoUrl: video.videoUrl,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    });

  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all videos (history)
router.get('/', requireWeamAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      'user.id': req.user._id // Only get videos for the authenticated user
    };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { prompt: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update video title
router.patch('/:videoId/title', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const video = await Video.findOneAndUpdate(
      { videoId, 'user.id': req.user._id },
      { title },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true, video });

  } catch (error) {
    console.error('Error updating video title:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update video prompt
router.patch('/:videoId/prompt', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const video = await Video.findOneAndUpdate(
      { videoId, 'user.id': req.user._id },
      { prompt },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true, video });

  } catch (error) {
    console.error('Error updating video prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update video metadata (title, prompt, duration, aspectRatio, model)
router.patch('/:videoId/edit', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, prompt, duration, aspectRatio, model } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (duration !== undefined) updateData.duration = duration;
    if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio;
    if (model !== undefined) updateData.model = model;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const video = await Video.findOneAndUpdate(
      { videoId, 'user.id': req.user._id },
      updateData,
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true, video });

  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process video editing (trim, segments, etc.)
router.post('/:videoId/process-edits', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { trimStart, trimEnd, segments, outputFormat = 'mp4', crop, music } = req.body;

    const video = await Video.findOne({ videoId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Validate edit parameters
    if (trimStart < 0 || trimEnd > video.duration || trimStart >= trimEnd) {
      return res.status(400).json({ error: 'Invalid trim parameters' });
    }

    // Create and append edit record
    const editRecord = {
      editId: uuid(),
      type: 'composite',
      params: {
        trimStart,
        trimEnd,
        segments: segments || [],
        outputFormat,
        crop: crop || null,
        music: music || null,
        originalDuration: video.duration,
        editedDuration: trimEnd - trimStart,
      },
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!Array.isArray(video.videoEdits)) {
      video.videoEdits = [];
    }
    video.videoEdits.push(editRecord);
    await video.save();

    // Here you would typically:
    // 1. Download the original video
    // 2. Process it with ffmpeg or similar tool
    // 3. Apply the edits (trim, split, etc.)
    // 4. Upload the processed video
    // 5. Update the video record

    // For now, we'll simulate the process
    console.log('Video editing requested:', {
      videoId,
      trimStart,
      trimEnd,
      segments: segments?.length || 0,
      outputFormat
    });

    res.json({
      success: true,
      message: 'Video editing request received',
      edit: editRecord,
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    console.error('Error processing video edits:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get edit history for a video
router.get('/:videoId/edits', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findOne({
      videoId,
      'user.id': req.user._id
    }).select('videoEdits videoId');

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const edits = Array.isArray(video.videoEdits) ? video.videoEdits : [];
    res.json({ videoId: video.videoId, edits });
  } catch (error) {
    console.error('Error fetching edit history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Regenerate video with same prompt
router.post('/:videoId/regenerate', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const originalVideo = await Video.findOne({ videoId, 'user.id': req.user._id });

    if (!originalVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Create new video generation with same prompt
    const runwayResponse = await runwayService.createVideoGeneration(
      originalVideo.prompt,
      originalVideo.duration,
      originalVideo.aspectRatio
    );

    // Create new video record
    const newVideo = new Video({
      videoId: uuidv4(),
      prompt: originalVideo.prompt,
      duration: originalVideo.duration,
      aspectRatio: originalVideo.aspectRatio,
      runwayJobId: runwayResponse.id || runwayResponse.job_id,
      status: 'queued',
      model: originalVideo.model,
      quality: originalVideo.quality,
      user: {
        id: req.user._id,
        email: req.user.email
      },
      companyId: req.user.companyId,
      createdBy: {
        id: req.user._id,
        email: req.user.email
      }
    });

    await newVideo.save();

    // Start polling for job status in background
    runwayService.pollJobStatus(newVideo.videoId).catch(error => {
      console.error('Background polling error:', error);
    });

    res.status(201).json({
      success: true,
      video: {
        videoId: newVideo.videoId,
        prompt: newVideo.prompt,
        status: newVideo.status,
        runwayJobId: newVideo.runwayJobId,
        createdAt: newVideo.createdAt
      }
    });

  } catch (error) {
    console.error('Error regenerating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete video
router.delete('/:videoId', requireWeamAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findOneAndDelete({ videoId, 'user.id': req.user._id });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true, message: 'Video deleted successfully' });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

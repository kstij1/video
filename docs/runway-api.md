# Runway API Integration - End-to-End Guide

## Overview
This document explains how our app integrates with Runway from end to end: obtaining access, configuring keys, API versioning, endpoints used, request/response flow, job polling, error handling, and where the logic lives in the codebase.

- Primary provider: Runway Gen-4 Turbo (API id `gen4_turbo`)
- Base URL: `https://api.dev.runwayml.com`
- API Version header: `X-Runway-Version: 2024-11-06`
- Default flow: Image-to-Video (`/v1/image_to_video`) with prompt, duration, aspect ratio, model

## 1) Access & Account
1. Create a Runway account and obtain an API key from your account settings.
2. Ensure your plan permits API usage for Gen-4 Turbo.
3. Note the key format typically starts with `key_`.

References:
- Runway API (sign-in/account): https://runwayml.com/
- API docs: https://docs.runwayml.com/ (see Image-to-Video and Tasks endpoints)

## 2) Environment Configuration
We configure provider keys in `.env` files. Required key for Runway:

- `RUNWAY_API_KEY` — your Runway API key (must start with `key_`).

Example files:
- `.example.env` shows the variable names
- `config.env` is used for local/dev with real secrets
- `docker-compose.yml` passes the env vars to the server container

File refs:
- `config.env`
- `.example.env`
- `docker-compose.yml`

## 3) Backend Service Setup
The integration is centralized in `server/services/runwayService.js`.

- Base URL: `https://api.dev.runwayml.com`
- `X-Runway-Version: 2024-11-06`
- Two Axios clients are created: one with `Bearer ${apiKey}`, one with raw key
- Alternative base URLs are listed for troubleshooting

Key snippet:
```31:39:server/services/runwayService.js
this.client = axios.create({
  baseURL: this.baseURL,
  headers: {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06'
  },
  timeout: 30000
});
```

### Model Mapping
We map UI names to Runway model IDs:
```60:68:server/services/runwayService.js
const modelMap = {
  'Runway Gen-4 Turbo': 'gen4_turbo',
  'Runway Gen-3': 'gen3',
  'Veo3': 'veo3'
};
const runwayModel = modelMap[model] || 'gen4_turbo';
```

### Aspect Ratios
We convert UI aspect ratios to Runway’s expected ratio string:
```85:95:server/services/runwayService.js
const ratioMap = {
  '16:9': '1280:720',
  '9:16': '720:1280',
  '1:1': '960:960',
  '4:3': '1280:960',
  '3:4': '960:1280'
};
```

## 4) API Endpoints Used
- Create generation: `POST /v1/image_to_video`
- Check job status: `GET /v1/tasks/{jobId}`

Utility/testing (used in diagnostics):
- Root: `GET /`
- Models: `GET /models`
- Organization: `GET /v1/organization`

See `server/routes/videoRoutes.js` for test and diagnostic routes.

## 5) Request Flow (Generation)
1. Frontend (`AIVideoStudio`) selects provider/model, composes prompt, duration, aspect ratio
2. Frontend calls backend `POST /api/video/generate` with `{ prompt, duration, aspectRatio, model }`
3. Backend `videoRoutes` validates input and calls `runwayService.createVideoGeneration`
4. Service sends `POST /v1/image_to_video` with payload:
   - `promptImage`: placeholder image URL (currently `https://picsum.photos/512/512`)
   - `promptText`: sanitized prompt (max 980 chars)
   - `duration`: integer seconds
   - `ratio`: derived from aspect ratio
   - `model`: mapped id (e.g., `gen4_turbo`)
5. Runway responds with a job id; we persist a `Video` record with `runwayJobId`
6. We start polling the job status in background

Reference:
```70:76:server/services/runwayService.js
const response = await this.client.post('/v1/image_to_video', {
  promptImage: 'https://picsum.photos/512/512',
  promptText: sanitizedPrompt,
  duration: parseInt(duration),
  ratio: this.convertAspectRatioToRatio(aspectRatio),
  model: runwayModel
});
```

## 6) Polling & Status Updates
- Polling interval: 5s
- Max attempts: 60 (~5 minutes)
- Status mapping: `PENDING/THROTTLED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`
- On success: store output URLs in `video.videoUrls` and `video.videoUrl`

Reference:
```114:121:server/services/runwayService.js
const response = await this.client.get(`/v1/tasks/${jobId}`);
```
```317:341:server/services/runwayService.js
case 'SUCCEEDED':
  video.status = 'SUCCEEDED';
  video.videoUrls = jobStatus.output || [];
  video.videoUrl = jobStatus.output?.[0] || '';
  video.completedAt = new Date();
  video.progress = 1;
```

## 7) Data Model
The `Video` schema tracks Runway state:
- `runwayJobId` (required)
- `model`, `duration`, `aspectRatio`, `quality`
- `status`: `PENDING | PROCESSING | SUCCEEDED | FAILED | CANCELLED`
- `metadata.runwayResponse` for raw API response

Reference:
```35:42:server/models/Video.js
runwayJobId: { type: String, required: true },
model: { type: String, required: true },
```

## 8) Frontend Behavior
- Default model: "Runway Gen-4 Turbo"
- Provider availability determined by presence of `RUNWAY_API_KEY`
- Model select includes Runway, Banana, Veo3

Reference:
```183:193:client/src/components/AIVideoStudio.js
<select value={selectedModel} onChange={...}>
  <option value="Runway Gen-4 Turbo">Runway Gen-4 Turbo</option>
  <option value="Banana">Banana</option>
  <option value="Veo3">Veo3</option>
</select>
```

## 9) Error Handling & Validation
- Verifies `RUNWAY_API_KEY` presence; warns if not starting with `key_`
- Sanitizes prompt to <= 980 chars
- Timeouts at 30s
- On polling timeout, marks video failed with message
- Diagnostic routes exist to test connectivity, version, and auth formats

## 10) Versioning Strategy
- Default header: `X-Runway-Version: 2024-11-06`
- A discovery helper (`discoverApiVersion`) can probe multiple versions for compatibility

Reference:
```250:286:server/services/runwayService.js
for (const version of versions) {
  const testClient = axios.create({ headers: { 'X-Runway-Version': version } });
  const response = await testClient.get('/');
  if (works) return version;
}
```

## 11) Security Notes
- Do not commit real `RUNWAY_API_KEY` to version control
- Use environment variables and secret managers for deployment
- Backend logs mask the key when printed

## 12) Useful Links
- Runway: https://runwayml.com/
- Docs: https://docs.runwayml.com/
- Status: https://status.runwayml.com/

## 13) Quick Setup Checklist
- [ ] Obtain API key and set `RUNWAY_API_KEY`
- [ ] Verify connectivity via `/api/video/test-runway` route
- [ ] Confirm version header works or run version discovery
- [ ] Generate a sample video via `/api/video/generate`
- [ ] Confirm polling completes and video record updates

## Replication Guide (Copy-Paste)

Use this section to replicate the exact Runway integration in another app.

### Env Variables
```env
RUNWAY_API_KEY=your_runway_api_key  # must start with key_
```

### API Configuration
- Base URL: `https://api.dev.runwayml.com`
- Version header: `X-Runway-Version: 2024-11-06`
- Auth: `Authorization: Bearer ${RUNWAY_API_KEY}`
- Content-Type: `application/json`
- Timeout: 30s

### Endpoints
- Create job: `POST /v1/image_to_video`
- Job status: `GET /v1/tasks/{jobId}`

### Aspect Ratio Mapping
```text
16:9 -> 1280:720
9:16 -> 720:1280
1:1  -> 960:960
4:3  -> 1280:960
3:4  -> 960:1280
```

### curl Examples
```bash
# Create job
curl -X POST https://api.dev.runwayml.com/v1/image_to_video \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Runway-Version: 2024-11-06" \
  -d '{
    "promptImage": "https://picsum.photos/512/512",
    "promptText": "Cinematic drone flyover of a coastal city at golden hour",
    "duration": 5,
    "ratio": "1280:720",
    "model": "gen4_turbo"
  }'

# Poll status
curl -X GET https://api.dev.runwayml.com/v1/tasks/<task_id> \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "X-Runway-Version: 2024-11-06"
```

### Minimal Node/Express Snippet
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.dev.runwayml.com',
  headers: {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06',
  },
  timeout: 30000,
});

async function createVideo({ promptText, duration = 5, ratio = '1280:720', model = 'gen4_turbo' }) {
  const res = await client.post('/v1/image_to_video', {
    promptImage: 'https://picsum.photos/512/512',
    promptText,
    duration: parseInt(duration),
    ratio,
    model,
  });
  return res.data; // contains id (task id)
}

async function getStatus(taskId) {
  const res = await client.get(`/v1/tasks/${taskId}`);
  return res.data; // status, output[] when SUCCEEDED
}
```

### Implementation Notes
- Sanitize prompt (collapse whitespace, trim to ~980 chars)
- Poll every 5s up to ~5 minutes
- Handle statuses: PENDING, THROTTLED, RUNNING, SUCCEEDED, FAILED, CANCELLED
- On success use `output[0]` as the primary video URL
- Store: task id, model, duration, aspectRatio, quality, status, progress, raw response

### Links
- Runway: https://runwayml.com
- Docs: https://docs.runwayml.com
- Status: https://status.runwayml.com

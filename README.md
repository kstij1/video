## AI Video Gen (Next.js)

A minimal Next.js app (no auth) to trigger Runway video generation.

### Setup

1) Copy `.example.env` to `.env` and set:

```
RUNWAY_API_KEY=your_runway_api_key
```

2) Install dependencies:

```
npm install
```

3) Run the dev server:

```
npm run dev
```

Open http://localhost:3000 and use the form to generate a video job. The API route calls Runway’s `image_to_video` endpoint with your prompt.

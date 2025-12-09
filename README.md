# Topaz-Style Upscale Gateway (Next.js + External AI)

Gateway-only Next.js app deployed on Vercel. It receives an image, forwards it to an external GPU server (RunPod Serverless or your own Docker host), and returns the enhanced image. No AI runs inside Vercel.

## What matters
- Mandatory files: `app/api/upscale/route.ts`, `package.json`, `next.config.js`.
- External AI server must expose `POST /enhance` (multipart) with fields: `image`, `upscale` (1|2), `denoise` (true|false), `face_restore` (true|false), and return the processed image (PNG/JPG).
- Env vars on Vercel: `AI_SERVER_URL`, `AI_SERVER_TOKEN`.
- Limits enforced in the gateway: max 5 MB, max 1280x1280, upscale <= 2x, timeout 12s.

## Local dev
```bash
npm install
npm run dev
```

Call the gateway:
```bash
curl -X POST http://localhost:3000/api/upscale \
  -F "image=@/path/to/photo.jpg" \
  -F "upscale=2" \
  -F "denoise=true" \
  -F "face_restore=false"
```

## Deploy (Vercel)
Set env vars:
- `AI_SERVER_URL` → e.g. `https://your-ai-server.com`
- `AI_SERVER_TOKEN` → secret bearer token

## AI server template (external GPU)
See `ia-server-template/README.md` for a RunPod/Docker starter that bundles Real-ESRGAN, SwinIR, NAFNet, DnCNN, and optional GFPGAN. You can swap the backend without touching this gateway—only change env vars.

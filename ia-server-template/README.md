# IA Server Template (RunPod / Docker)

Reference GPU server exposing `POST /enhance` for the Next.js gateway. Models: Real-ESRGAN (x2), SwinIR (optional), NAFNet/DnCNN for denoise (placeholder hook), optional GFPGAN for faces.

## Quick start (Docker)
```bash
# Build
docker build -t ai-upscale-server ./ia-server-template
# Run (GPU)
docker run --gpus all -p 8000:8000 \
  -e AI_AUTH_TOKEN=your-secret \
  ai-upscale-server
```

## Endpoint
`POST /enhance`
- multipart fields: `image` (file), `upscale` (1|2), `denoise` (true|false), `face_restore` (true|false)
- returns: image/png (or jpg)

## Files
- `Dockerfile`: CUDA base + Real-ESRGAN + GFPGAN weights download.
- `requirements.txt`: FastAPI + PyTorch + Real-ESRGAN + GFPGAN.
- `main.py`: FastAPI server loading Real-ESRGAN (x2) and GFPGAN. Denoise uses OpenCV placeholder—replace with NAFNet/DnCNN for production quality.

## Notes
- Weights are pulled in the Docker build; adjust URLs to newer checkpoints if desired (SwinIR, custom NAFNet, etc.).
- Set `AI_AUTH_TOKEN` and enforce it in `main.py` if you want auth (gateway already sends `Authorization: Bearer <token>`).
- Tune tilesize/half-precision in `RealESRGANer` for your GPU memory.
- For RunPod Serverless, package this image and expose port 8000; the gateway hits `https://<pod>/enhance`.

## Swapping models
- **Real-ESRGAN**: change `scale`/weights in `build_upsampler`.
- **SwinIR**: load the SwinIR checkpoint and replace the upsampler init.
- **Denoise**: replace `apply_denoise` with NAFNet/DnCNN inference (placeholder currently uses OpenCV fastNlMeans).
- **Faces**: set `face_restore=true` to enable GFPGAN; keep `bg_upsampler=upsampler` for sharper outputs.

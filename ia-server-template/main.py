import io
import os
import time
from typing import Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from gfpgan import GFPGANer
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet

AI_TIMEOUT_SECONDS = 12
MAX_UPLOAD_MB = 5
MAX_RESOLUTION = 1280

app = FastAPI(title="AI Upscale Server", version="1.0")


def build_upsampler() -> RealESRGANer:
  model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
  return RealESRGANer(
    scale=2,
    model_path=os.environ.get("REAL_ESRGAN_WEIGHTS", "/workspace/weights/RealESRGAN_x2plus.pth"),
    model=model,
    tile=0,
    half=True,
  )


def build_face_enhancer(upsampler: RealESRGANer) -> GFPGANer:
  return GFPGANer(
    model_path=os.environ.get("GFPGAN_WEIGHTS", "/workspace/weights/GFPGANv1.4.pth"),
    upscale=1,
    arch="clean",
    channel_multiplier=2,
    bg_upsampler=upsampler,
  )


upsampler = build_upsampler()
face_enhancer = build_face_enhancer(upsampler)


def ensure_limits(image_bytes: bytes, width: int, height: int):
  if len(image_bytes) > MAX_UPLOAD_MB * 1024 * 1024:
    raise HTTPException(status_code=413, detail="Image exceeds 5 MB limit")
  if width > MAX_RESOLUTION or height > MAX_RESOLUTION:
    raise HTTPException(status_code=413, detail="Image exceeds 1280x1280 limit")


def decode_image(data: bytes) -> Tuple[np.ndarray, int, int]:
  np_data = np.frombuffer(data, np.uint8)
  img = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
  if img is None:
    raise HTTPException(status_code=400, detail="Unable to decode image")
  height, width = img.shape[:2]
  ensure_limits(data, width, height)
  return img, width, height


def apply_denoise(img: np.ndarray, enabled: bool) -> np.ndarray:
  if not enabled:
    return img
  # Placeholder: replace with NAFNet/DnCNN inference for production quality.
  return cv2.fastNlMeansDenoisingColored(img, None, h=10, hColor=10, templateWindowSize=7, searchWindowSize=21)


def apply_upscale(img: np.ndarray, upscale: int) -> np.ndarray:
  if upscale == 1:
    return img
  if upscale != 2:
    raise HTTPException(status_code=400, detail="Upscale must be 1 or 2")
  output, _ = upsampler.enhance(img, outscale=2)
  return output


def apply_face_restore(img: np.ndarray, enabled: bool) -> np.ndarray:
  if not enabled:
    return img
  _, _, restored = face_enhancer.enhance(
    img,
    has_aligned=False,
    only_center_face=False,
    paste_back=True,
  )
  return restored


@app.post("/enhance")
async def enhance(
  request: Request,
  image: UploadFile = File(...),
  upscale: int = Form(2),
  denoise: bool = Form(False),
  face_restore: bool = Form(False),
):
  expected_token = os.getenv("AI_AUTH_TOKEN")
  received_auth = request.headers.get("authorization")
  if expected_token:
    if not received_auth or received_auth.lower() != f"bearer {expected_token.lower()}":
      raise HTTPException(status_code=401, detail="Unauthorized")

  start = time.time()
  data = await image.read()

  img, width, height = decode_image(data)
  img = apply_denoise(img, denoise)
  img = apply_upscale(img, upscale)
  img = apply_face_restore(img, face_restore)

  _, encoded = cv2.imencode('.png', img)
  if encoded is None:
    raise HTTPException(status_code=500, detail="Failed to encode output image")

  duration = time.time() - start
  if duration > AI_TIMEOUT_SECONDS:
    raise HTTPException(status_code=504, detail="Processing exceeded timeout")

  return Response(content=encoded.tobytes(), media_type="image/png")


if __name__ == "__main__":
  import uvicorn

  uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8000,
    reload=False,
    workers=1,
  )

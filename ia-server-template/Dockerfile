FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git wget curl ca-certificates \
    libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip3 install --upgrade pip \
  && pip3 install --no-cache-dir -r requirements.txt

RUN mkdir -p /workspace/weights
# Real-ESRGAN x2 (you can swap to x4 if desired)
RUN wget -q https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/RealESRGAN_x2plus.pth -O /workspace/weights/RealESRGAN_x2plus.pth
# GFPGAN v1.4
RUN wget -q https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth -O /workspace/weights/GFPGANv1.4.pth

COPY main.py ./

EXPOSE 8000
CMD ["python3", "main.py"]

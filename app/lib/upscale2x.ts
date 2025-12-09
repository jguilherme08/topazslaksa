"use client";

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

let upscaler: any = null;

async function getUpscaler() {
  if (upscaler) {
    return upscaler;
  }

  // Use direct model path from CDN instead of npm package
  const modelUrl =
    "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@0.1.0/models/idealo/gans/model.json";

  const model = await tf.loadGraphModel(modelUrl);
  upscaler = { model };
  return upscaler;
}

/**
 * Upscales an image File to 2x using ESRGAN slim in-browser, returns a Blob.
 */
export async function upscaleFile2x(file: File): Promise<Blob> {
  const instance = await getUpscaler();
  const url = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    // Convert image to tensor and preprocess
    let tensor = tf.browser.fromPixels(img);
    const normalized = tensor.div(255.0);

    // Run inference
    const output = tf.tidy(() => {
      return instance.model.predict(normalized.expandDims(0));
    });

    // Postprocess and convert to canvas
    const result = tf.tidy(() => {
      const clipped = (output as tf.Tensor).clipByValue(0, 1);
      const scaled = clipped.mul(255);
      return scaled;
    });

    // Draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    await tf.browser.toPixels(result.squeeze() as tf.Tensor3D, canvas);

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to blob failed"));
        },
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(url);
    tf.disposeVariables();
  }
}

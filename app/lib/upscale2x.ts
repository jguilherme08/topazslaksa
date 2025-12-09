"use client";

import Upscaler from "upscaler";
import modelDefinition from "@upscalerjs/esrgan-slim";

let upscaler: Upscaler | null = null;
let isInitializing = false;

async function getUpscaler() {
  if (upscaler) {
    return upscaler;
  }
  
  if (isInitializing) {
    // wait for initialization to complete
    while (!upscaler && isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return upscaler!;
  }

  isInitializing = true;
  try {
    upscaler = new Upscaler({
      model: modelDefinition,
      scale: 2,
    });
    // trigger model load
    await (upscaler as any).loadModel();
  } finally {
    isInitializing = false;
  }
  return upscaler;
}

/**
 * Upscales an image File to 2x using ESRGAN slim in-browser, returns a Blob.
 */
export async function upscaleFile2x(file: File): Promise<Blob> {
  const instance = await getUpscaler();
  const url = URL.createObjectURL(file);

  try {
    const upscaledBase64 = (await (instance as any).upscale(url, {
      output: "base64",
      patchSize: 64,
      padding: 8,
    })) as string;

    // Convert data URL to blob
    const response = await fetch(upscaledBase64);
    const blob = await response.blob();
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

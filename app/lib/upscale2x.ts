"use client";

import Upscaler from "upscaler";
import modelDefinition from "@upscalerjs/esrgan-slim";

let upscaler: Upscaler | null = null;

async function getUpscaler() {
  if (!upscaler) {
    upscaler = new Upscaler({
      model: modelDefinition,
      scale: 2,
    });
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

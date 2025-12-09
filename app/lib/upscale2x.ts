"use client";

import Upscaler from "upscaler";
import x2 from "@upscalerjs/esrgan-slim";

let upscaler: Upscaler | null = null;

async function getUpscaler() {
  if (!upscaler) {
    upscaler = new Upscaler({
      model: x2,
      scale: 2, // explicit scale required for custom models
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

  const upscaledBase64 = (await (instance as any).upscale(url, {
    output: "base64",
    patchSize: 64,
    padding: 8,
  })) as string;

  URL.revokeObjectURL(url);

  const response = await fetch(upscaledBase64);
  const blob = await response.blob();
  return blob;
}

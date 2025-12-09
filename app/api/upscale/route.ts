import { NextResponse } from 'next/server';
import imageSize from 'image-size';

export const runtime = 'nodejs';
export const maxDuration = 12;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1280;

function toBoolean(value: FormDataEntryValue | null, fallback = false): boolean {
  if (value === null) return fallback;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return fallback;
}

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return error('Content-Type must be multipart/form-data');
  }

  const aiUrl = process.env.AI_SERVER_URL;
  const aiToken = process.env.AI_SERVER_TOKEN;

  if (!aiUrl) return error('AI_SERVER_URL is not configured', 500);
  if (!aiToken) return error('AI_SERVER_TOKEN is not configured', 500);

  const formData = await request.formData();
  const fileEntry = (formData.get('image') ?? formData.get('file')) as File | null;

  if (!fileEntry || typeof fileEntry === 'string') {
    return error('Missing image file in form-data (field: image)');
  }

  if (fileEntry.size > MAX_BYTES) {
    return error('Image exceeds 5 MB limit');
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const dimensions = imageSize(buffer);
  const width = dimensions.width || 0;
  const height = dimensions.height || 0;

  if (!width || !height) {
    return error('Unable to read image dimensions');
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return error('Image exceeds 1280x1280 limit');
  }

  const upscaleRaw = formData.get('upscale') ?? '2';
  const upscale = Number.parseInt(upscaleRaw.toString(), 10);
  if (![1, 2].includes(upscale)) {
    return error('Invalid upscale: only 1 or 2 are allowed');
  }

  const denoise = toBoolean(formData.get('denoise'), false);
  const faceRestore = toBoolean(formData.get('face_restore'), false);

  const forward = new FormData();
  forward.append('image', new Blob([buffer]), fileEntry.name || 'upload');
  forward.append('upscale', upscale.toString());
  forward.append('denoise', denoise ? 'true' : 'false');
  forward.append('face_restore', faceRestore ? 'true' : 'false');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const aiResponse = await fetch(new URL('/enhance', aiUrl).toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiToken}`,
      },
      body: forward,
      signal: controller.signal,
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => '');
      return error(
        `AI server error: ${aiResponse.status} ${detail || aiResponse.statusText}`,
        502,
      );
    }

    const resultBuffer = Buffer.from(await aiResponse.arrayBuffer());
    const contentType = aiResponse.headers.get('content-type') || 'image/png';
    const contentDisposition =
      aiResponse.headers.get('content-disposition') ||
      `inline; filename="upscaled-${fileEntry.name || 'image'}.png"`;

    return new NextResponse(resultBuffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-disposition': contentDisposition,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    const message = (err as Error)?.name === 'AbortError'
      ? 'Request timed out after 12s'
      : 'Unexpected error while contacting AI server';
    return error(message, (err as Error)?.name === 'AbortError' ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
}

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AI Upscale Gateway</h1>
      <p>
        This Next.js app only proxies image requests to the external GPU server. Use the
        <code> /api/upscale</code> endpoint with multipart form-data (fields: image, upscale, denoise,
        face_restore) to get processed images.
      </p>
      <ul>
        <li>Max upload: 5 MB</li>
        <li>Max resolution: 1280x1280</li>
        <li>Max upscale: 2x</li>
      </ul>
    </main>
  );
}

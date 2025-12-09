"use client";

import { useMemo, useState } from "react";
import { upscaleFile2x } from "./lib/upscale2x";

type Status = { kind: "idle" | "loading" | "ok" | "error"; message: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [upscale, setUpscale] = useState("2");
  const [denoise] = useState(true);
  const [faceRestore] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && status.kind !== "loading", [file, status.kind]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setStatus({ kind: "error", message: "Escolha uma imagem primeiro." });
      return;
    }

    setStatus({ kind: "loading", message: "Processando 2x no seu navegador..." });
    setOutputUrl(null);

    try {
      const blob = await upscaleFile2x(file);
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setStatus({ kind: "ok", message: "Pronto! Baixe a imagem gerada." });
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: (err as Error).message || "Falha ao processar." });
    }
  }

  return (
    <main>
      <header style={{ marginBottom: 18 }}>
        <div className="pill">Topaz-style · Gateway + GPU externo</div>
        <h1 style={{ margin: "10px 0 6px" }}>Upscale + Denoise + Face</h1>
        <p style={{ color: "#9fb3c8", margin: 0 }}>
          Envie uma foto (até 5 MB, 1280x1280 máx, upscale 1x ou 2x) e processe no servidor de IA.
          Depois baixe o resultado no celular ou desktop.
        </p>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Imagem (JPG/PNG, máx 5 MB)</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setStatus({ kind: "idle", message: "" });
              }}
              required
            />
          </div>

          <div className="row">
              <div className="field">
                <label>Upscale</label>
                <select value={upscale} onChange={(e) => setUpscale(e.target.value)} disabled>
                  <option value="2">2x (fixo via ESRGAN slim)</option>
                </select>
              </div>
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.6 }}>
                  <input type="checkbox" checked disabled />
                  Denoise (n/a no modelo slim)
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.6 }}>
                  <input type="checkbox" checked={false} disabled />
                  Face restore (n/a)
                </label>
              </div>
          </div>

          <button type="submit" disabled={!canSubmit} style={{ marginTop: 12 }}>
            {status.kind === "loading" ? "Processando..." : "Upscale 2x no navegador"}
          </button>

          {status.kind !== "idle" && (
            <div
              className={`status ${status.kind === "ok" ? "ok" : status.kind === "error" ? "err" : ""}`}
            >
              {status.message}
            </div>
          )}
        </form>

        <div className="preview">
          <div className="placeholder">
            {file ? `Selecionado: ${file.name}` : "Nenhuma imagem selecionada"}
          </div>
          {outputUrl ? (
            <div>
              <img src={outputUrl} alt="Output" />
              <a
                href={outputUrl}
                download={`upscaled-${file?.name || "image"}.png`}
                style={{ display: "inline-block", marginTop: 10 }}
              >
                Baixar imagem
              </a>
            </div>
          ) : (
            <div className="placeholder">O resultado aparecerá aqui</div>
          )}
        </div>

        <div className="tips">
          Dicas: use fotos até 1280x1280, upscale máximo 2x para evitar timeout. Tokens e GPU ficam no backend externo.
        </div>
      </div>
    </main>
  );
}

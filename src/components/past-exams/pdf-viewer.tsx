"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./exams.module.css";

export function PdfViewer({
  documentId,
  page,
  onPageChange: setPage,
}: {
  documentId: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(640),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width - 32)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false,
      task:
        | ReturnType<(typeof import("pdfjs-dist"))["getDocument"]>
        | undefined;
    async function load() {
      try {
        const response = await fetch(
          `/api/past-exams/documents/${documentId}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        if (cancelled) return;
        task = lib.getDocument({ url: data.url, isEvalSupported: false });
        const loaded = await task.promise;
        if (!cancelled) setPdf(loaded);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao abrir PDF.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [documentId]);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false,
      render:
        | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
        | undefined;
    void pdf
      .getPage(Math.min(Math.max(1, page), pdf.numPages))
      .then(async (p) => {
        const node = canvas.current;
        if (cancelled || !node) return;
        setLoading(true);
        const base = p.getViewport({ scale: 1 }),
          scale = Math.min(1.5, width / base.width) * zoom;
        const viewport = p.getViewport({ scale }),
          ratio = Math.min(window.devicePixelRatio || 1, 2);
        node.width = Math.floor(viewport.width * ratio);
        node.height = Math.floor(viewport.height * ratio);
        node.style.width = `${viewport.width}px`;
        node.style.height = `${viewport.height}px`;
        render = p.render({
          canvas: node,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        await render.promise;
        if (!cancelled) setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [pdf, page, zoom, width]);
  return (
    <div ref={container}>
      <div className={styles.pdfToolbar}>
        <button
          className={`${styles.button} ${styles.icon}`}
          aria-label="Página anterior"
          title="Página anterior"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <label className="flex items-center gap-2 text-xs">
          Página{" "}
          <input
            aria-label="Número da página"
            className={styles.input}
            style={{ width: 68 }}
            type="number"
            min={1}
            max={pdf?.numPages ?? 1}
            value={page}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(pdf?.numPages ?? 1, Number(e.target.value)),
                ),
              )
            }
          />{" "}
          / {pdf?.numPages ?? "…"}
        </label>
        <button
          className={`${styles.button} ${styles.icon}`}
          aria-label="Próxima página"
          title="Próxima página"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
        <button
          className={`${styles.button} ${styles.icon}`}
          aria-label="Diminuir zoom"
          title="Diminuir zoom"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
        >
          <ZoomOut size={18} />
        </button>
        <span className="w-10 text-center text-xs">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className={`${styles.button} ${styles.icon}`}
          aria-label="Aumentar zoom"
          title="Aumentar zoom"
          disabled={zoom >= 3}
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
        >
          <ZoomIn size={18} />
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.pdfViewport} aria-busy={loading}>
        <canvas
          ref={canvas}
          className={styles.pdfCanvas}
          aria-label={`Página ${page} do caderno de prova`}
        />
        {loading && (
          <p className="p-4 text-center text-sm">Carregando página…</p>
        )}
      </div>
    </div>
  );
}

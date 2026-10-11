import { Fragment } from "react";

/**
 * Texto das questões. A fonte usa um markdown bem simples: parágrafos, **negrito** e imagens ![](url).
 * Qualquer outra coisa (inclusive "R$" e "$") aparece como texto, sem interpretação.
 */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>,
  );
}

const IMAGE_LINE = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/;

/** Tabela em markdown ("| a | b |" + linha "| --- |"), usada em algumas questões transcritas de PDF. */
function parseTable(block: string) {
  const lines = block.split("\n").map((line) => line.trim());
  if (lines.length < 3 || !lines.every((line) => line.startsWith("|") && line.endsWith("|")) || !/^\|[\s:|-]+\|$/.test(lines[1])) return null;
  const cells = (line: string) => line.slice(1, -1).split("|").map((cell) => cell.trim());
  return { head: cells(lines[0]), rows: lines.slice(2).map(cells) };
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const table = parseTable(block);
        if (table) {
          return (
            <div key={index} className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>{table.head.map((cell, cellIndex) => <th key={cellIndex} className="border border-border bg-surface px-3 py-2 font-semibold">{inline(cell)}</th>)}</tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-border px-3 py-2">{inline(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const image = block.match(IMAGE_LINE);
        if (image) {
          return (
            // eslint-disable-next-line @next/next/no-img-element -- imagens de fontes externas, de tamanhos variados
            <img key={index} src={image[2]} alt={image[1] || "Figura da questão"} loading="lazy" className="my-3 max-h-[420px] max-w-full rounded-lg border border-border bg-white object-contain" />
          );
        }
        // Parágrafo que mistura texto e imagens: separa por linha.
        return (
          <p key={index} className="m-0 mt-3 first:mt-0">
            {block.split("\n").map((line, lineIndex) => {
              const lineImage = line.trim().match(IMAGE_LINE);
              return (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {lineImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagens de fontes externas
                    <img src={lineImage[2]} alt={lineImage[1] || "Figura da questão"} loading="lazy" className="my-3 block max-h-[420px] max-w-full rounded-lg border border-border bg-white object-contain" />
                  ) : (
                    inline(line)
                  )}
                </Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

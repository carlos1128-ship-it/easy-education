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

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
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

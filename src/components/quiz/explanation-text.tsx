import { Fragment } from "react";

const TIMESTAMP = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

function toSeconds(value: string) {
  return value.split(":").map(Number).reduce((total, part) => total * 60 + part, 0);
}

/** Explicação da questão; se o material for um vídeo, cada "MM:SS" abre o YouTube naquele minuto. */
export function ExplanationText({ text, videoId }: { text: string; videoId?: string | null }) {
  if (!videoId) return <>{text}</>;
  const parts = text.split(TIMESTAMP);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={`https://www.youtube.com/watch?v=${videoId}&t=${toSeconds(part)}s`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-strong underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

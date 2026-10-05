import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Easy Education",
    short_name: "Easy Education",
    description: "Estude melhor, não apenas mais.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#2563eb",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

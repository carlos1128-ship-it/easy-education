import type { Metadata } from "next";
import { JetBrains_Mono, Lexend } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Fonte variável: um único arquivo cobre todos os pesos de 100 a 900.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Ícones (icon.png, apple-icon.png) e imagens de compartilhamento (opengraph-image.png,
// twitter-image.png) vêm dos arquivos em src/app, gerados a partir do logo 4B.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Easy Education",
  description: "Estude melhor, não apenas mais.",
  applicationName: "Easy Education",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Easy Education",
    title: "Easy Education",
    description: "Estude melhor, não apenas mais.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Easy Education",
    description: "Estude melhor, não apenas mais.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${lexend.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

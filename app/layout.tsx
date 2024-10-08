import Content from "@/components/layout/content";
import Header from "@/components/layout/header";
import { AppProvider } from "@/contexts/app-provider";
import { CustomTonProvider } from "@/contexts/custom-ton-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { ToastProvider } from "@/contexts/toasts/context";
import { TonProvider } from "@/contexts/ton-provider";
import "@/styles/_main.scss";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";

const inter = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["vietnamese"],
});

export const metadata: Metadata = {
  title: "TON IBC",
  description: "Trustless IBC bridge across TON & Cosmos-ecosystem",
  icons: "./favicon.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="./favicon.svg" sizes="any" />
      </head>
      <GoogleTagManager gtmId="G-CV739YDHW7" />
      <body className={inter.className}>
        <AppProvider>
          <ThemeProvider>
            {/* <CustomTonProvider> */}
            <TonProvider>
              <ToastProvider>
                <Header />
                <Content>{children}</Content>
              </ToastProvider>
            </TonProvider>
            {/* </CustomTonProvider> */}
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}

import Script from "next/script";
import { headers } from "next/headers";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

export const metadata = {
  title: "ATRAVA Defense - Managed WAF-as-a-service",
  description: "Web Application Firewall Management Platform",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" nonce={nonce} />
      </head>
      <body className={`${inter.className} ${barlowCondensed.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

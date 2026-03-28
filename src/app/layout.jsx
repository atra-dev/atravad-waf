import localFont from "next/font/local";
import "./globals.css";

const centuryGothic = localFont({
  src: [
    {
      path: "./fonts/centurygothic.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/centurygothic_bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata = {
  title: "ATRAVA Defense - Managed WAF-as-a-service",
  description: "Web Application Firewall Management Platform",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${centuryGothic.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

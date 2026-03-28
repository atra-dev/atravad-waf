import "./globals.css";

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
      <body
        className="antialiased"
        style={{ fontFamily: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}

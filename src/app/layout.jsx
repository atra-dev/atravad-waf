import "./globals.css";

export const metadata = {
  title: "ATRAVAD WAF",
  description: "Web Application Firewall Management Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time4Work — Focus, plan, and grow",
  description:
    "A calm workspace for focused study, thoughtful planning, recurring reminders, and progress that follows you across devices.",
  applicationName: "Time4Work",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Time4Work",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b1544",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

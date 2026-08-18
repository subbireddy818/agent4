import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RealConnect — Real Estate Platform",
    template: "%s · RealConnect",
  },
  description:
    "All-in-one real estate platform for agents, builders, and developers. Manage leads, projects, events, campaigns, and channel partners seamlessly.",
  applicationName: "RealConnect",
  authors: [{ name: "RealConnect" }],
  icons: {
    icon: "/icon.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://rayulumukku.com/#person",
      "name": "Rayulu Mukku",
      "url": "https://rayulumukku.com/",
      "sameAs": [
        "https://github.com/rayulumukku",
        "https://gitlab.com/RayuluMukku",
        "https://www.linkedin.com/in/rayulumukku/",
      ],
      "owns": {
        "@id": "https://agents.online/#app",
      },
    },
    {
      "@type": "WebApplication",
      "@id": "https://agents.online/#app",
      "name": "Agents Online",
      "url": "https://agents.online/",
      "description":
        "A real estate platform for discovering and exploring properties for sale and rent.",
      "applicationCategory": "RealEstateApplication",
      "operatingSystem": "Web",
      "isAccessibleForFree": true,
      "creator": {
        "@id": "https://rayulumukku.com/#person",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}

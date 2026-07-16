import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit — A living task board",
  description:
    "Turn your tasks into a playful, animated orbit of colorful priority bubbles.",
  openGraph: {
    title: "Orbit — A living task board",
    description:
      "A playful task manager where priorities float, bounce, and come alive.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#7358e8",
              borderRadius: "0.9rem",
              fontFamily:
                'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif',
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

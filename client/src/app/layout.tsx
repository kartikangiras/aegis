import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "AEGIS — Context Memory AI",
  description: "Ingest anything. Remember forever. Context memory AI built on AWS — persistent knowledge graph powered by S3 and DynamoDB.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

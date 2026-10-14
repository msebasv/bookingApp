import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { AdminRoleLink } from "@/components/admin-role-link";
import { SiteFooter, SiteHeader } from "@/components/shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookingApp",
  description: "Gestión y reserva de salas de estudio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader
          extra={
            <Suspense fallback={null}>
              <AdminRoleLink />
            </Suspense>
          }
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

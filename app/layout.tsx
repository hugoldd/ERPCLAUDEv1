import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"] 
});

export const metadata: Metadata = {
  title: "ERP Gestion de Projet",
  description: "Solution de gestion pour la fonction publique territoriale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${ibmPlexSans.className} bg-[#1F2836] text-[#FFFFFF]`}>
        {children}
      </body>
    </html>
  );
}
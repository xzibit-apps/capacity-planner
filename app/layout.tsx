import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Box } from "@mui/material";
import { QueryProvider } from "../components/QueryProvider";
import Navigation from "./components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Capacity Planner",
  description: "Capacity planning and resource management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <Box sx={{ 
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          }}>
            <Navigation />
            <Box sx={{ 
              pt: 2,
              minHeight: 'calc(100vh - 64px)'
            }}>
              {children}
            </Box>
          </Box>
        </QueryProvider>
      </body>
    </html>
  );
}

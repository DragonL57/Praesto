import "../globals.css"
import { Inter } from "next/font/google"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./components/app-sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "UniTaskAI Documentation",
  description: "A documentation site for UniTaskAI using Next.js App Router",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger className="ml-3 mt-3" />
        <main className="flex-1 overflow-auto p-8 pt-16">{children}</main>
      </SidebarProvider>
    </div>
  )
}
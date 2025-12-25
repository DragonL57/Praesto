import { ThemeProvider } from '@/components/theme-provider';

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-dvh">
        {children}
      </div>
    </ThemeProvider>
  );
}
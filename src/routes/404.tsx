import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Home } from "lucide-react";

export const Route = createFileRoute("/404")({
  component: NotFoundPage,
});

function NotFoundPage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full text-center p-10">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight mt-6">404</h1>
        <p className="text-muted-foreground mt-2">
          {lang === "th"
            ? "หน้านี้ไม่มีอยู่ในระบบ"
            : "This page doesn't exist"}
        </p>
        <Button className="mt-8" asChild>
          <Link to="/dashboard">
            <Home className="w-4 h-4 mr-1.5" />
            {lang === "th" ? "กลับหน้าแรก" : "Go home"}
          </Link>
        </Button>
      </Card>
    </div>
  );
}

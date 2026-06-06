import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ToolCardProps {
  title: string;
  detail: string;
  description: string;
  href: string;
  cta?: string;
  external?: boolean;
  status?: string;
}

export default function ToolCard({
  title,
  description,
  href,
  detail,
  cta = "Open tool",
  external = false,
  status,
}: ToolCardProps) {
  return (
    <Card className="surface-panel group flex h-full flex-col border-white/40 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            {status ? (
              <span className="inline-flex w-fit rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                {status}
              </span>
            ) : null}
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
            {detail}
          </span>
        </div>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Button asChild variant={external ? "default" : "outline"}>
          <Link
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
          >
            {cta}
            {external ? <ExternalLink className="size-4" /> : <ArrowUpRight className="size-4" />}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

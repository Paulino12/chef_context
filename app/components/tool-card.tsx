import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

interface ToolCardProps {
  title: string;
  detail: string;
  description: string;
  href: string;
}

const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  href,
  detail,
}) => {
  return (
    <div className="group rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        <Button
          asChild
          variant="outline"
          className="cursor-pointer"
        >
          <Link href={href}>Open tool</Link>
        </Button>
      </div>
    </div>
  );
};

export default ToolCard;

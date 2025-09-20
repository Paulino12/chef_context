import React from "react";

interface Tool {
  title: string;
  description: string;
}

const ToolCard = ({ title, description }: Tool) => {
  return (
    <div className="flex flex-col p-4">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default ToolCard;

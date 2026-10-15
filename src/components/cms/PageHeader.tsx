import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  help?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

const PageHeader = ({ icon: Icon, title, description, help, actions, meta }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-primary transition-colors" aria-label={`About ${title}`}>
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">{help}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      {meta && <div className="mt-2">{meta}</div>}
    </div>
    {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;

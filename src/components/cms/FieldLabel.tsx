import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FieldLabelProps {
  children: string;
  help?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

const FieldLabel = ({ children, help, htmlFor, required, className }: FieldLabelProps) => (
  <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
    <Label htmlFor={htmlFor}>
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {help && (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex cursor-help text-muted-foreground hover:text-primary transition-colors" aria-label={`About ${children}`}>
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">{help}</TooltipContent>
      </Tooltip>
    )}
  </div>
);

export default FieldLabel;

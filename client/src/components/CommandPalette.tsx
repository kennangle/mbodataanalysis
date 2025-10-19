import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  HelpCircle,
  Stethoscope,
  Activity,
  Lightbulb,
  Palette,
  Smartphone,
  CheckCircle,
  Shield,
  Bug,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords?: string[];
  action?: () => void;
}

const commandGroups = [
  {
    heading: "Core Workflow",
    commands: [
      {
        id: "ask",
        label: "/ask",
        description: "Request confirmation before implementing changes",
        icon: <HelpCircle className="w-4 h-4" />,
        keywords: ["confirm", "approval", "permission"],
      },
      {
        id: "deep",
        label: "/deep",
        description: "Comprehensive diagnosis with thorough research",
        icon: <Stethoscope className="w-4 h-4" />,
        keywords: ["investigate", "diagnosis", "research", "analysis"],
      },
      {
        id: "diagnose",
        label: "/diagnose",
        description: "Systematic problem investigation and solution",
        icon: <Activity className="w-4 h-4" />,
        keywords: ["problem", "issue", "debug", "troubleshoot"],
      },
      {
        id: "anal",
        label: "/anal",
        description: "Advanced multi-dimensional analysis",
        icon: <Search className="w-4 h-4" />,
        keywords: ["performance", "security", "business", "data"],
      },
      {
        id: "suggest",
        label: "/suggest",
        description: "Detailed solution proposals without implementation",
        icon: <Lightbulb className="w-4 h-4" />,
        keywords: ["ideas", "proposal", "recommend"],
      },
    ],
  },
  {
    heading: "Design & Mobile",
    commands: [
      {
        id: "design",
        label: "/design",
        description: "Apply established design patterns and standards",
        icon: <Palette className="w-4 h-4" />,
        keywords: ["ui", "ux", "style", "theme"],
      },
      {
        id: "mobile",
        label: "/mobile",
        description: "Mobile-first optimization with 13 specialized checks",
        icon: <Smartphone className="w-4 h-4" />,
        keywords: ["responsive", "touch", "viewport", "mobile-first"],
      },
      {
        id: "mobile-touch",
        label: "/mobile touch",
        description: "Touch target audit (44px minimum)",
        icon: <Smartphone className="w-4 h-4" />,
        keywords: ["touch", "tap", "button", "target"],
      },
      {
        id: "mobile-audit",
        label: "/mobile audit",
        description: "Comprehensive mobile optimization audit",
        icon: <Smartphone className="w-4 h-4" />,
        keywords: ["mobile", "audit", "check", "review"],
      },
    ],
  },
  {
    heading: "Code Quality",
    commands: [
      {
        id: "es",
        label: "/es",
        description: "Run ESLint across entire codebase",
        icon: <CheckCircle className="w-4 h-4" />,
        keywords: ["lint", "quality", "eslint", "code"],
      },
      {
        id: "gr",
        label: "/gr",
        description: "Guardrails compliance review",
        icon: <Shield className="w-4 h-4" />,
        keywords: ["compliance", "policy", "rules", "guardrails"],
      },
      {
        id: "bug",
        label: "/bug",
        description: "Systematically document reported issues",
        icon: <Bug className="w-4 h-4" />,
        keywords: ["issue", "problem", "report", "track"],
      },
      {
        id: "unanswered",
        label: "/unanswered",
        description: "Find pending questions in conversation",
        icon: <MessageSquare className="w-4 h-4" />,
        keywords: ["questions", "pending", "unanswered"],
      },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Only enable in development mode
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (!isDevelopment) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isDevelopment]);

  const handleCommandSelect = (command: Command) => {
    setOpen(false);

    // Copy command to clipboard for use with AI
    navigator.clipboard.writeText(command.label).then(() => {
      // Show a toast notification
      toast({
        title: "Command copied",
        description: `${command.label} copied to clipboard. Paste it in your AI chat to use this workflow command.`,
      });
    });

    // Execute custom action if defined
    if (command.action) {
      command.action();
    }
  };

  // Only render in development mode
  if (!isDevelopment) {
    return null;
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." data-testid="input-command-search" />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {commandGroups.map((group, idx) => (
          <div key={group.heading}>
            <CommandGroup heading={group.heading}>
              {group.commands.map((command) => (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.description} ${command.keywords?.join(" ") || ""}`}
                  onSelect={() => handleCommandSelect(command)}
                  data-testid={`command-item-${command.id}`}
                >
                  {command.icon}
                  <div className="flex flex-col">
                    <span className="font-medium">{command.label}</span>
                    <span className="text-xs text-muted-foreground">{command.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {idx < commandGroups.length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
      <div className="border-t p-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            Press{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>{" "}
            to open
          </span>
          <span>Dev-only: AI-powered workflow commands</span>
        </div>
      </div>
    </CommandDialog>
  );
}

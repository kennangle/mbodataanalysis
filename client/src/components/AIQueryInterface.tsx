import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, User, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIQueryInterface() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: async (query: string) => {
      // Build conversation history (exclude system messages)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiRequest("POST", "/api/ai/query", { 
        query,
        conversationHistory
      });
      const result = (await response.json()) as { response: string; tokensUsed: number };
      return result;
    },
    onSuccess: (data, queryText) => {
      // Add user message and AI response to conversation
      setMessages(prev => [
        ...prev,
        { role: "user", content: queryText },
        { role: "assistant", content: data.response }
      ]);
      setQuery("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Query failed",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || mutation.isPending) return;
    mutation.mutate(query);
  };

  const handleClearConversation = () => {
    setMessages([]);
    setQuery("");
  };

  return (
    <Card className="flex flex-col h-full min-h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              data-testid="button-clear-conversation"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        <CardDescription>Ask questions about your data in plain English</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 min-h-0">
        {/* Conversation History */}
        {messages.length > 0 && (
          <ScrollArea className="flex-1 rounded-lg border" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[85%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>
        )}

        {/* Query Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder={
              messages.length === 0
                ? "e.g., What are my peak attendance times? Which classes have the best retention?"
                : "Ask a follow-up question..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
            disabled={mutation.isPending}
            data-testid="input-ai-query"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {query.length}/500 characters
            </span>
            <Button
              type="submit"
              disabled={mutation.isPending || !query.trim()}
              className="gap-2"
              data-testid="button-submit-query"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

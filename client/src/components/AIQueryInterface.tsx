import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";

export function AIQueryInterface() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    console.log("AI Query:", query);

    // Simulate AI response
    setTimeout(() => {
      setResponse(
        `Based on your data, here's what I found:\n\n` +
        `• Your highest attendance is on Friday evenings with an average of 70 students\n` +
        `• Revenue increased by 23% in the last quarter\n` +
        `• Top performing class: "HIIT Training" with 89% retention rate\n` +
        `• Recommended action: Consider adding another Friday evening class`
      );
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-Powered Insights</CardTitle>
        </div>
        <CardDescription>
          Ask questions about your data in plain English
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="e.g., What are my peak attendance times? Which classes have the best retention? How can I increase revenue?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px] resize-none"
            data-testid="input-ai-query"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="w-full gap-2"
            data-testid="button-submit-query"
          >
            {isLoading ? (
              <>Analyzing...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Ask AI
              </>
            )}
          </Button>
        </form>

        {response && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">AI Response:</p>
                <p className="whitespace-pre-line text-muted-foreground">{response}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

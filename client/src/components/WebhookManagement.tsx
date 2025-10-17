import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Webhook, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type WebhookSubscription = {
  id: string;
  eventType: string;
  status: string;
  webhookUrl: string;
  createdAt: string;
};

type WebhookEvent = {
  id: string;
  messageId: string;
  eventType: string;
  processed: boolean;
  error: string | null;
  receivedAt: string;
};

export function WebhookManagement() {
  const { toast } = useToast();
  const [selectedEventType] = useState<string>("classVisit.created");

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery<WebhookSubscription[]>({
    queryKey: ["/api/webhooks/subscriptions"],
  });

  // Fetch recent webhook events
  const { data: events = [], isLoading: loadingEvents } = useQuery<WebhookEvent[]>({
    queryKey: ["/api/webhooks/events"],
  });

  // Create subscription mutation
  const createSubscription = useMutation({
    mutationFn: async (eventType: string) => {
      return apiRequest("POST", "/api/webhooks/subscriptions", { eventType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/subscriptions"] });
      toast({
        title: "Webhook Enabled",
        description: "Real-time sync is now active. New bookings will appear automatically.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Enable Webhook",
        description: error.message,
      });
    },
  });

  // Delete subscription mutation
  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/webhooks/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/subscriptions"] });
      toast({
        title: "Webhook Disabled",
        description: "Real-time sync has been turned off.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Disable Webhook",
        description: error.message,
      });
    },
  });

  const activeSubscription = subscriptions.find(
    (sub) => sub.eventType === selectedEventType && sub.status === "active"
  );

  const isEnabled = !!activeSubscription;
  const isPending = createSubscription.isPending || deleteSubscription.isPending;

  const handleToggle = async () => {
    if (isEnabled && activeSubscription) {
      await deleteSubscription.mutateAsync(activeSubscription.id);
    } else {
      await createSubscription.mutateAsync(selectedEventType);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card data-testid="card-webhook-management">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Real-Time Sync</CardTitle>
          </div>
          {isEnabled && (
            <Badge variant="default" className="gap-1" data-testid="badge-webhook-status">
              <Activity className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          Get instant updates when new bookings are created. No API calls used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Section */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-0.5">
            <Label htmlFor="webhook-toggle" className="text-base font-medium">
              Enable Webhooks
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync new class visits in real-time
            </p>
          </div>
          <Switch
            id="webhook-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isPending || loadingSubscriptions}
            data-testid="switch-webhook-toggle"
          />
        </div>

        {/* Status Info */}
        {isEnabled && activeSubscription && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Subscription Active</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Event: <span className="font-mono">{activeSubscription.eventType}</span></p>
              <p>Created: {formatDate(activeSubscription.createdAt)}</p>
            </div>
          </div>
        )}

        {/* Recent Events */}
        {isEnabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Recent Events</Label>
              <Badge variant="secondary" data-testid="badge-event-count">
                {events.length} total
              </Badge>
            </div>
            
            {loadingEvents ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for webhook events...</p>
                <p className="text-xs mt-1">New bookings will appear here automatically</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-3 space-y-2">
                  {events.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-md hover-elevate"
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {event.processed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : event.error ? (
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {event.eventType}
                          </span>
                        </div>
                        {event.error && (
                          <p className="text-xs text-destructive mt-1 truncate">
                            {event.error}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(event.receivedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Help Text */}
        {!isEnabled && (
          <div className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-1">Why enable webhooks?</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Get instant updates when bookings are created</li>
              <li>No API calls consumed - completely free</li>
              <li>Your data stays current automatically</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

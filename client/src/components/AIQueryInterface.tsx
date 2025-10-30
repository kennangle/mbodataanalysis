import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, User, Trash2, Paperclip, X, FileText, Download, Mic, MicOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatHistorySidebar } from "./ChatHistorySidebar";

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface DownloadLink {
  url: string;
  filename: string;
}

// Extract download URLs from AI response
function extractDownloadLinks(content: string): { text: string; downloads: DownloadLink[] } {
  const downloads: DownloadLink[] = [];
  const downloadUrlRegex = /\[Download: ([^\]]+)\]\((\/api\/files\/download\/[^)]+)\)/g;
  
  let match;
  while ((match = downloadUrlRegex.exec(content)) !== null) {
    downloads.push({
      filename: match[1],
      url: match[2],
    });
  }
  
  // Remove download links from text
  const text = content.replace(downloadUrlRegex, '').trim();
  
  return { text, downloads };
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export function AIQueryInterface() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFileIds, setAttachedFileIds] = useState<string[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: uploadedFiles = [] } = useQuery<UploadedFile[]>({
    queryKey: ["/api/files"],
  });

  // Load conversation messages when a conversation is selected
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["/api/conversations", currentConversationId],
    enabled: !!currentConversationId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/conversations/${currentConversationId}`);
      return await response.json() as { 
        conversation: { id: string; title: string };
        messages: ConversationMessage[] 
      };
    },
  });

  // Update messages when conversation data is loaded
  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })));
    }
  }, [conversationData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      return (await response.json()) as UploadedFile;
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded",
        description: `${data.fileName} is ready to use`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setAttachedFileIds(prev => [...prev, data.id]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (query: string) => {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiRequest("POST", "/api/ai/query", { 
        query,
        conversationHistory,
        fileIds: attachedFileIds.length > 0 ? attachedFileIds : undefined,
        conversationId: currentConversationId,
        saveToHistory: true,
      });
      const result = (await response.json()) as { 
        response: string; 
        tokensUsed: number;
        conversationId?: string;
      };
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

      // Update current conversation ID if a new one was created
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }

      // Invalidate conversations list to refresh the sidebar
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
    setAttachedFileIds([]);
    setCurrentConversationId(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setQuery("");
    setAttachedFileIds([]);
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (conversationId: string | null) => {
    setCurrentConversationId(conversationId);
    setQuery("");
    setAttachedFileIds([]);
    // Messages will be loaded by the useEffect hook
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadMutation.mutate(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFileIds(prev => prev.filter(id => id !== fileId));
  };

  const attachedFiles = uploadedFiles.filter(f => attachedFileIds.includes(f.id));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, allow Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !mutation.isPending) {
        mutation.mutate(query);
      }
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setQuery(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          toast({
            variant: "destructive",
            title: "Microphone access denied",
            description: "Please allow microphone access in your browser settings to use voice input.",
          });
        } else if (event.error !== 'aborted') {
          toast({
            variant: "destructive",
            title: "Voice input error",
            description: "There was an error with voice recognition. Please try again.",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isRecording) {
          // If still recording, restart recognition (it stopped automatically)
          try {
            recognition.start();
          } catch (e) {
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, toast]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        variant: "destructive",
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input. Please try Chrome, Edge, or Safari.",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          variant: "destructive",
          title: "Could not start voice input",
          description: "Please try again or check your microphone permissions.",
        });
      }
    }
  };

  return (
    <div className="flex w-full h-full min-h-[600px] gap-4">
      {/* Chat History Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full">
          <ChatHistorySidebar
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </Card>
      </div>

      {/* Main Chat Interface */}
      <Card className="flex flex-col flex-1">
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
                    {message.role === "assistant" ? (
                      (() => {
                        const { text, downloads } = extractDownloadLinks(message.content);
                        return (
                          <div className="space-y-3">
                            <p className="text-sm whitespace-pre-line break-words">{text}</p>
                            {downloads.length > 0 && (
                              <div className="flex flex-col gap-2 pt-2 border-t">
                                {downloads.map((download, idx) => (
                                  <a
                                    key={idx}
                                    href={download.url}
                                    download={download.filename}
                                    className="inline-flex"
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      data-testid={`button-download-${idx}`}
                                    >
                                      <Download className="h-4 w-4" />
                                      Download {download.filename}
                                    </Button>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
                    )}
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
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <Badge key={file.id} variant="secondary" className="gap-2 px-3 py-1" data-testid={`file-badge-${file.id}`}>
                  <FileText className="h-3 w-3" />
                  <span className="text-xs">{file.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="hover-elevate rounded-full"
                    data-testid={`button-remove-file-${file.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Textarea
            placeholder={
              messages.length === 0
                ? "e.g., What are my peak attendance times? Which classes have the best retention?"
                : "Ask a follow-up question..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none"
            maxLength={500}
            disabled={mutation.isPending}
            data-testid="input-ai-query"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending || mutation.isPending}
                className="gap-2"
                data-testid="button-attach-file"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                Attach File
              </Button>
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleVoiceInput}
                disabled={mutation.isPending}
                className="gap-2"
                data-testid="button-voice-input"
              >
                {isListening ? (
                  <>
                    <Mic className="h-4 w-4 animate-pulse" />
                    Listening...
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Voice
                  </>
                )}
              </Button>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {query.length}/500 characters
                </span>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span>
              </div>
            </div>
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
    </div>
  );
}

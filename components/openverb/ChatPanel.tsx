"use client";

import React from "react"

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Loader2, CheckCircle, XCircle, Wrench } from "lucide-react";

function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  if (!parts || !Array.isArray(parts)) return "";
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI Assistant
          {isLoading && (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Thinking...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <div
        className="flex-1 overflow-y-auto p-4 scroll-smooth min-h-0"
        ref={scrollRef}
      >
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ask me to complete tasks!</p>
              <p className="text-xs mt-1">Try: "Clean up the kitchen trash"</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              <div
                className={`max-w-[85%] space-y-2 ${message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2"
                    : "bg-muted rounded-2xl rounded-tl-sm px-3 py-2"
                  }`}
              >
                {message.parts?.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={index} className="text-sm whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }

                  // Handle tool calls
                  if (part.type.startsWith("tool-")) {
                    const toolPart = part as {
                      type: string;
                      state: string;
                      input?: Record<string, unknown>;
                      output?: { success?: boolean; message?: string };
                    };

                    return (
                      <div
                        key={index}
                        className="bg-background/50 rounded-lg p-2 text-xs border"
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          <Wrench className="w-3 h-3" />
                          <span className="font-mono">
                            {part.type.replace("tool-", "")}
                          </span>
                          {toolPart.state === "input-streaming" && (
                            <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                          )}
                          {toolPart.state === "output-available" && toolPart.output?.success && (
                            <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                          )}
                          {toolPart.state === "output-available" && toolPart.output?.success === false && (
                            <XCircle className="w-3 h-3 text-red-500 ml-auto" />
                          )}
                        </div>

                        {toolPart.state === "input-available" && toolPart.input && (
                          <pre className="mt-1 text-[10px] text-muted-foreground overflow-x-auto">
                            {JSON.stringify(toolPart.input, null, 2)}
                          </pre>
                        )}

                        {toolPart.state === "output-available" && toolPart.output && (
                          <div className="mt-1 text-muted-foreground">
                            {toolPart.output.message && <p>{toolPart.output.message}</p>}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {message.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <CardContent className="p-3 border-t flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to complete a task..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="flex gap-1 mt-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-accent"
            onClick={() => setInput("Clean the kitchen trash")}
          >
            Clean trash
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-accent"
            onClick={() => setInput("Turn off all the lights")}
          >
            Lights off
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-accent"
            onClick={() => setInput("What tasks are available?")}
          >
            List tasks
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

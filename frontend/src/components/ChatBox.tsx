"use client";

import { useState, useEffect, useRef } from 'react';
import { useSpaceWebSocket } from '@/hooks/useSpaceWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  event: 'CHAT_MESSAGE';
  user_id: string;
  user_name: string;
  space_id: string;
  message: string;
  timestamp: number;
}

export function ChatBox({ spaceId }: { spaceId: string }) {
  const { user } = useAuth();
  const { isSubscribed, sendChatMessage, onChatMessage } = useSpaceWebSocket(spaceId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storageKey = `chat-history-${spaceId}`;
    const storedMessages = localStorage.getItem(storageKey);
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Failed to parse stored messages:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [spaceId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const storageKey = `chat-history-${spaceId}`;
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, spaceId]);

  useEffect(() => {
    onChatMessage((message) => {
      // Check for duplicates before adding
      setMessages((prev) => {
        const isDuplicate = prev.some(
          (msg) => msg.timestamp === message.timestamp && msg.user_id === message.user_id
        );
        if (isDuplicate) {
          return prev;
        }
        return [...prev, message];
      });
    });
  }, [onChatMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && isSubscribed) {
      sendChatMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="glass-panel flex h-full flex-col rounded-[24px] p-3">
      <h4 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
        Space Chat
      </h4>
      
      {/* Messages Container */}
      <div className="mb-3 flex-1 space-y-3 overflow-y-auto px-1">
        <AnimatePresence>
          {messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <motion.div
                key={msg.timestamp + msg.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[82%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                  <span className="mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {isOwn ? "You" : (msg.user_name || "Anonymous")}
                  </span>
                  <div className={`rounded-2xl px-3 py-2.5 ${
                    isOwn 
                      ? "bg-[rgba(215,163,102,0.16)] text-[var(--text-primary)] border border-[rgba(239,188,130,0.18)]"
                      : "bg-white/[0.05] text-[var(--text-secondary)] border border-white/8"
                  }`}>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isSubscribed ? "Type a message..." : "Connecting..."}
          disabled={!isSubscribed}
          className="input-field flex-1 rounded-full px-4 py-3 text-sm"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button 
          type="submit" 
          disabled={!isSubscribed || !newMessage.trim()} 
          className="btn-success h-11 w-11 rounded-full p-0 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

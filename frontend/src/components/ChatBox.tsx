"use client";

import { useState, useEffect, useRef } from 'react';
import { useSpaceWebSocket } from '@/hooks/useSpaceWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// This must match the interface in useSpaceWebSocket.ts
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

  useEffect(() => {
    // Listen for new chat messages
    onChatMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });
  }, [onChatMessage]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
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
    <div className="bg-apple-light-bg/50 dark:bg-apple-dark-bg/50 rounded-lg p-3 flex flex-col h-full max-h-96">
      <h4 className="text-sm font-medium text-apple-light-label dark:text-apple-dark-label mb-2 flex-shrink-0">
        Space Chat
      </h4>
      <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-2">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.timestamp + msg.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-sm ${msg.user_id === user?.id ? 'text-right' : 'text-left'}`}
            >
              <span className={`font-semibold text-xs ${msg.user_id === user?.id ? 'text-apple-blue' : 'text-green-500'}`}>
                {msg.user_id === user?.id ? 'You' : (msg.user_name || 'Anonymous')}
              </span>
              <p className="text-apple-black dark:text-apple-white break-words bg-apple-light-bg dark:bg-apple-dark-bg px-2 py-1 rounded-md inline-block max-w-xs">
                {msg.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex space-x-2 flex-shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isSubscribed ? 'Type a message...' : 'Connecting to chat...'}
          disabled={!isSubscribed}
          className="flex-1 auth-input text-sm"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button type="submit" disabled={!isSubscribed || !newMessage.trim()} className="auth-button p-2 w-auto h-auto disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
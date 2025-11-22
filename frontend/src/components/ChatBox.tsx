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
      setMessages((prev) => [...prev, message]);
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
    <div className="flex flex-col h-full">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 px-1">
        Space Chat
      </h4>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 px-1">
        <AnimatePresence>
          {messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <motion.div
                key={msg.timestamp + msg.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs font-medium text-gray-600 mb-1 px-1">
                    {isOwn ? 'You' : (msg.user_name || 'Anonymous')}
                  </span>
                  <div className={`rounded-lg px-3 py-2 ${
                    isOwn 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
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
          placeholder={isSubscribed ? 'Type a message...' : 'Connecting...'}
          disabled={!isSubscribed}
          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button 
          type="submit" 
          disabled={!isSubscribed || !newMessage.trim()} 
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
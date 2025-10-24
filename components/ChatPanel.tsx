import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { SendIcon, CloseIcon } from './IconComponents';

interface ChatPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSendMessage, onClose }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loadingDots, setLoadingDots] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingDots(prev => (prev.length >= 3 ? '' : prev + '.'));
            }, 400);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">AI와 대화하여 계획 수정하기</h3>
                <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-800 transition-colors" aria-label="Close chat">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-sm lg:max-w-md rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-200 text-slate-800 rounded-2xl px-4 py-2">
                           <div className="flex items-center text-sm">
                                <span>일정 다시 계획 중</span>
                                <span className="inline-block w-4 text-left">{loadingDots}</span>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="예: 3일차 일정을 바꿔줘"
                        className="w-full px-4 py-2 border border-slate-300 rounded-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:bg-slate-400 transition-all duration-200 flex-shrink-0"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
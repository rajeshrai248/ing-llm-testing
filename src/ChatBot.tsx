import { useState, useRef, useEffect, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CHAT_ENDPOINT } from "./constants";
import { makeApiRequest } from "./api";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  answer: string;
  model_used?: string;
  pre_computed?: any;
}

function ChatBot() {
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Popup visible by default
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize welcome message (and update when language changes)
  useEffect(() => {
    setMessages(prev => {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "bot",
        content: t('chatbot.welcome'),
        timestamp: new Date(),
      };
      if (prev.length === 0) return [welcomeMsg];
      // Update only the welcome message if it exists
      return prev.map(msg => msg.id === "welcome" ? { ...msg, content: t('chatbot.welcome') } : msg);
    });
  }, [t]);

  const suggestionChips = [
    t('chatbot.chip1'),
    t('chatbot.chip2'),
    t('chatbot.chip3'),
    t('chatbot.chip4'),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Format history for the backend - convert "bot" role to "assistant" for Anthropic API
      const history = messages.map((msg) => ({
        role: msg.role === "bot" ? "assistant" : "user",
        content: msg.content,
      }));

      const response = await makeApiRequest<ChatResponse>(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          question: text.trim(),
          history,
          lang: i18n.language || "en",
        },
        timeout: 60000,
      });

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      // Fallback mock response when backend is unavailable
      const mockMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: t('chatbot.fallback', { question: text.trim() }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, mockMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleChipClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const currentLocale = i18n.language === 'fr-be' ? 'fr-BE' : i18n.language === 'nl-be' ? 'nl-BE' : 'en-GB';
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit" });

  // Helper function to parse markdown and convert to JSX
  const renderMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, idx) => {
      // Handle bold text: **text** → <strong>text</strong>
      const boldConverted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      // Handle bullet points
      if (line.trim().startsWith('•')) {
        parts.push(
          <div key={`line-${idx}`} className="markdown-bullet">
            <div dangerouslySetInnerHTML={{ __html: boldConverted }} />
          </div>
        );
      } else if (line.trim().startsWith('-') && line.trim().length > 1 && line.trim()[1] === ' ') {
        // Handle dash bullets too
        parts.push(
          <div key={`line-${idx}`} className="markdown-bullet markdown-dash-bullet">
            <div dangerouslySetInnerHTML={{ __html: boldConverted }} />
          </div>
        );
      } else if (line.trim()) {
        // Regular paragraph
        parts.push(
          <div 
            key={`line-${idx}`} 
            className="markdown-paragraph"
            dangerouslySetInnerHTML={{ __html: boldConverted }}
          />
        );
      } else {
        // Empty line for spacing
        parts.push(<div key={`line-${idx}`} className="markdown-spacer" />);
      }
    });

    return <div className="markdown-content">{parts}</div>;
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
        title={t('chatbot.toggleLabel')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Chat Popup Modal */}
      {isOpen && (
        <div className="chatbot-popup-overlay">
          <div className="chatbot-popup">
            {/* Header */}
            <div className="chatbot-popup-header">
              <div className="chatbot-popup-title-section">
                <h3 className="chatbot-popup-title">🧠 {t('chatbot.title')}</h3>
                <p className="chatbot-popup-subtitle">{t('chatbot.subtitle')}</p>
              </div>
              <button
                className="chatbot-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="chatbot-popup-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.role === "bot" ? "chat-bot" : "chat-user"}`}
                >
                  {msg.role === "bot" && (
                    <div className="chat-avatar">
                      <span className="avatar-icon">🤖</span>
                    </div>
                  )}
                  <div className="chat-bubble-wrapper">
                    <div className="chat-bubble">
                      {msg.role === "bot" ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <span className="chat-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.role === "user" && (
                    <div className="chat-avatar user-avatar">
                      <span className="avatar-icon">👤</span>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="chat-message chat-bot">
                  <div className="chat-avatar">
                    <span className="avatar-icon">🤖</span>
                  </div>
                  <div className="chat-bubble-wrapper">
                    <div className="chat-bubble typing-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {messages.length <= 1 && (
              <div className="chatbot-popup-suggestions">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    className="suggestion-chip"
                    onClick={() => handleChipClick(chip)}
                    disabled={isTyping}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form className="chatbot-popup-input-area" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="chatbot-popup-input"
                placeholder={t('chatbot.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
              />
              <button
                type="submit"
                className="chatbot-popup-send-btn"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;

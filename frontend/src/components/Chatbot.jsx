import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import api from '../api';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', title: '👋 Welcome!', text: "Hi! I'm the NUST Sports Portal assistant. Ask me about memberships, fees, schedules, or anything else!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', text: msg }]);
    setLoading(true);

    try {
      // Direct fetch — chatbot is public, no auth needed
      const res = await fetch('http://localhost:3000/api/v1/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      const reply = data.reply;
      setMessages(prev => [...prev, { type: 'bot', title: reply.title, text: reply.message }]);
    } catch {
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, the assistant is temporarily unavailable. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };


  const handleKeyDown = (e) => { if (e.key === 'Enter') send(); };

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(!open)} title="Help Assistant">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <h3>💬 Help Assistant</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-msg chatbot-msg-${m.type}`}>
                {m.title && <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{m.title}</strong>}
                {m.text.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
              </div>
            ))}
            {loading && <div className="chatbot-msg chatbot-msg-bot"><em>Typing...</em></div>}
          </div>
          <div className="chatbot-input-area">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={loading}
            />
            <button className="btn btn-primary btn-sm" onClick={send} disabled={loading}><Send size={14} /></button>
          </div>
        </div>
      )}
    </>
  );
}

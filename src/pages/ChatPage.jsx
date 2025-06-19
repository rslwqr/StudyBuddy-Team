import './ChatPage.css';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const navigate = useNavigate();

    // 🔒 Заменить при необходимости на данные из localStorage
    const user_id = 3;
    const syllabus_id = 2;

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput(''); // ✅ очищаем сразу после ввода

        try {
            const res = await fetch(
                `http://localhost:8000/chat?user_id=${user_id}&syllabus_id=${syllabus_id}&content=${encodeURIComponent(input)}`,
                { method: 'POST' }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Unknown error');
            }

            const data = await res.json();
            const botMessage = { sender: 'bot', text: data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            console.error('❌ Error in /chat:', err);
            setMessages(prev => [...prev, { sender: 'bot', text: '⚠ AI error: could not respond.' }]);
        }
    };

    return (
        <div className="chat-container">
            {/* Header */}
            <header className="chat-header">
                <button className="back-button-chatpage" onClick={() => navigate('/')}>
                    ← Back
                </button>

                <div className="chat-title">StudyBuddy Chat</div>

                <Link to="/profile">
                    <img
                        src="/profile-icon.png"
                        alt="Profile"
                        className="chat-profile-icon"
                    />
                </Link>
            </header>

            {/* Chat content */}
            {messages.length === 0 ? (
                <div className="chat-welcome">
                    <h1>Hello!</h1>
                    <p>I am here to help you</p>
                </div>
            ) : (
                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`chat-message ${msg.sender === 'user' ? 'user' : 'bot'}`}
                        >
                            {msg.text}
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="chat-input-wrapper">
                <input
                    type="text"
                    placeholder="Write the number of the week or the topic to receive the task"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button
                    onClick={handleSend}
                    className="input-send-button"
                    aria-label="Send"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

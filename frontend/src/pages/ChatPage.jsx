import './ChatPage.css';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const navigate = useNavigate();

    const user_id = parseInt(localStorage.getItem("user_id"));
    const syllabus_id = parseInt(localStorage.getItem("syllabus_id"));

    useEffect(() => {
        if (!user_id || !syllabus_id) {
            alert("You must be logged in and upload your syllabus before using the chat.");
            navigate('/');
        }
    }, [user_id, syllabus_id, navigate]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            const payload = {
                user_id: user_id,
                syllabus_id: syllabus_id,
                content: input
            };

            console.log("📤 Sending to backend:", payload);

            const res = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('❌ Server responded with:', errorData);
                throw new Error(errorData.detail || 'Unknown error');
            }

            const data = await res.json();

            const botMessage = {
                sender: 'bot',
                text: data.reply // теперь не очищаем Markdown, он будет отрисован красиво через ReactMarkdown
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            console.error('❌ Error in /chat:', err);
            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: '⚠ AI error: could not respond.' },
            ]);
        }
    };

    return (
        <div className="chat-container">
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
                            {msg.sender === 'bot' ? (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            ) : (
                                msg.text
                            )}
                        </div>
                    ))}
                </div>
            )}

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
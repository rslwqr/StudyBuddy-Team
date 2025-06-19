import './ChatPage.css'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function ChatPage() {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const navigate = useNavigate()

    const handleSend = () => {
        if (!input.trim()) return
        setMessages(prev => [...prev, { sender: 'user', text: input }])
        setInput('')
    }

    return (
        <div className="chat-container">
            {/* Шапка */}
            <header className="chat-header">
                <button className="back-button-chatpage" onClick={() => navigate('/')}>
                    ← Back
                </button>

                <div className="chat-title">StudyBuddy Chat</div>

                <Link to="/profile">
                    <img
                        src="/profile-icon.png"  // ✅ из public
                        alt="Profile"
                        className="chat-profile-icon"
                    />
                </Link>
            </header>

            {/* Сообщения или приветствие */}
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

            {/* Поле ввода и кнопка отправки */}
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
    )
}

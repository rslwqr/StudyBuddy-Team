import './ChatPage.css'
import { useState } from 'react'

export default function ChatPage() {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')

    const handleSend = () => {
        if (!input.trim()) return
        setMessages(prev => [...prev, { sender: 'user', text: input }])
        setInput('')
    }

    return (
        <div className="chat-container">
            <div className="chat-header">StudyBuddy Chat</div>

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

            {/* 👇 Поле ввода со встроенной кнопкой */}
            <div className="chat-input-wrapper">
                <input
                    type="text"
                    placeholder="Your text"
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

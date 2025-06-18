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

            <div className="chat-input-area">
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    )
}

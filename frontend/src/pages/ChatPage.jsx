import './ChatPage.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import profileIconChat from '../assets/profile-icon-chatpage.svg';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const navigate = useNavigate();

    const user_id = parseInt(localStorage.getItem("user_id"));
    const syllabus_id = parseInt(localStorage.getItem("syllabus_id"));

    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!user_id || !syllabus_id) {
            alert("You must be logged in and upload your syllabus before using the chat.");
            navigate('/');
        }
    }, [user_id, syllabus_id, navigate]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const submitSolution = async (code) => {
        try {
            const res = await fetch('http://localhost:8000/tasks');
            const tasks = await res.json();
            const recentTasks = tasks.slice(-2); // проверка по последним двум задачам

            for (let task of recentTasks) {
                const solutionPayload = {
                    user_id,
                    task_id: task.id,
                    code: code
                };

                const res = await fetch('http://localhost:8000/submit_solution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(solutionPayload),
                });

                const data = await res.json();
                if (data.is_correct) {
                    setMessages(prev => [...prev, { sender: 'bot', text: data.evaluation }]);
                    return;
                }
            }

            setMessages(prev => [...prev, { sender: 'bot', text: "❌ Your code didn't match any known task." }]);
        } catch (error) {
            console.error("🚨 Error submitting solution:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "⚠ Error while checking the solution." }]);
        }
    };


    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    const isLikelyCode = (text) => {
        return /def\s+\w+|print\(|for\s+\w+\s+in|while\s+|class\s+/.test(text);
    };


    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const payload = { user_id, syllabus_id, content: input };

            setMessages(prev => [...prev, { sender: 'bot', text: 'loading' }]);

            const res = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Unknown error');
            }

            const data = await res.json();

            const fullText = data.reply;
            let currentText = '';

            for (let i = 0; i < fullText.length; i++) {
                currentText += fullText[i];
                await new Promise(resolve => setTimeout(resolve, 15));

                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { sender: 'bot', text: currentText };
                    return updated;
                });
            }

            scrollToBottom();
            if (isLikelyCode(input)) {
                await submitSolution(input);
                return;
            }




        } catch (err) {
            console.error('❌ Error in /chat:', err);
            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: '⚠ AI error: could not respond.' },
            ]);
            scrollToBottom();
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
                        src={profileIconChat}
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
                        <div key={idx} className={`chat-message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                            {msg.sender === 'bot' ? (
                                msg.text === 'loading' ? (
                                    <span className="loading-placeholder">Loading...</span>
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ ...props }) => <h1 className="markdown-heading markdown-h1" {...props} />,
                                            h2: ({ ...props }) => <h2 className="markdown-heading markdown-h2" {...props} />,
                                            h3: ({ ...props }) => <h3 className="markdown-heading markdown-h3" {...props} />,
                                            h4: ({ ...props }) => <h4 className="markdown-heading markdown-h4" {...props} />,
                                            h5: ({ ...props }) => <h5 className="markdown-heading markdown-h5" {...props} />,
                                            h6: ({ ...props }) => <h6 className="markdown-heading markdown-h6" {...props} />,
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                )
                            ) : (
                                msg.text
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className="chat-input-wrapper">
                <textarea
                    ref={textareaRef}
                    placeholder="Write the number of the week or the topic to receive the task"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    rows={1}
                    style={{ resize: 'none', overflow: 'hidden' }}
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
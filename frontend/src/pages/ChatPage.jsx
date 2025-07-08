import './ChatPage.css';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import { TopBar } from './TopBar';
import ChatSidebar from '../pages/ChatSidebar';

import pencilIcon from '../assets/pencil-icon.svg';
import sendButtonIcon from '../assets/send-button.svg';
import stopButtonIcon from '../assets/stop-button.svg';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [userName, setUserName] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [chatSessions, setChatSessions] = useState([]);

    const abortControllerRef = useRef(null);
    const textareaRef = useRef(null);
    const bottomRef = useRef(null);

    const user_id = +localStorage.getItem('user_id');
    const syllabus_id = +localStorage.getItem('syllabus_id');

    const fetchChatHistory = async (sessId) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/chat_history/${sessId}`);
            if (res.ok) {
                const history = await res.json();
                const formatted = history.map(m => ({
                    sender: m.sender,
                    text: m.content,
                    time: m.timestamp,
                }));
                setMessages(formatted);
            }
        } catch (err) {
            console.error("Ошибка при получении истории чата", err);
        }
    };

    useEffect(() => {
        if (!user_id || !syllabus_id) {
            alert('You must be logged in and upload your syllabus before using the chat.');
            window.location.href = '/';
            return;
        }

        const name = localStorage.getItem('user_name');
        if (name) setUserName(name);

        const saved = localStorage.getItem('chat_sessions');
        if (saved) setChatSessions(JSON.parse(saved));

        const existingSession = localStorage.getItem('session_id');
        if (existingSession) {
            setSessionId(+existingSession);
            fetchChatHistory(+existingSession);
        } else {
            // 👇 Создаём новую сессию, если её нет
            fetch('http://127.0.0.1:8000/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id }),
            })
                .then(res => res.json())
                .then(data => {
                    localStorage.setItem('session_id', data.session_id);
                    setSessionId(data.session_id);
                    fetchChatHistory(data.session_id);
                })
                .catch(err => {
                    console.error('Ошибка создания сессии:', err);
                });
        }
    }, [user_id, syllabus_id]);


    useEffect(() => {
        const last = messages[messages.length - 1];
        if (last?.sender === 'bot' || last?.text === 'loading') {
            scrollToBottom(true);
        }
    }, [messages]);

    const scrollToBottom = (smooth = false) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    const isLikelyCode = text => /Task\s*\d+:/.test(text);

    const submitSolution = async (code) => {
        try {
            const res = await fetch('http://127.0.0.1:8000/submit_solution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id,
                    syllabus_id,
                    session_id: sessionId,
                    task_id: 0,
                    code
                })
            });
            const data = await res.json();

            if (!res.ok) {
                const errMsg = data.detail || 'Ошибка при проверке решения';
                throw new Error(errMsg);
            }

            await fetchChatHistory(sessionId);
        } catch (err) {
            console.error(err);
            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: err.message }
        ]);
            scrollToBottom();
        }
    };

    const sendMessage = async content => {
        if (!sessionId) return;

        // сразу добавляем user-сообщение и placeholder «loading»
        setMessages(prev => [
            ...prev,
            { sender: 'user', text: content },
            { sender: 'bot', text: 'loading' }
        ]);
        scrollToBottom();

        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;
        setIsStreaming(true);

        try {
            const res = await fetch('http://127.0.0.1:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id,
                    syllabus_id,
                    session_id: sessionId,
                    content
                }),
                signal: ctrl.signal,
            });
            if (!res.ok) throw new Error();
            const { reply } = await res.json();

            // стримим по символу, обновляя последний бот-месседж
            let soFar = '';
            for (let ch of reply) {
                if (ctrl.signal.aborted) break;
                soFar += ch;
                await new Promise(r => setTimeout(r, 15));
                setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { sender: 'bot', text: soFar };
                    return copy;
                });
                scrollToBottom();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev => [
                    ...prev,
                    { sender: 'bot', text: '⚠️ AI error: could not respond.' }
                ]);
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };


    const handleSend = async () => {
        const txt = input.trim();
        if (!txt) return;

        if (!sessionId) {
            alert("⚠️ Chat session is not ready yet. Please wait a moment.");
            return;
        }

        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        if (isLikelyCode(txt)) {
            await submitSolution(txt);
        } else {
            await sendMessage(txt);
        }
    };

    const onInputChange = e => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div className="chat-layout">
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} isSidebarOpen={isSidebarOpen} />

            <ChatSidebar
                chatSessions={chatSessions}
                activeSessionId={sessionId}
                onSelectSession={async (id) => {
                    setSessionId(id);
                    localStorage.setItem('session_id', id);
                    await fetchChatHistory(id);
                    setIsSidebarOpen(false);
                }}
                onNewChat={async () => {
                    const res = await fetch('http://127.0.0.1:8000/sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id }),
                    });
                    const data = await res.json();
                    setSessionId(data.session_id);
                    setMessages([]);
                    localStorage.setItem('session_id', data.session_id);
                }}
                isSidebarOpen={isSidebarOpen}
                onCloseSidebar={() => setIsSidebarOpen(false)}
            />

            <div className="chat-main" style={{ marginLeft: isSidebarOpen ? '220px' : '0', paddingTop: '80px' }}>
                <div className="chat-minimal-container">
                    {messages.length === 0 ? (
                        <div className="chat-welcome">
                            <h1>Hello{userName ? `, ${userName}` : ''}!</h1>
                            <p>I’m your Study Buddy<br />— ready to help with any topic from your syllabus.</p>
                        </div>
                    ) : (
                        <div className="chat-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-message ${msg.sender}`}>
                                    {msg.sender === 'bot' && msg.text !== 'loading' ? (
                                        <div className="chat-markdown-card">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    ) : msg.text === 'loading' ? (
                                        <span className="loading-placeholder">Loading...</span>
                                    ) : (
                                        <span>{msg.text}</span>
                                    )}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    <div className="chat-input-bar">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={onInputChange}
                            placeholder="Write the number of week or the topic from syllabus..."
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={1}
                        />
                        {isStreaming ? (
                            <button className="stop-btn" onClick={() => abortControllerRef.current?.abort()}>
                                <img src={stopButtonIcon} alt="Stop" className="chat-icon-button" />
                            </button>
                        ) : (
                            <button className="send-arrow" onClick={handleSend}>
                                <img src={sendButtonIcon} alt="Send" className="chat-icon-button" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

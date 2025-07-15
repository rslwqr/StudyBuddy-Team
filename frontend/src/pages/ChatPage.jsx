import './ChatPage.css';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import { TopBar } from './TopBar';
import ChatSidebar from '../pages/ChatSidebar';

import sendButtonIcon from '../assets/send-button.svg';
import stopButtonIcon from '../assets/stop-button.svg';
import hintButtonIcon from '../assets/hint-button.svg';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [userName, setUserName] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [chatSessions, setChatSessions] = useState([]);
    const [showHintButton, setShowHintButton] = useState(false);
    const [awaitingHintTask, setAwaitingHintTask] = useState(false);

    const abortControllerRef = useRef(null);
    const textareaRef = useRef(null);
    const bottomRef = useRef(null);

    const scrollToBottom = (smooth = false) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

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
            console.error("Failed to fetch chat history", err);
        }
    };

    const fetchSessionList = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/user_sessions/${user_id}`);
            const data = await res.json();
            setChatSessions(data);
            localStorage.setItem('chat_sessions', JSON.stringify(data));
        } catch (err) {
            console.error("Failed to fetch session list", err);
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

        fetchSessionList();

        const existingSession = localStorage.getItem('session_id');
        if (existingSession) {
            setSessionId(+existingSession);
            fetchChatHistory(+existingSession);
        }
    }, [user_id, syllabus_id]);

    // Show hint button only if the last bot message contains both Task 1 and Task 2
    useEffect(() => {
        if (messages.length > 0) {
            const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot' && m.text && m.text !== 'loading');
            if (
                lastBotMessage &&
                (
                    (lastBotMessage.text.includes('Task 1:') && lastBotMessage.text.includes('Task 2:')) ||
                    lastBotMessage.text.toLowerCase().includes('would you like a hint') ||
                    lastBotMessage.text.toLowerCase().includes('do you want a hint') ||
                    lastBotMessage.text.toLowerCase().includes('hint')
                )
            ) {
                setShowHintButton(true);
            } else {
                setShowHintButton(false);
            }
        } else {
            setShowHintButton(false);
        }
    }, [messages]);

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
                const errMsg = data.detail || 'Solution submission failed';
                throw new Error(errMsg);
            }

            await fetchChatHistory(sessionId);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { sender: 'bot', text: err.message }]);
            scrollToBottom();
        }
    };

    const sendMessage = async content => {
        if (!sessionId) {
            // Create session dynamically
            try {
                const res = await fetch('http://127.0.0.1:8000/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id }),
                });
                const data = await res.json();
                localStorage.setItem('session_id', data.session_id);
                setSessionId(data.session_id);

                await fetchSessionList();
            } catch (err) {
                console.error('Failed to create session:', err);
                return;
            }
        }

        // If this is a /hint ... command, do not add it as a user message
        if (content.startsWith('/hint ')) {
            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: 'loading' }
            ]);
        } else {
            setMessages(prev => [
                ...prev,
                { sender: 'user', text: content },
                { sender: 'bot', text: 'loading' }
            ]);
        }
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
                    session_id: sessionId ?? +localStorage.getItem('session_id'),
                    content
                }),
                signal: ctrl.signal,
            });
            if (!res.ok) throw new Error();
            const { reply } = await res.json();

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
                setMessages(prev => [...prev, { sender: 'bot', text: '⚠️ AI error: could not respond.' }]);
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleHintClick = () => {
        const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot' && m.text && m.text !== 'loading');
        const isBotOfferingHint = lastBotMessage && (
            lastBotMessage.text.toLowerCase().includes('would you like a hint') ||
            lastBotMessage.text.toLowerCase().includes('do you want a hint') ||
            lastBotMessage.text.toLowerCase().includes('hint')
        );
        if (isBotOfferingHint) {
            // Immediately request a hint for the last failed task
            sendMessage('hint');
        } else {
            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: 'For which task do you want a hint? Please send the FULL task name.' }
            ]);
            setAwaitingHintTask(true);
            scrollToBottom();
        }
    };

    const handleSend = async () => {
        const txt = input.trim();
        if (!txt) return;

        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        if (awaitingHintTask) {
            // User sent the task name for the hint
            setAwaitingHintTask(false);
            setMessages(prev => [
                ...prev,
                { sender: 'user', text: txt }
            ]);
            // Just send the /hint ... to backend, do not add it to messages
            await sendMessage(`/hint ${txt}`);
            return;
        }

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

                    await fetchSessionList();
                }}
                onDeleteChat={async (chatIdToDelete) => {
                    const confirmed = window.confirm("Are you sure you want to delete this chat?");
                    if (!confirmed) return;

                    try {
                        await fetch(`http://127.0.0.1:8000/sessions/${chatIdToDelete}`, { method: 'DELETE' });
                        await fetchSessionList();

                        if (sessionId === chatIdToDelete) {
                            setMessages([]);
                            setSessionId(null);
                            localStorage.removeItem('session_id');
                        }
                    } catch (err) {
                        console.error("Failed to delete chat session:", err);
                    }
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
                        {showHintButton && !isStreaming && (
                            <button className="hint-btn" onClick={handleHintClick}>
                                <img src={hintButtonIcon} alt="Hint" className="chat-icon-button" />
                            </button>
                        )}
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
import './ChatPage.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import newChatIcon from '../assets/new-chat.png';
import greenArrow from '../assets/green-arrow.png';
import profileIconChat from '../assets/profile-icon-chatpage.svg';
import menuIcon from '../assets/menu-icon.png';
import arrowIcon from '../assets/arrow.png';

export default function ChatPage() {
    const [input, setInput] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [chatList, setChatList] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('chatList') || '[]');
        return saved.length ? saved : [{ id: Date.now(), messages: [] }];
    });
    const [activeChatId, setActiveChatId] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('chatList') || '[]');
        return saved.length ? saved[0].id : null;
    });
    const [messages, setMessages] = useState([]);

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

    useEffect(() => {
        const currentChat = chatList.find(chat => chat.id === activeChatId);
        setMessages(currentChat ? currentChat.messages : []);
    }, [activeChatId, chatList]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const updateChatMessages = (updatedMessages) => {
        const updatedChatList = chatList.map(chat =>
            chat.id === activeChatId ? { ...chat, messages: updatedMessages } : chat
        );
        setChatList(updatedChatList);
        localStorage.setItem('chatList', JSON.stringify(updatedChatList));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        updateChatMessages(newMessages);
        setInput('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const payload = { user_id, syllabus_id, content: input };
            const loadingMsg = { sender: 'bot', text: 'loading' };
            const messagesWithLoading = [...newMessages, loadingMsg];
            setMessages(messagesWithLoading);
            updateChatMessages(messagesWithLoading);

            const res = await fetch('http://127.0.0.1:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            const fullText = data.reply;
            let currentText = '';

            for (let i = 0; i < fullText.length; i++) {
                currentText += fullText[i];
                await new Promise(resolve => setTimeout(resolve, 15));
                const updated = [...messagesWithLoading];
                updated[updated.length - 1] = { sender: 'bot', text: currentText };
                setMessages(updated);
                updateChatMessages(updated);
            }

            scrollToBottom();
        } catch (err) {
            console.error('Error in /chat:', err);
            const errorMsg = { sender: 'bot', text: '⚠ AI error: could not respond.' };
            const updated = [...messages, errorMsg];
            setMessages(updated);
            updateChatMessages(updated);
            scrollToBottom();
        }
    };

    const handleNewChat = () => {
        const newChat = { id: Date.now(), messages: [] };
        const updatedList = [...chatList, newChat];
        setChatList(updatedList);
        setActiveChatId(newChat.id);
        setMessages([]);
        localStorage.setItem('chatList', JSON.stringify(updatedList));
    };

    const handleBackClick = () => navigate('/');
    const toggleSidebar = () => setShowMenu(prev => !prev);
    const goToProfile = () => navigate('/profile');

    return (
        <div className={`chat-container ${showMenu ? 'with-sidebar' : ''}`}>
            <div className="confetti-background">
                <div className="confetti"></div>
                <div className="confetti" style={{ top: '22%', left: '60%', width: '80px', transform: 'rotate(125deg)', backgroundColor: '#276D3C' }}></div>
                <div className="confetti rotate"></div>
                <div className="confetti flip"></div>
                <div className="confetti left"></div>
                <div className="confetti buttom"></div>
                <div className="confetti lala"></div>
            </div>


            {showMenu && (
                <div className="chat-sidebar">
                    <div className="sidebar-header">
                        <img src={greenArrow} alt="Back" className="sidebar-back" onClick={() => setShowMenu(false)} />
                        <img src={newChatIcon} alt="New Chat" className="sidebar-new-chat" onClick={handleNewChat} />
                    </div>
                    <div className="chat-list">
                        {chatList.map((chat, index) => (
                            <div
                                key={chat.id}
                                className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
                                onClick={() => setActiveChatId(chat.id)}
                            >
                                Week {index + 1}
                            </div>
                        ))}
                    </div>
                </div>
            )}



            <div className="chat-header">
                <div className={`chat-header-left ${showMenu ? 'hidden' : ''}`}>
                    <img src={arrowIcon} className="chat-back-arrow" onClick={handleBackClick} />
                    <img src={menuIcon} className="chat-menu-icon" onClick={toggleSidebar} />
                </div>

                <div className="chat-header-content">
                    <div className="center-only">StudyBuddy Chat</div>
                </div>

                {/* profile icon */}
                <img
                    src={profileIconChat}
                    className="chat-profile-icon"
                    onClick={goToProfile}
                />
            </div>



            <div className={`chat-main-wrapper ${showMenu ? 'with-sidebar' : ''}`}>

                <div className="confetti-background">
                    <div className="confetti rotate"></div>
                    <div className="confetti flip"></div>
                    <div className="confetti left"></div>
                    <div className="confetti buttom"></div>
                    <div className="confetti lala"></div>
                </div>

                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <h1>Hello!</h1>
                        <p>I am here to help you</p>
                    </div>
                ) : (


                    <div className="chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                                {msg.sender === 'bot'
                                    ? (msg.text === 'loading'
                                        ? <span className="loading-placeholder">Loading...</span>
                                        : <ReactMarkdown>{msg.text}</ReactMarkdown>)
                                    : msg.text}
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
                    />
                    <button onClick={handleSend} className="input-send-button" aria-label="Send">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

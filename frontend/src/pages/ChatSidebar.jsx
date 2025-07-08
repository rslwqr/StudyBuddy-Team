import './ChatSidebar.css';
import chatMenuIcon from '../assets/chat-menu-icon.svg';
import newChatIcon from '../assets/new-chat-icon.svg';

export default function ChatSidebar({
                                        chatSessions,
                                        activeSessionId,
                                        onSelectSession,
                                        onNewChat,
                                        isSidebarOpen,
                                        onCloseSidebar,
                                    }) {
    if (!isSidebarOpen) return null;

    return (
        <aside className="chat-sidebar">
            <div className="sidebar-icons sticky-icons">
                <img
                    src={chatMenuIcon}
                    alt="Menu"
                    className="top-icon"
                    onClick={onCloseSidebar}
                />
                <img
                    src={newChatIcon}
                    alt="New Chat"
                    className="top-icon"
                    onClick={onNewChat}
                />
            </div>

            <div className="chat-list-container">
                <div className="chat-list">
                    {chatSessions.map(session => (
                        <div
                            key={session.session_id}
                            className={`chat-item ${session.session_id === activeSessionId ? 'active' : ''}`}
                            onClick={() => onSelectSession(session.session_id)}
                        >
                            <div className="chat-title">{session.name}</div>
                            <div className="chat-subtitle">
                                {session.messages?.[0]?.text?.slice(0, 30) || 'No messages'}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="chat-footer">AI-powered Python tutor</div>
            </div>
        </aside>
    );
}

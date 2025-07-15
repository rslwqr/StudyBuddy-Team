// src/components/TopBar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './TopBar.css';
import logo from '../assets/logo.svg';
import chatMenuIcon from '../assets/chat-menu-icon.svg';
import newChatIcon from '../assets/new-chat-icon.svg';

export function TopBar({ onLogout, forceShowLogout = false, isSidebarOpen, onMenuClick, onNewChat }) {
    const navigate   = useNavigate();
    const location   = useLocation();
    const isLoggedIn = Boolean(localStorage.getItem('user_id'));
    const isChatPage = location.pathname === '/chat';

    const showLogout = forceShowLogout || isLoggedIn || typeof onLogout === 'function';
    const defaultLogout = () => {
        localStorage.clear();
        navigate('/');
        window.location.reload();
    };
    const handleLogout = onLogout || defaultLogout;

    const privateLinks = [
        { to: '/',         label: 'Main Page'    },
        { to: '/syllabus', label: 'Syllabus'     },
        { to: '/profile',  label: 'Profile'      },
        { to: '/custom',   label: 'Custom Level' },
    ];

    const chatLink = { to: '/chat', label: 'Chat' };

    const isActive = (to) =>
        location.pathname === to ||
        (to !== '/' && location.pathname.startsWith(to));

    return (
        <header className="top-bar">
            <div className="top-bar-left">
                {isChatPage ? (
                    !isSidebarOpen && (
                        <>
                            <img
                                src={chatMenuIcon}
                                alt="Chat Menu"
                                className="top-icon"
                                onClick={onMenuClick}
                            />
                            <img
                                src={newChatIcon}
                                alt="New Chat"
                                className="top-icon"
                                onClick={onNewChat}
                            />
                        </>
                    )
                ) : (
                    <img
                        src={logo}
                        alt="StudyBuddy Logo"
                        className="logo"
                    />
                )}
            </div>

            <nav className="nav-links">
                {isLoggedIn && privateLinks.map(({ to, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className={isActive(to) ? 'active' : ''}
                    >
                        {label}
                    </Link>
                ))}
                {isLoggedIn && (
                    <Link
                        to={chatLink.to}
                        className={isActive(chatLink.to) ? 'active' : ''}
                    >
                        {chatLink.label}
                    </Link>
                )}
            </nav>

            <div className="top-bar-right">
                {isChatPage ? (
                    <img src={logo} alt="StudyBuddy Logo" className="logo" />
                ) : (
                    showLogout && isLoggedIn ? (
                        <button className="logout-btn" onClick={handleLogout}>
                            Log Out
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="login-btn">Log In</Link>
                            <Link to="/signup" className="signup-btn">Sign Up</Link>
                        </>
                    )
                )}
            </div>
        </header>
    );
}

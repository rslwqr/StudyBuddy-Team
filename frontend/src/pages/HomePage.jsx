import { Link, useNavigate } from 'react-router-dom'
import './HomePage.css'
import logo from '../assets/logo.svg'
import robot from '../assets/robot.png'
import profileIcon from '../assets/profile_icon.svg' // добавь в папку assets


export default function HomePage({ onLoginClick, onRegisterClick }) {
    const navigate = useNavigate()
    const isLoggedIn = localStorage.getItem('user_id')
    const syllabusUploaded = localStorage.getItem('syllabus_uploaded')

    const handleChatAccess = () => {
        if (!isLoggedIn) {
            alert('Please register or log in to access the chat.')
            return
        }
        if (!syllabusUploaded) {
            alert('Please upload your syllabus before using the chat.')
            return
        }
        navigate('/chat')
    }

    return (
        <div className="page">
            <header className="top-bar">
                <Link to="/">
                    <img src={logo} alt="StudyBuddy Logo" className="logo" />
                </Link>

                <div className="top-bar-right">
                    {!isLoggedIn ? (
                        <>
                            <button className="btn login-btn" onClick={onLoginClick}>
                                Log In
                            </button>
                            <button className="btn signup-btn" onClick={onRegisterClick}>
                                Sign Up
                            </button>
                        </>
                    ) : (
                        <Link to="/profile">
                            <img src={profileIcon} alt="Profile" className="profile-icon" />                        </Link>
                    )}
                </div>
            </header>

            <main className="main-content">
                <div className="text-block">
                    <h1>StudyBuddy</h1>
                    <h2>– Your Personal Assignment Assistant</h2>
                    <p>
                        Smart practice assistant for Python based on university syllabus
                    </p>

                    <div className="button-group">
                        <button className="start" onClick={handleChatAccess}>
                            Get Started
                        </button>
                        {isLoggedIn ? (
                            <Link to="/syllabus">
                                <button className="outline">Syllabus</button>
                            </Link>
                        ) : (
                            <button
                                className="outline"
                                onClick={() => alert('Please register or log in to access your syllabus.')}
                            >
                                Syllabus
                            </button>
                        )}
                    </div>
                </div>

                <img src={robot} alt="StudyBuddy Robot" className="robot-img" />
            </main>
        </div>
    )
}
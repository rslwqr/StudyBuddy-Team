import { Link, useNavigate } from 'react-router-dom' // ✅ добавили useNavigate
import './HomePage.css'
import logo from '../assets/logo.svg'
import robot from '../assets/robot.png'

export default function HomePage({ onRegisterClick }) {
    const navigate = useNavigate() // ✅ создать навигатор

    return (
        <div className="page">
            <header className="top-bar">
                <img src={logo} alt="StudyBuddy Logo" className="logo" />
                <div className="top-bar-right">
                    {!localStorage.getItem('user_id') ? (
                        <button className="register-link" onClick={onRegisterClick}>
                            Register
                        </button>
                    ) : (
                        <Link to="/profile">
                            <img src="/profile-icon.png" alt="Profile" className="profile-icon" />
                        </Link>
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
                        {/* ✅ добавили переход */}
                        <button className="start" onClick={() => navigate('/chat')}>
                            Get Started
                        </button>
                        <Link to="/syllabus">
                            <button className="outline">Syllabus</button>
                        </Link>
                    </div>
                </div>
                <img src={robot} alt="StudyBuddy Robot" className="robot-img" />
            </main>
        </div>
    )
}

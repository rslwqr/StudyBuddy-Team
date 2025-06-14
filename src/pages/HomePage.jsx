// src/pages/HomePage.jsx
import { Link } from 'react-router-dom'
import './HomePage.css'
import logo from '../assets/logo.svg'
import robot from '../assets/robot.png'

export default function HomePage({ onGetStarted }) {
    return (
        <div className="page">
            <header className="top-bar">
                <img src={logo} alt="StudyBuddy Logo" className="logo" />
            </header>

            <main className="main-content">
                <div className="text-block">
                    <h1>StudyBuddy</h1>
                    <h2>– Your Personal Assignment Assistant</h2>
                    <p>
                        Smart practice assistant for Python based on university syllabus
                    </p>

                    <div className="button-group">
                        <button className="start" onClick={onGetStarted}>
                            Get Started
                        </button>
                        <Link to="/syllabus">
                            <button className="outline">See Syllabus</button>
                        </Link>
                    </div>
                </div>
                <img src={robot} alt="StudyBuddy Robot" className="robot-img" />
            </main>
        </div>
    )
}

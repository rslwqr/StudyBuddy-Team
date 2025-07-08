import { Link, useNavigate } from 'react-router-dom'
import './HomePage.css'
import robot from '../assets/robot.png'
import rocket from '../assets/rocket.png';
import { TopBar } from './TopBar'

export default function HomePage() {
    const navigate = useNavigate()
    const isLoggedIn = !!localStorage.getItem('user_id')

    const handleLogout = () => {
        localStorage.clear()
        navigate('/')
        window.location.reload()
    }

    return (
        <div className="page">
            <TopBar onLogout={handleLogout} />

            <main className="main-content">
                {/* Hero Section */}
                <section className="hero-section">
                    <div className="text-block">
                        <h1>StudyBuddy</h1>
                        <h2>– Your Personal Assignment Assistant</h2>
                        <p>
                            Smart practice assistant for Python based on university syllabus. <br />
                            Get personalized assignments, AI-powered assistance, and track your progress as you become a Python programmer.
                        </p>
                        <div className="button-group">
                            <Link to="/chat" className="btn start">Visit Chat</Link>
                            <Link to={isLoggedIn ? "/syllabus" : "#"} className="btn outline">See Syllabus</Link>
                        </div>
                    </div>
                    <img src={robot} alt="StudyBuddy Robot" className="robot-img" />
                </section>

                {/* Why Choose Section */}
                <section className="features-section">
                    <h3>Why Choose StudyBuddy?</h3>
                    <p>Everything you need to improve study programming skills in one intelligent platform</p>
                    <div className="features">
                        <div className="feature-box blue">
                            <div className="feature-icon"></div>
                            <h4>Smart Notifications</h4>
                            <p>Get timely reminders for assignments, deadlines, and learning milestones</p>
                        </div>

                        <div className="feature-box green">
                            <div className="feature-icon"></div>
                            <h4>AI Assistant</h4>
                            <p>Get instant help and feedback from our intelligent tutoring system</p>
                        </div>

                        <div className="feature-box pink">
                            <div className="feature-icon"></div>
                            <h4>Progress Tracking</h4>
                            <p>Monitor your learning journey with detailed analytics and achievement milestones</p>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="steps-section">
                    <h3>How StudyBuddy Works</h3>
                    <p>Simple steps to transform your Python learning experience</p>
                    <div className="steps-icons">
                        <div className="step-item">
                            <div className="step-circle green">1</div>
                            <h4>Upload Syllabus</h4>
                            <p>Share your university syllabus with StudyBuddy</p>
                        </div>
                        <div className="step-item">
                            <div className="step-circle orange">2</div>
                            <h4>Get Custom Plan</h4>
                            <p>Receive a personalized learning path tailored to your course goals</p>
                        </div>
                        <div className="step-item">
                            <div className="step-circle blue">3</div>
                            <h4>Practice & Learn</h4>
                            <p>Work through assignments with AI guidance and instant feedback</p>
                        </div>
                        <div className="step-item">
                            <div className="step-circle purple">4</div>
                            <h4>Track Progress</h4>
                            <p>Monitor your improvement and achieve your academic goals</p>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <img src={rocket} alt="Rocket Icon" className="rocket-icon" />

                    <h3>Ready To Practice?</h3>
                    <p>
                        Join students who are already mastering Python with StudyBuddy's personalized learning approach.
                        <br />Start your journey today!
                    </p>
                    <div className="cta-buttons">
                        <Link to="/signup" className="cta-btn start">Start Learning Today</Link>
                        <Link to="/login" className="cta-btn outline">Already Have An Account?</Link>
                    </div>
                </section>

            </main>
        </div>
    )
}

import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import {SyllabusPage} from './pages/SyllabusPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import { LevelPage } from './pages/LevelPage';

// внутри <Routes>



import './App.css'

export default function App() {
    const [showSignup, setShowSignup] = useState(false)
    const [showLogin, setShowLogin] = useState(false)

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <HomePage
                            onRegisterClick={() => setShowSignup(true)}
                            onLoginClick={() => setShowLogin(true)}
                        />
                    }
                />
                <Route path="/syllabus" element={<SyllabusPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/custom" element={<LevelPage />} />
            </Routes>

            {showSignup && (
                <div className="modal-overlay" onClick={() => setShowSignup(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <SignupPage onClose={() => setShowSignup(false)} />
                    </div>
                </div>
            )}


            {showLogin && (
                <div className="modal-overlay" onClick={() => setShowLogin(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <LoginPage onClose={() => setShowLogin(false)} />
                    </div>
                </div>
            )}
        </BrowserRouter>
    )
}
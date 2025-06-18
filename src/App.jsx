import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import SyllabusPage from './pages/SyllabusPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage' // ✅ добавили

import './App.css'

export default function App() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            <HomePage onRegisterClick={() => setIsRegisterOpen(true)} />
                            {isRegisterOpen && (
                                <div
                                    className="modal-overlay"
                                    onClick={() => setIsRegisterOpen(false)}
                                >
                                    <div
                                        className="modal-content"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            className="modal-close"
                                            onClick={() => setIsRegisterOpen(false)}
                                        >
                                            ×
                                        </button>
                                        <RegisterPage />
                                    </div>
                                </div>
                            )}
                        </>
                    }
                />
                <Route path="/syllabus" element={<SyllabusPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chat" element={<ChatPage />} /> {/* ✅ новый маршрут */}
            </Routes>
        </BrowserRouter>
    )
}

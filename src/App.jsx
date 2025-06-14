// src/App.jsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import SyllabusPage from './pages/SyllabusPage'
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
                            <HomePage onGetStarted={() => setIsRegisterOpen(true)} />
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
                +       <Route path="/syllabus" element={<SyllabusPage />} />
            </Routes>
            +   </BrowserRouter>
    )
}

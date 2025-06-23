import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './SyllabusPage.css'
import logo from '../assets/logo.svg'
import chatIcon from '../assets/chat_icon.svg' // добавь в папку assets
import profileIcon from '../assets/profile_icon.svg' // добавь в папку assets

export default function SyllabusPage() {
    const [pdfUrl, setPdfUrl] = useState(null)
    const [status, setStatus] = useState('')
    const fileInputRef = useRef()
    const navigate = useNavigate()
    const userId = localStorage.getItem('user_id')

    useEffect(() => {
        const fetchSyllabus = async () => {
            try {
                const res = await fetch(`studybuddy-team-production.up.railway.app/download_syllabus?user_id=${userId}`)
                if (!res.ok) {
                    setStatus('No syllabus uploaded yet.')
                    localStorage.removeItem('syllabus_uploaded')
                    return
                }
                const blob = await res.blob()
                setPdfUrl(URL.createObjectURL(blob))
                setStatus('')
                localStorage.setItem('syllabus_uploaded', 'true')
            } catch {
                setStatus('Failed to load syllabus')
            }
        }

        if (userId) {
            fetchSyllabus()
        }
    }, [userId])

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // 👇 Сброс input — даже если выбирается тот же файл
        e.target.value = null

        const form = new FormData()
        form.append('file', file)

        try {
            const res = await fetch(`studybuddy-team-production.up.railway.app/upload_syllabus?user_id=${userId}`, {
                method: 'POST',
                body: form,
            })

            if (!res.ok) throw new Error()

            const data = await res.json()
            const syllabusId = data.syllabus_id
            localStorage.setItem('syllabus_id', syllabusId)

            const blob = new Blob([file], { type: 'application/pdf' })
            setPdfUrl(URL.createObjectURL(blob))
            setStatus('Syllabus uploaded successfully')
            localStorage.setItem('syllabus_uploaded', 'true')
        } catch {
            setStatus('Upload failed')
        }
    }

    const handleRemove = async () => {
        try {
            const res = await fetch(`studybuddy-team-production.up.railway.app/syllabus?user_id=${userId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error()

            setPdfUrl(null)
            setStatus('Syllabus removed')
            localStorage.removeItem('syllabus_uploaded')

            // 👇 Сброс input вручную
            if (fileInputRef.current) {
                fileInputRef.current.value = null
            }
        } catch {
            setStatus('Failed to remove syllabus')
        }
    }

    return (
        <div className="page syllabus-page">
            <header className="top-bar">
                <div className="left-header" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src={logo} alt="StudyBuddy Logo" className="logo" />
                </div>

                <h1 className="header-center-title">Syllabus</h1>

                <div className="right-header">
                    <img
                        src={chatIcon}
                        alt="Chat"
                        className="icon-btn"
                        onClick={() => navigate('/chat')}
                    />
                    <img
                        src={profileIcon}
                        alt="Profile"
                        className="icon-btn"
                        onClick={() => navigate('/profile')}
                    />
                </div>
            </header>

            <div className="pdf-controls">
                <button className="upload" onClick={() => fileInputRef.current.click()}>
                    Upload
                </button>

                {pdfUrl && (
                    <button className="remove" onClick={handleRemove}>
                        Remove
                    </button>
                )}

                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                />
            </div>

            <div className="pdf-container">
                {pdfUrl ? (
                    <embed src={pdfUrl} type="application/pdf" className="pdf-viewer" />
                ) : (
                    <div className="pdf-placeholder">
                        Your syllabus will appear here after upload.
                    </div>
                )}
            </div>

            {/* 👇 Вот этот блок добавлен */}
            <div className="syllabus-nav-links">
                <span className="nav-link" onClick={() => navigate('/')}>← Back to Home</span>
                <span className="nav-link" onClick={() => navigate('/chat')}>Go to Chat →</span>
            </div>
        </div>
    )
}

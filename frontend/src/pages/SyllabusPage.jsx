import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './SyllabusPage.css'
import logo from '../assets/logo.svg'
import chatIcon from '../assets/chat_icon.svg'
import profileIcon from '../assets/profile_icon.svg'

export function SyllabusPage() {
    const [pdfUrl, setPdfUrl] = useState(null)
    const [, setStatus] = useState('')
    const fileInputRef = useRef()
    const navigate = useNavigate()
    const userId = localStorage.getItem('user_id')

    useEffect(() => {
        const fetchSyllabus = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/download_syllabus?user_id=${userId}`)
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

        e.target.value = null

        const form = new FormData()
        form.append('file', file)

        try {
            const res = await fetch(`http://127.0.0.1:8000/upload_syllabus?user_id=${userId}`, {
                method: 'POST',
                body: form,
            })

            if (!res.ok) throw new Error()

            const data = await res.json()
            const syllabusId = data.syllabus_id
            localStorage.setItem('syllabus_id', syllabusId)

            const blob = new Blob([file], {type: 'application/pdf'})
            setPdfUrl(URL.createObjectURL(blob))
            setStatus('Syllabus uploaded successfully')
            localStorage.setItem('syllabus_uploaded', 'true')

            navigate('/chat')

        } catch (error) {
            console.error('Upload error:', error)
            setStatus('Upload failed')
        }
    }

    const handleRemove = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/syllabus?user_id=${userId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error()

            setPdfUrl(null)
            setStatus('Syllabus removed')
            localStorage.removeItem('syllabus_uploaded')
            localStorage.removeItem('syllabus_id')

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
                <div className="left-header" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
                    <img src={logo} alt="StudyBuddy Logo" className="logo"/>
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
                    style={{display: 'none'}}
                    ref={fileInputRef}
                />
            </div>

            <div className="pdf-container">
                {pdfUrl ? (
                    <embed src={pdfUrl} type="application/pdf" className="pdf-viewer"/>
                ) : (
                    <div className="pdf-placeholder">
                        Your syllabus will appear here after upload.
                    </div>
                )}
            </div>
            <div className="syllabus-footer-buttons">
                <button className="syllabus-nav-button left" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
                <button className="syllabus-nav-button right" onClick={() => navigate('/chat')}>
                    Go to Chat →
                </button>
            </div>

        </div>
    )
}

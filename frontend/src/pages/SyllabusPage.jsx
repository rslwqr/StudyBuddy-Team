import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './SyllabusPage.css'
import logo from '../assets/logo.svg'


export default function SyllabusPage() {
    const [pdfUrl, setPdfUrl] = useState(null)
    const [status, setStatus] = useState('')
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
            const res = await fetch(`http://127.0.0.1:8000/syllabus?user_id=${userId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error()
            setPdfUrl(null)
            setStatus('Syllabus removed')
        } catch {
            setStatus('Failed to remove syllabus')
        }
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate('/')
    }

    return (
        <div className="page syllabus-page">
            <header className="top-bar">
                <Link to="/">
                    <img src={logo} alt="StudyBuddy Logo" className="logo" />
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/profile">
                        <img src="/profile-icon.png" alt="Profile" className="avatar" style={{ cursor: 'pointer' }} />
                    </Link>
                    <button onClick={handleLogout} className="logout-button">Log out</button>
                </div>

            </header>

            <h1 className="syllabus-title">Syllabus</h1>

            <div className="pdf-controls">
                <button className="upload" onClick={() => fileInputRef.current.click()}>
                    Upload
                </button>
                <button className="remove" onClick={handleRemove}>
                    Remove
                </button>
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
                    <embed src={pdfUrl} type="application/pdf" width="100%" height="100%" />
                ) : (
                    <p className="status">{status}</p>
                )}
            </div>

            <div className="bottom-links" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                <Link to="/" style={{ color: 'green', textDecoration: 'none' }}>← Back to Home</Link>
                <Link to="/chat" style={{ color: 'green', textDecoration: 'none' }}>→ Go to the Chat</Link>
            </div>
        </div>
    )
}

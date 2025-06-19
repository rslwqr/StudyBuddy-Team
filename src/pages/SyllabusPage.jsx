import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './SyllabusPage.css'
import logo from '../assets/logo.svg'
import profileIcon from '../assets/profile_icon.svg'

export default function SyllabusPage() {
    const [pdfUrl, setPdfUrl] = useState(null)
    const [status, setStatus] = useState('')
    const fileInputRef = useRef()
    const navigate = useNavigate()
    const userId = localStorage.getItem('user_id')

    // Загрузка силлабуса
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

                // ✅ Сохраняем флаг, если файл успешно загрузился
                localStorage.setItem('syllabus_uploaded', 'true')
            } catch {
                setStatus('Failed to load syllabus')
            }
        }

        if (userId) {
            fetchSyllabus()
        }
    }, [userId])

    // Загрузка PDF
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
            localStorage.setItem('syllabus_id', syllabusId)  // ⬅️ ВАЖНО!!!

            const blob = new Blob([file], { type: 'application/pdf' })
            setPdfUrl(URL.createObjectURL(blob))
            setStatus('Syllabus uploaded successfully')
            localStorage.setItem('syllabus_uploaded', 'true')
        } catch {
            setStatus('Upload failed')
        }
    }
    // Удаление PDF
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
                <img src={logo} alt="StudyBuddy Logo" className="logo" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={profileIcon} alt="Profile" className="avatar" />
                    <button onClick={handleLogout} className="logout-button">Logout</button>
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

            <div className="back-link">
                <Link to="/">← Back to Home</Link>
            </div>
        </div>
    )
}

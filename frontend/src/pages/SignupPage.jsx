// ✅ SignupPage.jsx (popup версия)
import { useState } from 'react'
import './SignupPage.css'

export default function SignupPage({ onClose }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    function isInnopolisEmail(value) {
        return /^[^\s@]+@innopolis\.university$/.test(value)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            return alert('Please enter your name')
        }

        if (!isInnopolisEmail(email)) {
            return alert('Email must end with @innopolis.university')
        }

        try {
            const res = await fetch('https://studybuddy-team-production.up.railway.app/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            })

            if (res.status === 409) {
                const { detail } = await res.json()
                return alert(detail)
            }

            if (res.ok) {
                const data = await res.json()
                localStorage.setItem('user_id', data.user_id)
                localStorage.setItem('user_name', name)
                localStorage.setItem('user_email', email)
                alert('Registration successful!')
                onClose?.()
            } else {
                alert('Server error during registration')
            }
        } catch {
            alert('Cannot connect to server')
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <form className="register-form" onSubmit={handleSubmit} noValidate>
                    <label>
                        Name:
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            placeholder="Ivan Ivanov"
                        />
                    </label>
                    <label>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="user@innopolis.university"
                            pattern="^[^\s@]+@innopolis\.university$"
                        />
                    </label>
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </div>
    )
}

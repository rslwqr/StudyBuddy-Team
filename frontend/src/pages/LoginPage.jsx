import { useState } from 'react'
import './LoginPage.css'

export default function LoginPage({ onClose }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()

        if (!email.trim() || !password.trim()) {
            return alert('Please fill in all fields.')
        }

        try {
            const res = await fetch('studybuddy-team-production.up.railway.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            if (res.ok) {
                const data = await res.json()
                localStorage.setItem('user_id', data.user_id)
                localStorage.setItem('user_email', email)
                alert('Login successful!')
                onClose?.()
            } else {
                alert('Login failed. Please check your credentials.')
            }
        } catch {
            alert('Cannot connect to server')
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <form className="login-form" onSubmit={handleLogin}>
                    <label>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="user@innopolis.university"
                        />
                    </label>
                    <label>
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="Your password"
                        />
                    </label>
                    <button type="submit">Log In</button>
                </form>
            </div>
        </div>
    )
}

import { useState } from 'react'
import './SignupPage.css'
import { useNavigate } from 'react-router-dom'

import openEye from '../assets/open-eye-icon.svg'
import closedEye from '../assets/closed-eye-icon.svg'

export default function SignupPage() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const isInnopolisEmail = (value) => /^[^\s@]+@innopolis\.university$/.test(value)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) return alert('Please enter your name')
        if (!isInnopolisEmail(email)) return alert('Email must end with @innopolis.university')
        if (password.length < 8) return alert('Password must be at least 8 characters')
        if (password !== confirmPassword) return alert('Passwords do not match')

        try {
            const res = await fetch('http://127.0.0.1:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
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
                navigate('/')
            } else {
                alert('Server error during registration')
            }
        } catch {
            alert('Cannot connect to server')
        }
    }

    return (
        <div className="signup-page">
            <div className="signup-form-container">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h2>Create Account</h2>
                <p className="subtitle">Join StudyBuddy And Start Your Python Practice</p>

                <form className="signup-form" onSubmit={handleSubmit}>
                    <div className="signup-field-group">
                        <label className="signup-label" htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Name Surname"
                            required
                        />
                    </div>

                    <div className="signup-field-group">
                        <label className="signup-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="n.surname@innopolis.university"
                            required
                        />
                    </div>

                    <div className="signup-field-group">
                        <label className="signup-label" htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <img
                                src={showPassword ? openEye : closedEye}
                                alt="Toggle password"
                                className="eye-icon"
                                onClick={() => setShowPassword(!showPassword)}
                            />
                        </div>
                    </div>

                    <div className="signup-field-group">
                        <label className="signup-label" htmlFor="confirm-password">Confirm Password</label>
                        <div className="password-wrapper">
                            <input
                                id="confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <img
                                src={showConfirmPassword ? openEye : closedEye}
                                alt="Toggle confirm password"
                                className="eye-icon"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            />
                        </div>
                    </div>

                    <button type="submit">Register</button>
                </form>
            </div>
        </div>
    )
}
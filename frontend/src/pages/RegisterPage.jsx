// src/pages/RegisterPage.jsx
import { useState } from 'react'
import './RegisterPage.css'

function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    // Проверка домена Innopolis
    function isInnopolisEmail(value) {
        return /^[^\s@]+@innopolis\.university$/.test(value)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 1) Проверяем, что name не пустое
        if (!name.trim()) {
            return alert('Please enter your name')
        }

        // 2) Проверка домена
        if (!isInnopolisEmail(email)) {
            return alert('Email must end with @innopolis.university')
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            })

            if (res.status === 409) {
                const { detail } = await res.json()
                return alert(detail) // “User with this email already exists”
            }

            if (res.ok) {
                const data = await res.json()
                localStorage.setItem('user_id', data.user_id) // 💾 сохраняем
                alert('Registration successful!')
            } else {
                alert('Server error during registration')
            }

        } catch {
            alert('Cannot connect to server')
        }
    }

    return (
        <form className="register-form" onSubmit={handleSubmit} noValidate>
            <label>
                Name:
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Ivan Ivanov"
                    onInput={e => e.currentTarget.setCustomValidity('')}
                    onInvalid={e => {
                        if (e.currentTarget.validity.valueMissing) {
                            e.currentTarget.setCustomValidity('Please enter your name')
                        }
                    }}
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
                    onInput={e => e.currentTarget.setCustomValidity('')}
                    onInvalid={e => {
                        const el = e.currentTarget
                        if (el.validity.valueMissing) {
                            el.setCustomValidity('Please enter your email')
                        } else if (el.validity.typeMismatch) {
                            el.setCustomValidity('Please enter a valid email')
                        } else if (el.validity.patternMismatch) {
                            el.setCustomValidity('Email must end with @innopolis.university')
                        }
                    }}
                />
            </label>

            <button type="submit">Register</button>
        </form>
    )
}

export default RegisterPage

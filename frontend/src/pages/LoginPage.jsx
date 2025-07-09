import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

import openEye from '../assets/open-eye-icon.svg';
import closedEye from '../assets/closed-eye-icon.svg';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async e => {
        e.preventDefault();

        try {
            const res = await fetch('http://127.0.0.1:8000/login_with_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                alert(errorData.detail || 'Login failed');
                return;
            }

            const data = await res.json();
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_name', data.user_name);
            localStorage.setItem('user_email', data.user_email);
            if (data.syllabus_id) {
                localStorage.setItem('syllabus_id', data.syllabus_id);
            } else {
                localStorage.removeItem('syllabus_id');
            }
            if (data.session_id) {
                localStorage.setItem('session_id', data.session_id);
            }
            navigate('/');
        } catch (err) {
            console.error('Network error:', err);
            alert('Network error, please try again later.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <h1 className="login-heading">Welcome Back</h1>
                <p className="login-subheading">
                    Log In To Continue Your Python Learning
                </p>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field-group">
                        <label className="login-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="login-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="n.surname@innopolis.university"
                            required
                        />
                    </div>

                    <div className="login-field-group">
                        <label className="login-label" htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="login-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <img
                                src={showPassword ? openEye : closedEye}
                                alt="Toggle password visibility"
                                className="eye-icon"
                                onClick={() => setShowPassword(!showPassword)}
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-button">
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
}
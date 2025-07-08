import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ProfilePage.css';
import { TopBar } from './TopBar';

export default function ProfilePage() {
    const initialName = localStorage.getItem('user_name') ?? '';
    const initialEmail = localStorage.getItem('user_email') ?? '';
    const userId = localStorage.getItem('user_id');

    const [fullName, setFullName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [emailNotif, setEmailNotif] = useState(false);
    const [weeklyReport, setWeeklyReport] = useState(false);
    const [progress, setProgress] = useState(0);

    // вместо чтения из localStorage — стейт и загрузка уровня с сервера
    const [currentLevel, setCurrentLevel] = useState('Beginner');

    useEffect(() => {
        if (!userId) return;
        axios
            .get(`http://127.0.0.1:8000/profile/${userId}/difficulty`)
            .then(res => {
                if (res.data.difficulty) {
                    setCurrentLevel(res.data.difficulty);
                }
            })
            .catch(err => {
                console.error('Не удалось загрузить уровень:', err);
                setCurrentLevel('Beginner');
            });
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        axios
            .get(`http://127.0.0.1:8000/user_progress/${userId}`)
            .then(res => setProgress(res.data.progress_percentage))
            .catch(err => console.error('Error fetching user progress:', err));
    }, [userId]);

    const getLevelColor = level => {
        switch (level) {
            case 'Beginner':    return '#dceccf';
            case 'Intermediate':return '#f6ddc7';
            case 'Advanced':    return '#f1a989';
            default:            return '#e0e0e0';
        }
    };

    const handleSave = () => {
        console.log({ fullName, email, emailNotif, weeklyReport });
        alert('Settings saved!');
    };

    const handleReset = () => {
        setFullName(initialName);
        setEmail(initialEmail);
        setEmailNotif(false);
        setWeeklyReport(false);
    };

    return (
        <>
            <TopBar forceShowLogout />
            <div className="profile-page-container">
                <div className="profile-page-card">
                    <div className="profile-header">
                        <Link to="/chat" className="back-link">← Back to Chat</Link>
                    </div>

                    <div className="profile-content-grid">
                        <div className="profile-left">
                            <h3 className="section-title">Personal Information</h3>
                            <label className="input-label">
                                Full Name
                                <input
                                    type="text"
                                    className="text-input"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    readOnly
                                />
                            </label>
                            <label className="input-label">
                                Email
                                <input
                                    type="email"
                                    className="text-input"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    readOnly
                                />
                            </label>

                            <h3 className="section-title">Notification Settings</h3>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Email Notifications</div>
                                    <div className="toggle-desc">Receive Assignment Reminders Every Week</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={emailNotif}
                                        onChange={() => setEmailNotif(!emailNotif)}
                                    />
                                    <span className="slider" />
                                </label>
                            </div>

                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Weekly Progress Reports</div>
                                    <div className="toggle-desc">Summary Of Your Learning Activity</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={weeklyReport}
                                        onChange={() => setWeeklyReport(!weeklyReport)}
                                    />
                                    <span className="slider" />
                                </label>
                            </div>

                            <div className="buttons-row">
                                <button className="btn save-btn" onClick={handleSave}>Save Changes</button>
                                <button className="btn reset-btn" onClick={handleReset}>Reset Settings</button>
                            </div>
                        </div>

                        <div className="profile-right">
                            <h3 className="section-title">Learning Progress</h3>
                            <div className="progress-label">
                                Overall Progress<span className="progress-percent">{progress}%</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: '${progress}%' }}
                                />
                            </div>
                            <div
                                className="current-level-box"
                                style={{ backgroundColor: getLevelColor(currentLevel) }}
                            >
                                Current Level: <strong>{currentLevel}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
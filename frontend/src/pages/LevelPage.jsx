import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from './TopBar';
import './LevelPage.css';

export function LevelPage() {
    const userId = localStorage.getItem('user_id');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [loading, setLoading] = useState(false);

    // определения уровней с правильными метками
    const levels = [
        {
            key: 'Beginner',
            description: 'Suitable for users who are just starting to study the subject. The bot gives you simple tasks.',
            color: '#dceccf'
        },
        {
            key: 'Intermediate',
            description: 'For students with a basic understanding of the topic. The bot offers standard tasks, a little more complicated.',
            color: '#f6ddc7'
        },
        {
            key: 'Advanced',
            description: 'For confident users who want to delve into the topic. The bot generates more complex tasks.',
            color: '#f1a989'
        },
    ];

    // 1) при монтировании подгружаем текущий уровень
    useEffect(() => {
        if (!userId) return;
        fetch(`http://127.0.0.1:8000/profile/${userId}/difficulty`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                if (data.difficulty) setSelectedLevel(data.difficulty);
            })
            .catch(() => {
                // на ошибку оставляем Beginner
                setSelectedLevel('Beginner');
            });
    }, [userId]);

    const handleSelect = (levelKey) => {
        setSelectedLevel(levelKey);
    };

    // 2) при сохранении шлём POST с правильным полем "difficulty"
    const handleSave = () => {
        if (!userId || !selectedLevel) return;
        setLoading(true);

        fetch(`http://127.0.0.1:8000/profile/${userId}/difficulty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty: selectedLevel })
        })
            .then(res => {
                setLoading(false);
                if (!res.ok) throw new Error('Save failed');
                return res.json();
            })
            .then(() => {
                alert(`Level "${selectedLevel}" saved!`);
                localStorage.setItem('user_level', selectedLevel);
            })
            .catch(err => {
                setLoading(false);
                console.error(err);
                alert('Could not save level, please try again.');
            });
    };

    return (
        <>
            <TopBar forceShowLogout />
            <div className="level-page-container">
                <div className="level-card">
                    <Link to="/chat" className="back-link">← Back to Chat</Link>
                    <h2>Custom Difficulty Level Of Tasks</h2>
                    <p>Choose more suitable level for your skills:</p>

                    <div className="levels-grid">
                        {levels.map(level => (
                            <div
                                key={level.key}
                                className="level-box"
                                style={{ backgroundColor: level.color }}
                            >
                                <div className="level-content">
                                    <h3>{level.key}</h3>
                                    <p>{level.description}</p>
                                </div>
                                <button
                                    className={`set-button ${selectedLevel === level.key ? 'chosen' : ''}`}
                                    onClick={() => handleSelect(level.key)}
                                >
                                    {selectedLevel === level.key ? 'Chosen' : 'Set'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        className="save-button"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </>
    );
}
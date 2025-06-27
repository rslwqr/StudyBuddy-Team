import './ProfilePage.css'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
    const navigate = useNavigate()

    const name = localStorage.getItem('user_name') || 'your name'
    const email = localStorage.getItem('user_email') || 'somebody@innopolis.university'

    function handleLogout() {
        localStorage.clear()
        navigate('/')
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <button className="back-button-profilepage" onClick={() => navigate(-1)}>← Back</button>
                <button className="logout" onClick={handleLogout}>Log out</button>
            </header>

            <div className="profile-content">
                <img
                    src="/profile-icon.png"
                    alt="Profile Avatar"
                    className="profile-avatar"
                />
                <h2><span className="green">YOUR</span> PROFILE</h2>
                <p>name: {name}</p>
                <p>email: {email}</p>
            </div>
        </div>
    )
}

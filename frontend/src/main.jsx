import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'      // <-- импортируем App вместо маршрутов
import './index.css'             // если у вас есть глобальные стили

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

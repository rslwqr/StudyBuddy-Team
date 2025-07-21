import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SyllabusPage.css';
import { TopBar } from './TopBar';

export function SyllabusPage() {
    const [pdfUploaded, setPdfUploaded] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const fileInputRef = useRef();
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        const fetchSyllabus = async () => {
            try {
                const res = await fetch(`https://studybuddy-team-production.up.railway.app/download_syllabus?user_id=${userId}`);
                if (res.ok) {
                    setPdfUploaded(true);
                    setUploadedFileName('Name_of_syllabus_file.pdf'); // можно заменить на имя из API
                } else {
                    setPdfUploaded(false);
                }
            } catch {
                setPdfUploaded(false);
            }
        };

        if (userId) {
            fetchSyllabus();
        }
    }, [userId]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = null;

        const form = new FormData();
        form.append('file', file);

        try {
            const res = await fetch(`https://studybuddy-team-production.up.railway.app/upload_syllabus?user_id=${userId}`, {
                method: 'POST',
                body: form,
            });

            if (res.ok) {
                const {syllabus_id} = await res.json();
                localStorage.setItem('syllabus_id', syllabus_id);
                setPdfUploaded(true);
                setUploadedFileName(file.name);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    const handleRemove = async () => {
        try {
            await fetch(`https://studybuddy-team-production.up.railway.app/syllabus?user_id=${userId}`, {
                method: 'DELETE',
            });
            setPdfUploaded(false);
            setUploadedFileName('');
        } catch (error) {
            console.error('Remove error:', error);
        }
    };

    return (
        <>
            <TopBar forceShowLogout />
            <div className="syllabus-background">
                <div className="syllabus-card">
                    <h2>Syllabus Management</h2>
                    <p>Upload and manage your Python learning curriculum (PDF format)</p>

                    <div
                        className={`upload-box ${pdfUploaded ? 'uploaded' : ''}`}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <div className="upload-icon">📄</div>
                        <h3>{pdfUploaded ? 'Syllabus Is Successfully Uploaded' : 'Upload Syllabus PDF'}</h3>
                        <p className="upload-hint">
                            Drag and drop your syllabus file here, or click to browse
                        </p>
                        <input
                            type="file"
                            accept="application/pdf"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="upload-actions">
                        <button className="btn orange" onClick={() => fileInputRef.current.click()}>
                            {pdfUploaded ? 'Change Syllabus' : 'Upload Syllabus'}
                        </button>
                        {pdfUploaded && (
                            <button className="btn red" onClick={handleRemove}>
                                Remove Syllabus
                            </button>
                        )}
                    </div>

                    {pdfUploaded && (
                        <div className="file-summary">
                            <div><strong>{uploadedFileName}</strong></div>
                            <div className="file-meta">
                                <span>Uploaded on: Jul 2, 2025</span>
                                <span>Size: 0.5 MB</span>
                            </div>
                            <div className="file-status">
                                ✅ Syllabus processed and ready for AI analysis
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

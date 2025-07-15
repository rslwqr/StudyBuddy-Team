import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_reminder_email(to_email: str, username: str, verification_code: str = None):
    if verification_code:
        subject = "Your StudyBuddy Verification Code"
        body = (
            f"Hello, {username}! 👋\n\n"
            f"Here is your verification code for StudyBuddy: {verification_code}\n\n"
            f"If you didn’t request this code, just ignore this email."
        )
    else:
        subject = "Time to practice with StudyBuddy"
        body = (
            f"Hello! 👋\n\n"
            f"Come to StudyBuddy and solve a couple of tasks this week.\n"
            f"Good luck!"
        )

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

    print(f"[{datetime.now()}] Email sent to {to_email}")

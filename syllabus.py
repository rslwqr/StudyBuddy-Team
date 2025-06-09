from PyPDF2 import PdfReader

def load_syllabus(pdf_path: str = "pythonSyllabus.pdf") -> str:
    reader = PdfReader(pdf_path)
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text()
    return full_text

from PyPDF2 import PdfReader
import io

def parse_pdf(contents: bytes) -> str:
    reader = PdfReader(io.BytesIO(contents))
    full_text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            full_text += page_text
    return full_text


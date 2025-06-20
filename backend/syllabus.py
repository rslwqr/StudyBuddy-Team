from PyPDF2 import PdfReader
import io
import re

def parse_pdf(contents: bytes) -> dict:
    reader = PdfReader(io.BytesIO(contents))
    full_text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            full_text += page_text + "\n"

    # Распознавание тем по неделям
    weeks = {}
    for match in re.finditer(r"Week\s*(\d+)\s*[:-]?\s*(.+)", full_text, re.IGNORECASE):
        week_num = int(match.group(1))
        title = match.group(2).strip()
        # Иногда в конце могут быть переносы строк, удаляем
        title = title.splitlines()[0]
        weeks[week_num] = title

    return weeks
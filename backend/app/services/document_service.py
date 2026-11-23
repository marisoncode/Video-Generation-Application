import os
import re
from typing import Optional, List, Dict, Any

class DocumentService:
    """
    Extracts text from uploaded PDF documents, text files, or raw input strings.
    """

    @classmethod
    def extract_text_from_pdf(cls, file_bytes: bytes) -> str:
        """Extracts text from PDF bytes using pypdf or native stream parsing."""
        extracted_text = []

        # 1. Try pypdf if installed
        try:
            import io
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text.append(text.strip())
            if extracted_text:
                return "\n\n".join(extracted_text)
        except Exception as e:
            print(f"[DocumentService] pypdf notice: {e}, attempting raw stream extraction.")

        # 2. Fallback: Parse visible ASCII text streams from PDF bytes
        try:
            content = file_bytes.decode("latin1", errors="ignore")
            # Extract Text Blocks between BT and ET
            matches = re.findall(r'BT\s*(.*?)\s*ET', content, re.DOTALL)
            for m in matches:
                # Find strings inside parentheses (Text)
                strings = re.findall(r'\((.*?)\)', m)
                line = " ".join(s.strip() for s in strings if s.strip() and not s.startswith("\\"))
                if len(line) > 5:
                    extracted_text.append(line)
            if extracted_text:
                return "\n".join(extracted_text)
        except Exception as ex:
            print(f"[DocumentService] Raw PDF extraction error: {ex}")

        return ""

    @classmethod
    def clean_text(cls, raw_text: str) -> str:
        """Cleans and normalizes extracted text."""
        # Replace multiple spaces and weird characters
        text = re.sub(r'\r\n|\r', '\n', raw_text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

document_service = DocumentService()

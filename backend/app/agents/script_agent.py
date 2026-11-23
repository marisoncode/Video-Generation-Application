import re
from typing import List, Dict, Any, Optional
from app.services.document_service import document_service

class ScriptAgent:
    """
    Dedicated Script & Storyboard Agent:
    Specializes in taking educational inputs (PDF syllabus, lecture notes, pre-written script, or idea prompt)
    and structuring them into cohesive scenes with optimized narration word counts and subtitles.
    """

    def process_input(
        self,
        input_mode: str,
        topic_prompt: Optional[str] = None,
        script_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes any raw input source into a list of structured scenes with titles and narrations.
        """
        title = "AI Video Project"
        raw_text = ""

        if input_mode == "document" and file_bytes:
            safe_fn = filename or "document.pdf"
            title = safe_fn.rsplit(".", 1)[0].replace("_", " ").title()
            if safe_fn.lower().endswith(".pdf"):
                raw_text = document_service.extract_text_from_pdf(file_bytes)
            else:
                try:
                    raw_text = file_bytes.decode("utf-8")
                except Exception:
                    raw_text = file_bytes.decode("latin1", errors="ignore")
            raw_text = document_service.clean_text(raw_text)
            scenes = self._segment_text_into_scenes(raw_text, default_topic=title)

        elif input_mode == "script" and script_text and script_text.strip():
            title = "Custom Script Explainer"
            raw_text = document_service.clean_text(script_text)
            scenes = self._segment_text_into_scenes(raw_text, default_topic=title)

        else:
            # Prompt / Idea mode
            topic = (topic_prompt or "Science Discovery").strip()
            title = f"{topic.title()} Explainer"
            scenes = self._generate_scenes_from_prompt(topic)

        return {
            "title": title,
            "scenes": scenes,
            "raw_text_length": len(raw_text)
        }

    def _generate_scenes_from_prompt(self, topic: str) -> List[Dict[str, Any]]:
        """Drafts a 3-act educational story based on a topic prompt."""
        return [
            {
                "scene_number": 1,
                "title": f"Introduction to {topic[:40]}",
                "narration": f"Welcome everyone! Today, we are exploring {topic}. Have you ever wondered how it works and why it matters? Let's take a closer look together!",
                "subtitle": f"Welcome! Today we are exploring {topic}.",
                "concept_summary": f"Introductory hook and question about {topic}"
            },
            {
                "scene_number": 2,
                "title": "The Core Concept in Action",
                "narration": f"Here is the secret behind {topic}. When you look closer, nature and science use clever principles to keep everything in balance step by step.",
                "subtitle": f"Here is the secret behind {topic} and how the process unfolds.",
                "concept_summary": f"Detailed core breakdown and scientific explanation of {topic}"
            },
            {
                "scene_number": 3,
                "title": "Key Takeaway & Conclusion",
                "narration": f"And that is the wonder of {topic}! Understanding this helps us appreciate our incredible world. Keep exploring, keep learning, and stay curious!",
                "subtitle": f"And that is the wonder of {topic}! Keep exploring and stay curious!",
                "concept_summary": f"Inspiring conclusion and summary of {topic}"
            }
        ]

    def _segment_text_into_scenes(self, text: str, default_topic: str) -> List[Dict[str, Any]]:
        """Parses written scripts, detecting Scene 1, Act 1, or paragraph breaks."""
        if not text:
            return self._generate_scenes_from_prompt(default_topic)

        # Check for explicit scene markers: Scene 1, Act 1, Part 1, Chapter 1
        pattern = r'(?:^|\n)(?:Scene\s*\d+|Act\s*\d+|Part\s*\d+|Chapter\s*\d+)[:\-\s]*'
        markers = list(re.finditer(pattern, text, re.IGNORECASE))

        raw_blocks = []
        if len(markers) >= 2:
            for i in range(len(markers)):
                start = markers[i].end()
                end = markers[i+1].start() if i + 1 < len(markers) else len(text)
                header = markers[i].group(0).strip()
                block_content = text[start:end].strip()
                if block_content:
                    raw_blocks.append((header, block_content))
        else:
            # Paragraph separation
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
            if not paragraphs:
                sentences = re.split(r'(?<=[.!?])\s+', text)
                chunk = []
                cur_len = 0
                for s in sentences:
                    chunk.append(s)
                    cur_len += len(s)
                    if cur_len > 180:
                        paragraphs.append(" ".join(chunk))
                        chunk = []
                        cur_len = 0
                if chunk:
                    paragraphs.append(" ".join(chunk))

            for i, p in enumerate(paragraphs[:6]):
                raw_blocks.append((f"Scene {i+1}", p))

        if not raw_blocks:
            raw_blocks = [("Scene 1", text)]

        scenes = []
        for idx, (header, content) in enumerate(raw_blocks):
            s_num = idx + 1
            lines = [l.strip() for l in content.split("\n") if l.strip()]
            title = header

            if len(lines) >= 2 and len(lines[0]) < 60 and not lines[0].endswith("."):
                title = f"{header}: {lines[0]}"
                narration = " ".join(lines[1:])
            else:
                title = f"{header}: Concept {s_num}"
                narration = " ".join(lines)

            # Strip bracketed director cues like [smiling] or (pause)
            clean_narration = re.sub(r'\[.*?\]|\(.*?\)', '', narration).strip()
            if not clean_narration:
                clean_narration = narration

            first_sentence = re.split(r'(?<=[.!?])\s+', clean_narration)[0]
            subtitle = first_sentence if len(first_sentence) < 140 else first_sentence[:137] + "..."

            scenes.append({
                "scene_number": s_num,
                "title": title,
                "narration": clean_narration,
                "subtitle": subtitle,
                "concept_summary": clean_narration[:100]
            })

        return scenes

script_agent = ScriptAgent()

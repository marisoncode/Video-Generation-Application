import os
import re
import json
import requests
from typing import List, Dict, Any, Optional
from app.services.document_service import document_service
from app.core.config import settings

class ScriptAgent:
    """
    Dedicated Script & Storyboard Agent:
    Transforms any raw input (PDF syllabus, Word docs, Excel/CSV sheets,
    live Google Docs & Sheets links, lecture notes, pre-written script, or idea prompt)
    into structured, engaging video scenes.
    Powered by Groq's high-speed LLM (openai/gpt-oss-120b) with automatic fallback
    to deterministic NLP text chunking.
    """

    GROQ_PRIMARY_MODEL = "openai/gpt-oss-120b"
    GROQ_FALLBACK_MODEL = "qwen/qwen3.8-27b"

    def process_input(
        self,
        input_mode: str,
        topic_prompt: Optional[str] = None,
        script_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        live_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes any raw input source into a list of structured scenes with titles and narrations.
        Uses Groq LLM for natural screenwritten spoken dialogue and visual prompts,
        with seamless local fallback.
        """
        title = "AI Video Project"
        raw_text = ""

        # 1. Live Google Docs & Sheets URL
        if (input_mode == "google_url" or (live_url and live_url.strip())) and live_url:
            clean_url = live_url.strip()
            if "spreadsheets/d" in clean_url:
                title = "Live Google Sheet Presentation"
                raw_text = document_service.fetch_live_google_sheet(clean_url)
            elif "document/d" in clean_url:
                title = "Live Google Doc Explainer"
                raw_text = document_service.fetch_live_google_doc(clean_url)
            else:
                try:
                    r = requests.get(clean_url, timeout=15)
                    raw_text = re.sub(r'<[^>]+>', ' ', r.text)
                    title = "Web Document Presentation"
                except Exception as e:
                    raise ValueError(f"Could not fetch document from URL: {e}")

            raw_text = document_service.clean_text(raw_text)

        # 2. Uploaded Document / Spreadsheet File
        elif input_mode == "document" and file_bytes:
            safe_fn = filename or "document.pdf"
            title = safe_fn.rsplit(".", 1)[0].replace("_", " ").title()
            raw_text = document_service.parse_uploaded_file(file_bytes, safe_fn)

        # 3. Pasted Script
        elif input_mode == "script" and script_text and script_text.strip():
            title = "Custom Script Explainer"
            raw_text = document_service.clean_text(script_text)

        # 4. Prompt / Topic mode
        else:
            topic = (topic_prompt or "Science Discovery").strip()
            title = f"{topic.title()} Explainer"
            raw_text = topic

        # Try Groq High-Speed LLM Screenwriter
        content_for_llm = raw_text if len(raw_text) > 15 else (topic_prompt or title)
        groq_result = self._call_groq_storyboard(content_for_llm, default_topic=title)

        if groq_result and groq_result.get("scenes"):
            return {
                "title": groq_result.get("title", title),
                "scenes": groq_result["scenes"],
                "raw_text_length": len(raw_text),
                "engine": "groq_llm"
            }

        # Fallback: Deterministic text parsing
        print("[ScriptAgent] Notice: Using deterministic NLP fallback for storyboard.")
        if input_mode == "prompt" or not raw_text.strip():
            scenes = self._generate_scenes_from_prompt(title)
        else:
            scenes = self._segment_text_into_scenes(raw_text, default_topic=title)

        return {
            "title": title,
            "scenes": scenes,
            "raw_text_length": len(raw_text),
            "engine": "local_nlp"
        }

    def _call_groq_storyboard(self, text: str, default_topic: str) -> Optional[Dict[str, Any]]:
        """
        Calls Groq API to screenwrite a structured 3 to 5 scene storyboard with spoken dialogue,
        on-screen subtitles, visual actions, and character motions.
        """
        api_key = os.getenv("GROQ_API_KEY", "").strip() or getattr(settings, "GROQ_API_KEY", "").strip()
        if not api_key or not api_key.startswith("gsk_"):
            return None

        prompt = f"""You are an award-winning educational video screenwriter and visual director.
Transform the following source document into a structured educational video storyboard with 3 to 5 scenes.

Requirements:
1. "title": Concise, engaging title for the video.
2. "scenes": An array of scene objects. Each scene must contain:
   - "scene_number": integer starting at 1
   - "title": punchy scene heading (2 to 5 words)
   - "narration": natural conversational spoken dialogue for voiceover (~25-35 words, ~10-15s speech duration). Write in active, warm spoken tone suitable for text-to-speech.
   - "subtitle": concise on-screen caption matching the narration (under 120 characters)
   - "concept_summary": core pedagogical concept of this scene
   - "visual_action": exact visual subject action, character emotion, and environment setting for 16:9 cinematic keyframe generation
   - "facial_motion": specific facial expression and natural motion (e.g. warm smile, direct eye contact with camera, natural blinking, gentle nodding)

Format strictly as JSON matching this schema:
{{
  "title": "Video Title",
  "scenes": [
    {{
      "scene_number": 1,
      "title": "Scene Title",
      "narration": "Spoken voiceover text...",
      "subtitle": "On-screen subtitle...",
      "concept_summary": "Core concept summary...",
      "visual_action": "Detailed physical action, character emotion, and environment...",
      "facial_motion": "Warm smile, direct eye contact, natural blinking"
    }}
  ]
}}

Source Content:
{text[:6000]}"""

        for model in [self.GROQ_PRIMARY_MODEL, self.GROQ_FALLBACK_MODEL]:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a professional educational video screenwriter. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3
                }
                res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=20
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    if parsed.get("scenes") and len(parsed["scenes"]) > 0:
                        print(f"[ScriptAgent] Successfully generated storyboard with Groq ({model})!")
                        return parsed
                else:
                    print(f"[ScriptAgent] Groq notice ({model}): HTTP {res.status_code} - {res.text[:150]}")
            except Exception as e:
                print(f"[ScriptAgent] Groq connection notice ({model}): {e}")

        return None

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

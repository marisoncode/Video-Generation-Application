import os
import re
from typing import List, Dict, Any, Optional

class StoryboardAgent:
    """
    Intelligent Storyboard Agent:
    Takes an educational topic prompt, raw pre-written script text, or extracted PDF document text,
    and structures it into cohesive, engaging scenes (total ~60-120 seconds).
    Automatically drafts:
      - Scene Titles & Spoken Narration
      - Sentence-timed Subtitles
      - High-fidelity 3D Pixar character & classroom visual prompts
      - Expressive facial & bodily motion prompts for character animation
    """

    DEFAULT_CHARACTER_ANCHOR = (
        "3D Pixar style character, cute friendly teacher Leo with expressive brown eyes and warm smile, "
        "wearing a stylish navy blue vest and rolled-up sleeves, Disney Pixar animated film aesthetic, "
        "vibrant cinematic studio lighting, Octane render 8K, highly detailed"
    )

    @classmethod
    def generate_from_prompt(cls, topic: str) -> List[Dict[str, Any]]:
        """
        Creates a structured multi-scene educational storyboard from a concept or topic.
        """
        clean_topic = topic.strip()
        if not clean_topic:
            clean_topic = "Science Discovery"

        # Generate a 3-scene educational sequence
        scenes = [
            {
                "scene_number": 1,
                "title": f"Introduction to {clean_topic[:40]}",
                "narration": f"Welcome everyone! Today, we are going to explore the fascinating world of {clean_topic}. Have you ever wondered how it works? Let's dive right in!",
                "subtitle": f"Welcome to our discovery of {clean_topic}! Let's find out how it works.",
                "image_prompt": f"{cls.DEFAULT_CHARACTER_ANCHOR}, standing enthusiastically in a modern colorful science classroom with holographic glowing diagrams about {clean_topic}, smiling at camera, 16:9 aspect ratio",
                "motion_prompt": "Warm enthusiastic smile, direct eye contact with camera, gentle nodding, natural eye blinking, energetic teacher gesture",
                "motion_style": "zoom_in"
            },
            {
                "scene_number": 2,
                "title": "The Core Concept Explained",
                "narration": f"Here is the secret behind {clean_topic}. When you look closer, nature uses clever principles to make everything balance and flow smoothly.",
                "subtitle": f"Here is the secret behind {clean_topic}. Watch how the process unfolds step by step.",
                "image_prompt": f"{cls.DEFAULT_CHARACTER_ANCHOR}, pointing at an interactive glowing 3D floating model illustrating {clean_topic}, bright curious expression, colorful high-tech laboratory background, 16:9 aspect ratio",
                "motion_prompt": "Intrigued expression, smiling softly, pointing hand gesture, head tilting slightly with curiosity, natural blinking",
                "motion_style": "pan_right"
            },
            {
                "scene_number": 3,
                "title": "Why It Matters & Summary",
                "narration": f"And that is the wonder of {clean_topic}! Understanding this helps us appreciate how interconnected our world truly is. Keep exploring and asking big questions!",
                "subtitle": f"And that is the wonder of {clean_topic}! Keep exploring and asking big questions!",
                "image_prompt": f"{cls.DEFAULT_CHARACTER_ANCHOR}, waving happily with a proud cheerful smile, warm sunny classroom setting with floating golden light particles, Disney Pixar look, 16:9 aspect ratio",
                "motion_prompt": "Joyful friendly smile, gentle hand wave, head nodding warmly, natural eye blinking, lifelike facial movement",
                "motion_style": "zoom_out"
            }
        ]
        return scenes

    @classmethod
    def generate_from_script(cls, script_text: str) -> List[Dict[str, Any]]:
        """
        Parses pre-written script text (e.g. pasted or extracted from PDF) into structured scenes.
        Detects explicit scene markers (Scene 1, [Scene 2], Act 1) or breaks by paragraphs.
        """
        text = script_text.strip()
        if not text:
            return cls.generate_from_prompt("General Science Concept")

        # Check for explicit scene markers: Scene 1, Scene 2, etc.
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
            # Split by double newlines or cohesive paragraphs
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
            if not paragraphs:
                # Fallback: split long text into ~2-3 sentence chunks
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

            for i, p in enumerate(paragraphs[:6]):  # Cap to 6 scenes max for 120s limit
                raw_blocks.append((f"Scene {i+1}", p))

        if not raw_blocks:
            raw_blocks = [("Scene 1", text)]

        scenes = []
        auto_motion_styles = ["zoom_in", "pan_right", "zoom_out", "pan_left"]

        for idx, (header, content) in enumerate(raw_blocks):
            s_num = idx + 1
            # Extract title if present in first line
            lines = [l.strip() for l in content.split("\n") if l.strip()]
            title = f"{header}"
            narration = content

            if len(lines) >= 2 and len(lines[0]) < 60 and not lines[0].endswith("."):
                title = f"{header}: {lines[0]}"
                narration = " ".join(lines[1:])
            else:
                title = f"{header}: Concept {s_num}"
                narration = " ".join(lines)

            # Clean narration of stage directions like [Smiling], (sound effect), etc.
            narration_cleaned = re.sub(r'\[.*?\]|\(.*?\)', '', narration).strip()
            if not narration_cleaned:
                narration_cleaned = narration

            # Generate concise subtitle
            first_sentence = re.split(r'(?<=[.!?])\s+', narration_cleaned)[0]
            subtitle = first_sentence if len(first_sentence) < 140 else first_sentence[:137] + "..."

            # Keyword-based scene visuals
            context_snippet = narration_cleaned[:120].lower()
            visual_setting = "modern vibrant educational studio with interactive holographic displays"
            if any(k in context_snippet for k in ["sun", "plant", "photosynthesis", "leaf", "chloroplast"]):
                visual_setting = "lush glowing greenhouse laboratory observing radiant green plant cells under sunlight"
            elif any(k in context_snippet for k in ["space", "planet", "orbit", "solar", "star", "galaxy"]):
                visual_setting = "futuristic astronomy planetarium with floating 3D planetary orbits"
            elif any(k in context_snippet for k in ["math", "formula", "calculate", "number"]):
                visual_setting = "creative mathematics classroom with glowing geometric holograms"
            elif any(k in context_snippet for k in ["history", "ancient", "civilization", "pyramid"]):
                visual_setting = "majestic historic library with warm candlelit books and artifacts"
            elif any(k in context_snippet for k in ["body", "cell", "heart", "blood", "brain"]):
                visual_setting = "state-of-the-art medical science lab with transparent anatomical holograms"

            img_prompt = (
                f"{cls.DEFAULT_CHARACTER_ANCHOR}, in a {visual_setting}, "
                f"presenting Scene {s_num}, cinematic depth of field, 16:9 widescreen composition"
            )

            mot_prompt = (
                "Direct eye contact, lively smiling facial expressions, natural eye blinking, "
                "gentle head motion, speaking naturally and enthusiastically"
            )

            scenes.append({
                "scene_number": s_num,
                "title": title,
                "narration": narration_cleaned,
                "subtitle": subtitle,
                "image_prompt": img_prompt,
                "motion_prompt": mot_prompt,
                "motion_style": auto_motion_styles[idx % len(auto_motion_styles)]
            })

        return scenes

    @classmethod
    def generate_from_document(cls, document_text: str) -> List[Dict[str, Any]]:
        """
        Processes document text extracted from PDF or files and creates educational storyboard.
        """
        # If document already contains structured scene headers, generate_from_script preserves them
        return cls.generate_from_script(document_text)

storyboard_agent = StoryboardAgent()

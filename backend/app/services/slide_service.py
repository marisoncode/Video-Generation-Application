import os
from PIL import Image, ImageDraw, ImageFont
from typing import Tuple, Any

class SlideService:
    @staticmethod
    def create_arena_background(width: int = 1920, height: int = 1080) -> Image.Image:
        """
        Renders the modern clean stadium arena curved arcs matching the reference video.
        Uses soft cool grey / ice blue background with curved stadium rings.
        """
        base = Image.new("RGB", (width, height), (245, 247, 252))
        draw = ImageDraw.Draw(base)

        arc_colors = [
            (232, 238, 248),
            (225, 233, 246),
            (235, 241, 250),
            (240, 245, 253)
        ]

        # Draw smooth concentric curved arcs
        for i, col in enumerate(arc_colors):
            y_offset = int(height * 0.12 + i * 45)
            draw.arc(
                [-width * 0.25, y_offset, width * 1.25, y_offset + int(height * 0.85)],
                start=0, end=180, fill=col, width=5
            )

        # Architectural accent lines across header
        for j in range(14):
            x = int(width * 0.08 + j * (width * 0.065))
            draw.line([x, 25, x + 50, 65], fill=(230, 236, 246), width=2)

        return base

    @staticmethod
    def _get_fonts() -> Tuple[Any, Any, Any]:
        """Loads available system fonts or falls back cleanly."""
        try:
            f_title = ImageFont.truetype("arialbd.ttf", 92)
            f_sub = ImageFont.truetype("arialbd.ttf", 54)
            f_body = ImageFont.truetype("arialbd.ttf", 44)
        except IOError:
            try:
                f_title = ImageFont.truetype("arial.ttf", 92)
                f_sub = ImageFont.truetype("arial.ttf", 54)
                f_body = ImageFont.truetype("arial.ttf", 44)
            except IOError:
                f_title = ImageFont.load_default()
                f_sub = ImageFont.load_default()
                f_body = ImageFont.load_default()
        return f_title, f_sub, f_body

    @classmethod
    def render_title_slide(cls, title: str, day: str, age_group: str, output_path: str, width: int = 1920, height: int = 1080) -> str:
        """
        Renders Scene 1: Exactly matches 'Tutorial No-1' stadium slide from reference video.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img = cls.create_arena_background(width, height)
        draw = ImageDraw.Draw(img)
        f_title, f_sub, _ = cls._get_fonts()

        # Extract number from DAY-X (e.g. DAY-2 -> 2)
        day_num = day.replace("DAY-", "").replace("DAY", "").strip() or "1"
        tutorial_text = f"Tutorial No-{day_num}"

        # Main Royal Blue Title (Centered at 50% height, exact font weight and color from reference)
        draw.text((width // 2, height // 2), tutorial_text, fill=(17, 72, 204), anchor="mm", font=f_title)

        img.save(output_path, "JPEG", quality=95)
        return output_path

    @classmethod
    def render_age_slide(cls, day: str, age_group: str, output_path: str, width: int = 1920, height: int = 1080) -> str:
        """
        Renders Scene 2: Day identification and Target Age Group badge.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img = cls.create_arena_background(width, height)
        draw = ImageDraw.Draw(img)
        f_title, f_sub, f_body = cls._get_fonts()

        # Day Label
        draw.text((width // 2, int(height * 0.35)), day.upper(), fill=(17, 72, 204), anchor="mm", font=f_title)

        # Curved pill container for Age Group
        pill_w, pill_h = 750, 110
        px1 = (width - pill_w) // 2
        py1 = int(height * 0.52)
        px2 = px1 + pill_w
        py2 = py1 + pill_h
        draw.rounded_rectangle([px1, py1, px2, py2], radius=45, fill=(225, 29, 90))

        draw.text((width // 2, py1 + pill_h // 2), f"AGE: {age_group.upper()}", fill=(255, 255, 255), anchor="mm", font=f_sub)

        img.save(output_path, "JPEG", quality=95)
        return output_path

    @classmethod
    def render_programme_slide(cls, day: str, programme_text: str, output_path: str, width: int = 1920, height: int = 1080) -> str:
        """
        Renders Scene 3: PROGRAMME overview with stylized alternating bullet cards.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img = cls.create_arena_background(width, height)
        draw = ImageDraw.Draw(img)
        f_title, f_sub, f_body = cls._get_fonts()

        # Header
        draw.text((width // 2, int(height * 0.22)), "PROGRAMME", fill=(30, 58, 138), anchor="mm", font=f_title)

        # Parse programme lines
        lines = [l.strip() for l in programme_text.split("\n") if l.strip()]
        if not lines:
            lines = [programme_text]

        y_start = int(height * 0.40)
        spacing = 110

        for i, line in enumerate(lines[:3]):
            card_w, card_h = 1300, 85
            cx1 = (width - card_w) // 2
            cy1 = y_start + (i * spacing)
            cx2 = cx1 + card_w
            cy2 = cy1 + card_h

            # Alternate background colors
            card_bg = (235, 242, 255) if i % 2 == 0 else (255, 240, 245)
            text_color = (17, 72, 204) if i % 2 == 0 else (225, 29, 90)
            
            draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=20, fill=card_bg)
            draw.text((width // 2, cy1 + card_h // 2), line, fill=text_color, anchor="mm", font=f_body)

        img.save(output_path, "JPEG", quality=95)
        return output_path

    @classmethod
    def render_demo_card(cls, title: str, target: str, description: str, output_path: str, width: int = 1920, height: int = 1080) -> str:
        """
        Renders Activity Header Slide: Exactly matches the reference video slide layout.
        Line 1: Royal Blue (e.g. '1. Mirror Play Activity')
        Line 2: Magenta (e.g. 'Visual Stimulation')
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img = cls.create_arena_background(width, height)
        draw = ImageDraw.Draw(img)
        f_title, f_sub, _ = cls._get_fonts()

        # Line 1: Activity Number & Name in Royal Blue (#1148CC)
        draw.text((width // 2, int(height * 0.43)), title, fill=(17, 72, 204), anchor="mm", font=f_title)

        # Line 2: Sensory Skill Focus in Magenta (#E91E63)
        draw.text((width // 2, int(height * 0.58)), target, fill=(233, 30, 99), anchor="mm", font=f_title)

        img.save(output_path, "JPEG", quality=95)
        return output_path

slide_service = SlideService()


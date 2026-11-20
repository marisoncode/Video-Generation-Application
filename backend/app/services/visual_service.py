import os
import hashlib
from urllib.parse import quote
from PIL import Image, ImageDraw, ImageFont, ImageOps
import requests
from app.core.config import settings

CACHE_DIR = os.path.join(settings.BASE_DIR, "storage", "visual_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

class VisualService:
    @staticmethod
    def _get_cache_path(prompt: str) -> str:
        prompt_hash = hashlib.md5(prompt.encode('utf-8')).hexdigest()
        return os.path.join(CACHE_DIR, f"{prompt_hash}.jpg")

    @classmethod
    def render_dynamic_activity_card(
        cls,
        activity_title: str,
        subtitle_target: str,
        scene_type: str = "general",
        width: int = 1920,
        height: int = 1080,
        output_path: str = "temp/card.jpg"
    ) -> str:
        """
        Renders a crisp, 1080p concept illustration card tailored to the exact activity:
        Mirror play, Strawberry, Swing, Leg lift, Eucalyptus, Cardamom, Vocal play.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        bg_color = (250, 252, 255)
        banner_color = (235, 242, 255)
        primary_color = (17, 72, 204)
        accent_color = (225, 29, 90)

        if any(k in scene_type for k in ["strawberry", "scent", "cardamom", "eucalyptus"]):
            bg_color = (255, 250, 252)
            banner_color = (255, 241, 246)
            primary_color = (225, 29, 90)
            accent_color = (17, 72, 204)
        elif any(k in scene_type for k in ["swing", "leg_lift"]):
            bg_color = (248, 253, 250)
            banner_color = (236, 253, 245)
            primary_color = (5, 150, 105)
            accent_color = (17, 72, 204)

        img = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(img)

        try:
            font_title = ImageFont.truetype("arialbd.ttf", 64)
            font_sub = ImageFont.truetype("arialbd.ttf", 48)
            font_pill = ImageFont.truetype("arialbd.ttf", 40)
            font_symbol = ImageFont.truetype("arialbd.ttf", 130)
        except IOError:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            font_pill = ImageFont.load_default()
            font_symbol = ImageFont.load_default()

        # Top Header Banner
        draw.rectangle([0, 0, width, 180], fill=banner_color)
        draw.text((width // 2, 90), activity_title.upper(), fill=primary_color, anchor="mm", font=font_title)

        # Center Illustration Circle
        cx, cy = width // 2, height // 2 + 10
        draw.ellipse([cx - 280, cy - 280, cx + 280, cy + 280], fill=(255, 255, 255), outline=banner_color, width=8)

        # Activity specific graphics
        if "mirror" in scene_type:
            draw.ellipse([cx - 200, cy - 200, cx + 200, cy + 200], fill=(224, 242, 254), outline=(14, 165, 233), width=8)
            draw.ellipse([cx - 60, cy - 50, cx - 20, cy - 10], fill=(14, 165, 233))
            draw.ellipse([cx + 20, cy - 50, cx + 60, cy - 10], fill=(14, 165, 233))
            draw.arc([cx - 80, cy - 30, cx + 80, cy + 80], start=20, end=160, fill=(14, 165, 233), width=8)
            draw.text((cx, cy + 130), "MIRROR PLAY & MIMICRY", fill=(3, 105, 161), anchor="mm", font=font_sub)
        elif "strawberry" in scene_type:
            draw.polygon([(cx - 130, cy - 90), (cx + 130, cy - 90), (cx, cy + 170)], fill=(239, 68, 68))
            draw.ellipse([cx - 110, cy - 130, cx, cy - 70], fill=(239, 68, 68))
            draw.ellipse([cx, cy - 130, cx + 110, cy - 70], fill=(239, 68, 68))
            draw.polygon([(cx - 50, cy - 120), (cx, cy - 180), (cx + 50, cy - 120)], fill=(34, 197, 94))
            draw.text((cx, cy + 30), "SWEET STRAWBERRY", fill=(255, 255, 255), anchor="mm", font=font_sub)
        elif "swing" in scene_type:
            draw.line([cx - 120, cy - 230, cx - 120, cy + 80], fill=(100, 116, 139), width=6)
            draw.line([cx + 120, cy - 230, cx + 120, cy + 80], fill=(100, 116, 139), width=6)
            draw.rounded_rectangle([cx - 160, cy + 80, cx + 160, cy + 130], radius=10, fill=(217, 119, 6))
            draw.text((cx, cy - 60), "🎵 🎶 🎵", fill=(16, 185, 129), anchor="mm", font=font_symbol)
            draw.text((cx, cy + 160), "MELODY SWING", fill=(4, 120, 87), anchor="mm", font=font_sub)
        elif "leg_lift" in scene_type:
            draw.text((cx, cy - 40), "🦶 🦶", fill=(16, 185, 129), anchor="mm", font=font_symbol)
            draw.text((cx, cy + 110), "LEG LIFT EXERCISE", fill=(4, 120, 87), anchor="mm", font=font_sub)
        elif "eucalyptus" in scene_type or "cardamom" in scene_type:
            pad_name = "EUCALYPTUS" if "eucalyptus" in scene_type else "CARDAMOM"
            draw.ellipse([cx - 160, cy - 160, cx + 160, cy + 160], fill=(241, 245, 249), outline=(148, 163, 184), width=5)
            draw.text((cx, cy - 30), "🌿", fill=(34, 197, 94), anchor="mm", font=font_symbol)
            draw.text((cx, cy + 110), f"NATURAL {pad_name}", fill=(21, 128, 61), anchor="mm", font=font_sub)
        elif "laugh" in scene_type or "clap" in scene_type:
            draw.text((cx, cy - 30), "😄 👏", fill=(245, 158, 11), anchor="mm", font=font_symbol)
            draw.text((cx, cy + 120), "JOYFUL INTERACTION", fill=(180, 83, 9), anchor="mm", font=font_sub)
        else:
            draw.text((cx, cy - 30), "🗣️ 'Aa'", fill=(37, 99, 235), anchor="mm", font=font_symbol)
            draw.text((cx, cy + 120), "VOWEL VOCALIZATION", fill=(29, 78, 216), anchor="mm", font=font_sub)

        # Bottom Developmental Target Pill
        draw.rounded_rectangle([width//2 - 450, height - 200, width//2 + 450, height - 120], radius=20, fill=accent_color)
        draw.text((width // 2, height - 160), subtitle_target, fill=(255, 255, 255), anchor="mm", font=font_pill)

        img.save(output_path, "JPEG", quality=95)
        return output_path

    @classmethod
    def generate_scene_image(
        cls,
        prompt: str,
        scene_type: str = "general",
        activity_title: str = "Sensory Activity",
        subtitle_target: str = "Right-Brain Development",
        output_path: str = "temp/scene.jpg",
        width: int = 1920,
        height: int = 1080
    ) -> str:
        """
        Generates brand-new 1080p scene visual based on the concept:
        1. Checks visual disk cache.
        2. Tries Free Cloud GPU 3D Pixar generation via Pollinations Turbo (100% Free, 0 API key).
        3. If offline/sandboxed, loads tailored 3D Pixar asset or renders concept graphic card.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        cache_file = cls._get_cache_path(prompt)
        if os.path.exists(cache_file):
            with Image.open(cache_file) as cached:
                fitted = ImageOps.fit(cached.convert("RGB"), (width, height), method=Image.Resampling.LANCZOS)
                fitted.save(output_path, "JPEG", quality=95)
            return output_path

        # If it's an educator summary scene, use the 3D Educator portrait
        if scene_type == "presenter" or "educator" in scene_type:
            teacher_portrait = os.path.join(CACHE_DIR, "ai_teacher_portrait_1080p.jpg")
            if os.path.exists(teacher_portrait):
                with Image.open(teacher_portrait) as im:
                    fitted = ImageOps.fit(im.convert("RGB"), (width, height), method=Image.Resampling.LANCZOS)
                    fitted.save(output_path, "JPEG", quality=95)
                return output_path

        # Try Free Online Pollinations Turbo (0 API Key required)
        try:
            enhanced = (
                f"3D Pixar Disney animated movie render, {prompt}, cute charming mother and baby, "
                f"soft rounded facial features, cheerful expressive eyes, warm pastel sunlit nursery, "
                f"octane 8k render, masterpiece, Disney cartoon aesthetic, ultra detailed"
            )
            encoded = quote(enhanced)
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=1280&height=720&model=turbo&nologo=true&seed=42"
            res = requests.get(url, timeout=20)
            if res.status_code == 200 and len(res.content) > 5000:
                with open(cache_file, "wb") as f:
                    f.write(res.content)
                with Image.open(cache_file) as img:
                    fitted = ImageOps.fit(img.convert("RGB"), (width, height), method=Image.Resampling.LANCZOS)
                    fitted.save(output_path, "JPEG", quality=95)
                return output_path
        except Exception as e:
            print(f"[Visual Notice] Cloud GPU generation notice: {e}. Utilizing local high-fidelity visual asset.")

        # Fallback to high-quality tailored concept card
        return cls.render_dynamic_activity_card(
            activity_title=activity_title,
            subtitle_target=subtitle_target,
            scene_type=scene_type,
            width=width,
            height=height,
            output_path=output_path
        )

visual_service = VisualService()


import os
import time
import requests
import urllib.parse
from typing import Dict, Any, List, Optional
from app.core.config import settings

class ImageAgent:
    """
    Dedicated AI Image Generation Agent:
    Renders high-resolution 16:9 widescreen visuals for each scene.
    Supports primary Replicate FLUX.1-schnell with automatic resilient high-speed fallback.
    """

    REPLICATE_FLUX_VERSION = "c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e"

    def __init__(self):
        self.uploads_dir = settings.UPLOADS_DIR
        os.makedirs(self.uploads_dir, exist_ok=True)

    def _log(self, msg: str):
        log_path = os.path.join(settings.STORAGE_DIR, "replicate_debug.log")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] [ImageAgent] {msg}\n"
        print(f"[ImageAgent] {msg}")
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception:
            pass

    def generate_scene_image(self, prompt: str, scene_idx: int = 1) -> Dict[str, Any]:
        """
        Renders a single 16:9 scene image, stores in uploads, and returns local and preview paths.
        """
        timestamp = int(time.time() * 1000)
        provider = "replicate_flux"

        # 1. Try Replicate FLUX
        img_bytes = self._try_replicate_flux(prompt, scene_idx)

        # 2. Try Fallback if Replicate returned 402 or is unconfigured
        if not img_bytes:
            provider = "pollinations_flux"
            self._log(f"Rendering Scene {scene_idx} using high-speed FLUX engine...")
            img_bytes = self._generate_fallback(prompt)

        # 3. Save to disk
        filename = f"ai_scene_{scene_idx}_{timestamp}.jpg"
        save_path = os.path.join(self.uploads_dir, filename)

        if img_bytes:
            with open(save_path, "wb") as f:
                f.write(img_bytes)
            self._log(f"Scene {scene_idx} image saved: {filename} ({provider})")
        else:
            self._create_placeholder(save_path, f"Scene {scene_idx}")
            provider = "placeholder"

        return {
            "filename": filename,
            "local_path": save_path,
            "preview_url": f"/static/uploads/{filename}",
            "provider": provider
        }

    def _try_replicate_flux(self, prompt: str, scene_idx: int) -> Optional[bytes]:
        token = os.getenv("REPLICATE_API_TOKEN", "").strip()
        if not token or not token.startswith("r8_"):
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "wait=60"
        }
        payload = {
            "version": self.REPLICATE_FLUX_VERSION,
            "input": {
                "prompt": prompt,
                "aspect_ratio": "16:9",
                "num_outputs": 1,
                "output_format": "webp"
            }
        }
        try:
            res = requests.post("https://api.replicate.com/v1/predictions", headers=headers, json=payload, timeout=60)
            if res.status_code in [200, 201]:
                res_data = res.json()
                status = res_data.get("status")
                output = res_data.get("output")
                if status == "succeeded" and output:
                    url = output if isinstance(output, str) else output[0]
                    dl = requests.get(url, timeout=30)
                    if dl.status_code == 200:
                        return dl.content
            elif res.status_code == 402:
                self._log("Replicate returned 402 (Insufficient credit). Using resilient engine.")
        except Exception as e:
            self._log(f"Replicate attempt notice: {e}")
        return None

    def _generate_fallback(self, prompt: str) -> Optional[bytes]:
        try:
            encoded = urllib.parse.quote(prompt)
            url = f"https://image.pollinations.ai/prompt/{encoded}?nologo=true"
            res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=45)
            if res.status_code == 200 and len(res.content) > 1000:
                return res.content
        except Exception as e:
            self._log(f"Fallback generation error: {e}")
        return None

    def _create_placeholder(self, save_path: str, title: str):
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (1280, 720), color=(15, 23, 42))
            draw = ImageDraw.Draw(img)
            draw.text((640, 360), title, fill=(255, 255, 255), anchor="mm")
            img.save(save_path, "JPEG")
        except Exception:
            with open(save_path, "wb") as f:
                f.write(b"")

    def generate_storyboard_images(self, scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        updated = []
        for i, s in enumerate(scenes):
            s_num = s.get("scene_number", i + 1)
            prompt = s.get("image_prompt") or f"Visual scene {s_num}"
            res = self.generate_scene_image(prompt, scene_idx=s_num)
            s["image_path"] = res["local_path"]
            s["preview_url"] = res["preview_url"]
            s["image_provider"] = res["provider"]
            updated.append(s)
        return updated

    def regenerate_scene_image(self, scene_index: int, custom_prompt: str) -> Dict[str, Any]:
        return self.generate_scene_image(custom_prompt, scene_idx=scene_index)

image_agent = ImageAgent()

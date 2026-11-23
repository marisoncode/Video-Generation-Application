import os
import time
import requests
import urllib.parse
from typing import Dict, Any, List, Optional
from app.core.config import settings

class ImageGenService:
    """
    AI Image Generation Engine for Storyboard Scenes:
    - Primary: Replicate FLUX.1-schnell (via configured REPLICATE_API_TOKEN)
    - Fallback: High-resolution Pollinations FLUX (100% free fallback if Replicate token is unbilled/402)
    Always ensures every scene gets a pristine, consistent 16:9 visual render.
    """

    REPLICATE_FLUX_VERSION = "c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e"

    def __init__(self):
        self.uploads_dir = settings.UPLOADS_DIR
        os.makedirs(self.uploads_dir, exist_ok=True)

    def _log(self, msg: str):
        log_path = os.path.join(settings.STORAGE_DIR, "replicate_debug.log")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] [ImageGen] {msg}\n"
        print(f"[ImageGen] {msg}")
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception:
            pass

    def _try_replicate_flux(self, prompt: str, scene_idx: int) -> Optional[str]:
        """Attempts to generate image using Replicate FLUX.1-schnell."""
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
            self._log(f"Submitting Scene {scene_idx} to Replicate FLUX...")
            res = requests.post("https://api.replicate.com/v1/predictions", headers=headers, json=payload, timeout=60)
            
            if res.status_code in [200, 201]:
                res_data = res.json()
                status = res_data.get("status")
                output = res_data.get("output")
                
                # If finished synchronously
                if status == "succeeded" and output:
                    img_url = output if isinstance(output, str) else output[0]
                    return img_url

                # If asynchronous, poll for completion
                get_url = res_data.get("urls", {}).get("get")
                if get_url:
                    for _ in range(30):
                        time.sleep(2)
                        p_res = requests.get(get_url, headers={"Authorization": f"Bearer {token}"}, timeout=20)
                        if p_res.status_code == 200:
                            p_data = p_res.json()
                            if p_data.get("status") == "succeeded" and p_data.get("output"):
                                return p_data["output"] if isinstance(p_data["output"], str) else p_data["output"][0]
                            elif p_data.get("status") in ["failed", "canceled"]:
                                break
            elif res.status_code == 402:
                self._log("Replicate returned 402 (Insufficient credit). Switching to free high-res FLUX fallback.")
            else:
                self._log(f"Replicate FLUX HTTP {res.status_code}: {res.text[:120]}")

        except Exception as e:
            self._log(f"Replicate FLUX error: {e}")

        return None

    def _generate_fallback_flux(self, prompt: str) -> Optional[bytes]:
        """Generates high-speed AI image via Pollinations endpoint."""
        try:
            encoded = urllib.parse.quote(prompt)
            url = f"https://image.pollinations.ai/prompt/{encoded}?nologo=true"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            res = requests.get(url, headers=headers, timeout=45)
            if res.status_code == 200 and len(res.content) > 1000:
                return res.content
        except Exception as e:
            self._log(f"Pollinations notice: {e}")
        return None

    def generate_scene_image(self, prompt: str, scene_idx: int = 1) -> Dict[str, Any]:
        """
        Generates a 16:9 scene image, stores it in backend/storage/uploads/,
        and returns local filepath and public preview URL.
        """
        timestamp = int(time.time() * 1000)
        provider = "replicate_flux"

        # 1. Try Replicate FLUX
        remote_url = self._try_replicate_flux(prompt, scene_idx)
        img_bytes = None

        if remote_url:
            try:
                dl_res = requests.get(remote_url, timeout=30)
                if dl_res.status_code == 200:
                    img_bytes = dl_res.content
            except Exception:
                img_bytes = None

        # 2. Try Fallback FLUX if Replicate gave 402 or failed
        if not img_bytes:
            provider = "pollinations_flux"
            self._log(f"Generating Scene {scene_idx} using high-speed FLUX engine...")
            img_bytes = self._generate_fallback_flux(prompt)

        # 3. Save to uploads directory
        filename = f"ai_scene_{scene_idx}_{timestamp}.jpg"
        save_path = os.path.join(self.uploads_dir, filename)

        if img_bytes:
            with open(save_path, "wb") as f:
                f.write(img_bytes)
            self._log(f"Scene {scene_idx} image saved: {filename} ({provider})")
        else:
            # Fallback: create placeholder color canvas using PIL or basic write
            self._create_placeholder_image(save_path, f"Scene {scene_idx}")
            provider = "placeholder"

        return {
            "filename": filename,
            "local_path": save_path,
            "preview_url": f"/static/uploads/{filename}",
            "provider": provider
        }

    def _create_placeholder_image(self, save_path: str, title: str):
        """Creates a sleek 1280x720 canvas if offline and no network available."""
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
        """
        Iterates through scenes and populates image_path and preview_url for each.
        """
        updated_scenes = []
        for i, s in enumerate(scenes):
            s_num = s.get("scene_number", i + 1)
            prompt = s.get("image_prompt") or f"3D Pixar style scene {s_num}"
            
            # Generate image
            img_res = self.generate_scene_image(prompt, scene_idx=s_num)
            
            s["image_path"] = img_res["local_path"]
            s["preview_url"] = img_res["preview_url"]
            s["image_provider"] = img_res["provider"]
            updated_scenes.append(s)

        return updated_scenes

    def regenerate_scene_image(self, scene_index: int, custom_prompt: str) -> Dict[str, Any]:
        """
        Regenerates an image for a specific scene with an updated or tweaked prompt.
        """
        return self.generate_scene_image(custom_prompt, scene_idx=scene_index)

image_gen_service = ImageGenService()

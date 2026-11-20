import os
import time
import base64
import requests
from typing import Optional, Dict, Any
from app.core.config import settings

class DIDService:
    BASE_URL = "https://api.d-id.com"

    def __init__(self):
        self.api_key = os.getenv("DID_API_KEY", "").strip()

    def is_configured(self) -> bool:
        """Checks if D-ID API key is present."""
        self.api_key = os.getenv("DID_API_KEY", "").strip()
        return bool(self.api_key)

    def _get_auth_header(self) -> Dict[str, str]:
        """Formats Authorization header handling raw, prefixed, and base64 keys."""
        key = self.api_key.strip()
        if key.startswith("Basic "):
            key = key.replace("Basic ", "").strip()
        elif key.startswith("Bearer "):
            key = key.replace("Bearer ", "").strip()

        if ":" in key:
            encoded = base64.b64encode(key.encode("utf-8")).decode("utf-8")
        else:
            encoded = key

        return {
            "Authorization": f"Basic {encoded}",
            "Accept": "application/json"
        }

    def upload_image(self, image_path: str) -> str:
        """Uploads a local image to D-ID temporary storage and returns its URL."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        headers = self._get_auth_header()
        filename = os.path.basename(image_path)
        mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"

        with open(image_path, "rb") as f:
            files = {"image": (filename, f, mime)}
            res = requests.post(f"{self.BASE_URL}/images", headers=headers, files=files, timeout=45)

        if res.status_code not in [200, 201]:
            raise RuntimeError(f"D-ID image upload failed HTTP {res.status_code}: {res.text}")

        data = res.json()
        image_url = data.get("url")
        if not image_url:
            raise RuntimeError(f"D-ID returned no image URL: {data}")

        return image_url

    def upload_audio(self, audio_path: str) -> str:
        """Uploads a local audio file to D-ID temporary storage and returns its URL."""
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio not found at {audio_path}")

        headers = self._get_auth_header()
        filename = os.path.basename(audio_path)
        mime = "audio/wav" if filename.lower().endswith(".wav") else "audio/mpeg"

        with open(audio_path, "rb") as f:
            files = {"audio": (filename, f, mime)}
            res = requests.post(f"{self.BASE_URL}/audios", headers=headers, files=files, timeout=45)

        if res.status_code not in [200, 201]:
            raise RuntimeError(f"D-ID audio upload failed HTTP {res.status_code}: {res.text}")

        data = res.json()
        audio_url = data.get("url") or data.get("audio_url")
        if not audio_url:
            raise RuntimeError(f"D-ID returned no audio URL: {data}")

        return audio_url

    def animate_portrait(
        self,
        image_path: str,
        audio_path: str,
        output_dir: Optional[str] = None
    ) -> Optional[str]:
        """
        Creates a real talking-head video with blinking eyes, natural facial expressions,
        and speech lip-synchronization via D-ID API.
        """
        if not self.is_configured():
            return None

        headers = self._get_auth_header()
        headers["Content-Type"] = "application/json"

        # 1. Upload assets
        print(f"[D-ID] Uploading character image '{os.path.basename(image_path)}'...")
        image_url = self.upload_image(image_path)

        print(f"[D-ID] Uploading spoken audio '{os.path.basename(audio_path)}'...")
        audio_url = self.upload_audio(audio_path)

        # 2. Submit Talk creation task
        payload = {
            "source_url": image_url,
            "script": {
                "type": "audio",
                "audio_url": audio_url
            },
            "config": {
                "stitch": True,
                "pad_audio": 0.0
            }
        }

        print("[D-ID] Creating talking facial animation task...")
        res = requests.post(f"{self.BASE_URL}/talks", headers=headers, json=payload, timeout=45)
        if res.status_code not in [200, 201]:
            raise RuntimeError(f"D-ID create talk failed HTTP {res.status_code}: {res.text}")

        talk_data = res.json()
        talk_id = talk_data.get("id")
        if not talk_id:
            raise RuntimeError(f"D-ID returned no talk ID: {talk_data}")

        print(f"[D-ID] Talk task created! Task ID: {talk_id}. Polling for completion...")

        # 3. Poll for status
        poll_interval = 3
        max_wait = 300  # 5 minutes
        start_time = time.time()
        video_url = None

        while time.time() - start_time < max_wait:
            time.sleep(poll_interval)
            status_res = requests.get(f"{self.BASE_URL}/talks/{talk_id}", headers=headers, timeout=30)
            if status_res.status_code != 200:
                continue

            status_json = status_res.json()
            status = status_json.get("status")

            if status == "done":
                video_url = status_json.get("result_url")
                print(f"[D-ID] Generation succeeded in {int(time.time() - start_time)}s!")
                break
            elif status == "error":
                err_msg = status_json.get("error", "Unknown D-ID generation failure")
                raise RuntimeError(f"D-ID generation failed: {err_msg}")

        if not video_url:
            raise TimeoutError("D-ID talking head generation timed out.")

        # 4. Download final MP4 to disk
        out_folder = output_dir or os.path.join(settings.TEMP_DIR, "did_clips")
        os.makedirs(out_folder, exist_ok=True)
        local_mp4_path = os.path.join(out_folder, f"did_{talk_id}.mp4")

        print(f"[D-ID] Downloading rendered talking video clip to {local_mp4_path}...")
        vid_res = requests.get(video_url, stream=True, timeout=90)
        with open(local_mp4_path, "wb") as f:
            for chunk in vid_res.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        return local_mp4_path

did_service = DIDService()

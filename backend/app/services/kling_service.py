import os
import time
import base64
import requests
import jwt
from typing import Optional, Dict, Any
from app.core.config import settings

class KlingService:
    BASE_URL = os.getenv("KLING_BASE_URL", "https://api.klingai.com").strip()

    def __init__(self):
        self.api_key = os.getenv("KLING_API_KEY", "").strip()
        self.access_key = os.getenv("KLING_ACCESS_KEY", "").strip()
        self.secret_key = os.getenv("KLING_SECRET_KEY", "").strip()

    def is_configured(self) -> bool:
        """Checks if Kling credentials are set in environment."""
        self.api_key = os.getenv("KLING_API_KEY", "").strip()
        self.access_key = os.getenv("KLING_ACCESS_KEY", "").strip()
        self.secret_key = os.getenv("KLING_SECRET_KEY", "").strip()
        return bool(self.api_key or (self.access_key and self.secret_key))

    def get_auth_headers(self) -> Dict[str, str]:
        """Returns Bearer header for single API Key or generated JWT for AK/SK pair."""
        self.api_key = os.getenv("KLING_API_KEY", "").strip()
        self.access_key = os.getenv("KLING_ACCESS_KEY", "").strip()
        self.secret_key = os.getenv("KLING_SECRET_KEY", "").strip()
        if self.api_key:
            token = self.api_key
        elif self.access_key and self.secret_key:
            token = self.generate_jwt_token()
        else:
            raise ValueError("Kling AI API key must be set in backend/.env")

        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def generate_jwt_token(self) -> str:
        """Generates a timed JWT authorization token for Kling AI API."""
        if not self.is_configured():
            raise ValueError("Kling AI Access Key and Secret Key must be set in backend/.env")

        headers = {
            "alg": "HS256",
            "typ": "JWT"
        }
        current_time = int(time.time())
        payload = {
            "iss": self.access_key,
            "exp": current_time + 1800,  # Valid for 30 minutes
            "nbf": current_time - 5      # Prevent clock skew
        }
        token = jwt.encode(payload, self.secret_key, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode("utf-8")
        return token

    def _prepare_image_payload(self, image_source: str) -> str:
        """Formats image either as public URL or Base64 data URI."""
        if image_source.startswith("http://") or image_source.startswith("https://"):
            return image_source

        if not os.path.exists(image_source):
            raise FileNotFoundError(f"Local image not found at: {image_source}")

        with open(image_source, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        
        # Detect mime type from extension
        ext = os.path.splitext(image_source)[1].lower()
        mime = "image/png" if ext == ".png" else "image/jpeg"
        return f"data:{mime};base64,{encoded}"

    def animate_image(
        self,
        image_source: str,
        motion_prompt: str,
        duration_sec: int = 5,
        mode: str = "std",
        output_dir: Optional[str] = None
    ) -> Optional[str]:
        """
        Sends an image + motion prompt to Kling AI (image2video) and downloads the rendered MP4.
        Returns the local filepath of the generated MP4.
        """
        if not self.is_configured():
            print("[KLING AI] Warning: KLING_ACCESS_KEY or KLING_SECRET_KEY not set in backend/.env")
            return None

        # 1. Format image
        image_data = self._prepare_image_payload(image_source)

        # 2. Submit task
        endpoint = f"{self.BASE_URL}/v1/videos/image2video"
        headers = self.get_auth_headers()

        dur_str = "10" if duration_sec >= 8 else "5"
        
        # Ensure facial expressions, eye blinking, and lifelike cues are present in prompt
        enhanced_prompt = motion_prompt
        lp = motion_prompt.lower()
        if not any(k in lp for k in ["blink", "expression", "facial", "smile", "talking", "lipsync", "mouth"]):
            enhanced_prompt = f"{motion_prompt}, highly expressive facial expressions, blinking eyes naturally, subtle smile, lively face animation"

        configured_model = os.getenv("KLING_MODEL_NAME", "kling-v1-6").strip()
        candidate_models = [
            configured_model,
            "kling-v1-6",
            "kling-v1-5",
            "kling-v2-1",
            "kling-2.6",
            "kling-3.0"
        ]
        # Deduplicate while preserving priority order
        models_to_try = []
        for m in candidate_models:
            if m and m not in models_to_try:
                models_to_try.append(m)

        task_id = None
        last_error = None

        for m_name in models_to_try:
            payload: Dict[str, Any] = {
                "model_name": m_name,
                "image": image_data,
                "prompt": enhanced_prompt,
                "duration": dur_str,
                "mode": mode,
                "cfg_scale": 0.5
            }

            print(f"[KLING AI] Submitting Image-to-Video task with model '{m_name}' for prompt: '{motion_prompt[:50]}...'")
            try:
                res = requests.post(endpoint, headers=headers, json=payload, timeout=60)
            except Exception as net_err:
                last_error = f"Network error submitting to Kling: {net_err}"
                continue

            if res.status_code == 200:
                res_json = res.json()
                if res_json.get("code") == 0:
                    task_id = res_json["data"]["task_id"]
                    print(f"[KLING AI] Task created successfully with '{m_name}'! Task ID: {task_id}")
                    break
                else:
                    code = res_json.get("code")
                    err_msg = res_json.get("message", str(res_json))
                    last_error = f"Kling error ({code}): {err_msg}"
                    print(f"[KLING AI] Model '{m_name}' returned error: {last_error}")
                    # If model discontinued or not supported, try next model candidate
                    if code == 1203 or "discontinued" in err_msg.lower() or "not available" in err_msg.lower() or "model" in err_msg.lower():
                        continue
                    else:
                        raise RuntimeError(last_error)
            else:
                last_error = f"Kling API returned HTTP {res.status_code}: {res.text}"
                print(f"[KLING AI] Model '{m_name}' failed with {res.status_code}: {res.text}")
                if "discontinued" in res.text.lower() or "1203" in res.text or "not available" in res.text.lower():
                    continue
                else:
                    raise RuntimeError(last_error)

        if not task_id:
            raise RuntimeError(f"Could not submit Kling task with any supported model. Last error: {last_error}")

        # 3. Poll for status
        status_endpoint = f"{self.BASE_URL}/v1/videos/image2video/{task_id}"
        poll_interval = 8
        max_wait = 900  # 15 minutes max
        start_time = time.time()

        video_url = None
        while time.time() - start_time < max_wait:
            time.sleep(poll_interval)
            headers = self.get_auth_headers()
            poll_res = requests.get(status_endpoint, headers=headers, timeout=30)
            
            if poll_res.status_code != 200:
                print(f"[KLING AI] Polling error HTTP {poll_res.status_code}, retrying...")
                continue

            poll_json = poll_res.json()
            data = poll_json.get("data", {})
            status = data.get("task_status")
            print(f"[KLING AI] Task {task_id} status: {status} ({int(time.time() - start_time)}s elapsed)")

            if status == "succeed":
                videos = data.get("task_result", {}).get("videos", [])
                if videos and len(videos) > 0:
                    video_url = videos[0].get("url")
                    break
                else:
                    raise RuntimeError("Kling reported success but returned no video URL.")
            elif status == "failed":
                err_msg = data.get("task_status_msg", "Unknown Kling rendering failure")
                raise RuntimeError(f"Kling video generation failed: {err_msg}")

        if not video_url:
            raise TimeoutError("Kling video generation timed out.")

        # 4. Download final MP4 to disk
        out_folder = output_dir or os.path.join(settings.BASE_DIR, "storage", "visual_cache", "kling_clips")
        os.makedirs(out_folder, exist_ok=True)
        local_mp4_path = os.path.join(out_folder, f"kling_{task_id}.mp4")

        print(f"[KLING AI] Downloading rendered video from: {video_url[:60]}...")
        vid_res = requests.get(video_url, stream=True, timeout=120)
        with open(local_mp4_path, "wb") as f:
            for chunk in vid_res.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        print(f"[KLING AI] Video successfully downloaded to: {local_mp4_path}")
        return local_mp4_path

kling_service = KlingService()

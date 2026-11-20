import os
import time
from typing import Optional
from app.core.config import settings

class FreeMotionService:
    """
    Free Cloud AI Motion Service:
    Manages free cloud character animation with zero-wait fallback to the
    high-speed 1080p Cinematic Motion Engine.
    """

    @classmethod
    def animate_character(cls, image_path: str, audio_path: str, output_path: str, timeout_sec: int = 20) -> Optional[str]:
        """
        Attempts free character animation when a cloud space is available,
        or falls back directly to the local 1080p Cinematic Motion Engine.
        """
        # If no custom HF Space endpoint is explicitly configured in .env,
        # pass directly to the high-quality 1080p Cinematic Camera Motion Engine
        hf_space = os.getenv("FREE_MOTION_HF_SPACE", "").strip()
        if not hf_space or not os.path.exists(image_path) or not os.path.exists(audio_path):
            return None

        try:
            from gradio_client import Client, handle_file
            print(f"[Free Motion] Attempting Cloud character animation on '{hf_space}' for: {os.path.basename(image_path)}...")
            client = Client(hf_space, download_files=settings.TEMP_DIR)
            result = client.predict(
                source_image=handle_file(image_path),
                driving_audio=handle_file(audio_path),
                api_name="/predict"
            )
            out_file = result if isinstance(result, str) else (result[0] if isinstance(result, (list, tuple)) else None)
            if out_file and os.path.exists(out_file) and os.path.getsize(out_file) > 10000:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                import shutil
                shutil.copyfile(out_file, output_path)
                return output_path
        except Exception as e:
            print(f"[Free Motion Notice] Notice: {e}. Switching to 1080p Cinematic Motion Engine.")

        return None

free_motion_service = FreeMotionService()

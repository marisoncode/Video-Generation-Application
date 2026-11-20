import os
import json
import re
import time
import subprocess
import imageio_ffmpeg
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.core.config import settings
from app.services.curriculum_service import curriculum_service
from app.services.tts_service import tts_service
from app.services.pipeline_service import pipeline_service
from app.services.kling_service import kling_service

app = FastAPI(
    title="AI Animated Explainer Video Studio",
    description="Full-stack AI studio to generate 1080p educational explainer videos.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_INPUT_JSON = os.path.join(settings.STORAGE_DIR, "project_input.json")

# Static mounts
app.mount("/static/outputs", StaticFiles(directory=settings.OUTPUTS_DIR), name="outputs")
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

# Schemas
class KlingConfigPayload(BaseModel):
    access_key: str
    secret_key: str

class CustomVideoPayload(BaseModel):
    title: Optional[str] = ""
    voice: Optional[str] = "Reference Voice Clone (100% Match)"
    scenes: Optional[List[Dict[str, Any]]] = []
    demonstration_scenes: Optional[List[Dict[str, Any]]] = None

# Endpoints
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Animated Explainer Video Studio",
        "version": "1.0.0"
    }

@app.get("/api/v1/voices")
def get_voices():
    """Returns only the two core, high-quality educator voices."""
    return [
        {
            "id": "Reference Voice Clone (100% Match)",
            "name": "Reference Voice Clone (100% Match)",
            "locale": "Warm Cloned Teacher",
            "gender": "Female"
        },
        {
            "id": "en-IN-NeerjaNeural",
            "name": "Indian English (Neerja)",
            "locale": "Studio Indian English",
            "gender": "Female"
        }
    ]

@app.get("/api/v1/kling/status")
def get_kling_status():
    """Returns whether Kling credentials are configured."""
    is_conf = kling_service.is_configured()
    ak = os.getenv("KLING_ACCESS_KEY", "").strip()
    masked = (ak[:4] + "..." + ak[-4:]) if len(ak) > 8 else ("Configured" if is_conf else "")
    return {
        "configured": is_conf,
        "access_key_preview": masked
    }

@app.post("/api/v1/kling/config")
def update_kling_config(payload: KlingConfigPayload):
    """Saves Kling API credentials into environment and .env file."""
    os.environ["KLING_ACCESS_KEY"] = payload.access_key.strip()
    os.environ["KLING_SECRET_KEY"] = payload.secret_key.strip()
    kling_service.access_key = payload.access_key.strip()
    kling_service.secret_key = payload.secret_key.strip()

    env_file = os.path.join(settings.BASE_DIR, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                content = f.read()
            content = re.sub(r'KLING_ACCESS_KEY=.*', f'KLING_ACCESS_KEY={payload.access_key.strip()}', content)
            content = re.sub(r'KLING_SECRET_KEY=.*', f'KLING_SECRET_KEY={payload.secret_key.strip()}', content)
            with open(env_file, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"Error persisting .env: {e}")

    return {"status": "ok", "configured": kling_service.is_configured()}

@app.get("/api/v1/custom/config")
def get_custom_config():
    """Loads current storyboard project input."""
    if os.path.exists(PROJECT_INPUT_JSON):
        try:
            with open(PROJECT_INPUT_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "scenes" not in data and "demonstration_scenes" in data:
                    data["scenes"] = data["demonstration_scenes"]
                return data
        except Exception:
            pass

    # Clean blank storyboard template
    return {
        "title": "",
        "voice": "Reference Voice Clone (100% Match)",
        "scenes": [
            {
                "scene_number": 1,
                "title": "Scene 1",
                "image_path": "",
                "preview_url": "",
                "motion_prompt": "",
                "narration": "",
                "subtitle": ""
            },
            {
                "scene_number": 2,
                "title": "Scene 2",
                "image_path": "",
                "preview_url": "",
                "motion_prompt": "",
                "narration": "",
                "subtitle": ""
            },
            {
                "scene_number": 3,
                "title": "Scene 3",
                "image_path": "",
                "preview_url": "",
                "motion_prompt": "",
                "narration": "",
                "subtitle": ""
            }
        ]
    }

@app.post("/api/v1/custom/config")
def save_custom_config(payload: CustomVideoPayload):
    """Saves updated project input to storage."""
    data = payload.model_dump()
    os.makedirs(os.path.dirname(PROJECT_INPUT_JSON), exist_ok=True)
    with open(PROJECT_INPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return {"status": "saved", "config": data}

@app.post("/api/v1/custom/upload-image")
async def upload_custom_image(file: UploadFile = File(...)):
    """Uploads an image directly from the browser into backend/storage/uploads/."""
    filename = file.filename or "image.jpg"
    safe_name = "".join(c for c in filename if c.isalnum() or c in "._- ")
    save_path = os.path.join(settings.UPLOADS_DIR, safe_name)
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "status": "uploaded",
        "filename": safe_name,
        "local_path": save_path,
        "preview_url": f"/static/uploads/{safe_name}"
    }

@app.post("/api/v1/custom/upload-voice")
async def upload_custom_voice(file: UploadFile = File(...)):
    """Uploads any voice audio file (MP3/WAV/M4A) and normalizes it for zero-shot cloning."""
    filename = file.filename or "my_voice.wav"
    safe_name = "".join(c for c in filename if c.isalnum() or c in "._- ")
    raw_path = os.path.join(settings.UPLOADS_DIR, f"raw_{safe_name}")
    with open(raw_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Normalize to 24000Hz mono PCM WAV for high fidelity cloning
    norm_filename = f"voice_ref_{int(time.time())}.wav"
    norm_path = os.path.join(settings.UPLOADS_DIR, norm_filename)
    try:
        ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg_bin, "-y", "-i", raw_path,
            "-ac", "1", "-ar", "24000",
            norm_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        target_path = norm_path
    except Exception as e:
        print(f"Error normalizing audio: {e}")
        target_path = raw_path

    voice_id = f"custom_voice:{target_path}"
    return {
        "status": "uploaded",
        "voice_id": voice_id,
        "voice_name": f"My Cloned Voice ({file.filename})",
        "preview_url": f"/static/uploads/{os.path.basename(target_path)}"
    }

@app.post("/api/v1/custom/generate")
def start_custom_video_generation(payload: CustomVideoPayload, background_tasks: BackgroundTasks):
    """Triggers custom storyboard video generation."""
    config_dict = payload.model_dump()
    job_id = pipeline_service.create_custom_job(config_dict)
    background_tasks.add_task(pipeline_service.run_custom_pipeline, job_id)
    scene_cnt = len(payload.scenes or payload.demonstration_scenes or [])
    return {
        "job_id": job_id,
        "status": "QUEUED",
        "message": f"Custom video job with {scene_cnt} scenes queued successfully.",
        "check_status_url": f"/api/v1/videos/status/{job_id}"
    }

@app.get("/api/v1/videos/status/{job_id}")
def check_job_status(job_id: str):
    """Polls live progress of generation job."""
    job = pipeline_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/v1/videos/download/{filename}")
def download_video(filename: str):
    """Streams or downloads rendered MP4 file."""
    file_path = os.path.join(settings.OUTPUTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)

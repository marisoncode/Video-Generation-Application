import os
import time
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings
from app.agents import (
    voice_agent,
    music_agent,
    video_agent
)
from app.services.video_service import video_service

# In-memory Job registry
JOBS: Dict[str, Dict[str, Any]] = {}

class PipelineService:
    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        return JOBS.get(job_id)

    @classmethod
    def create_custom_job(cls, custom_config: Dict[str, Any]) -> str:
        job_id = str(uuid.uuid4())[:8]
        JOBS[job_id] = {
            "job_id": job_id,
            "title": custom_config.get("title", ""),
            "voice": custom_config.get("voice", "Reference Voice Clone (100% Match)"),
            "background_music": custom_config.get("background_music", "inspiring_educational"),
            "design_style": custom_config.get("design_style", "pixar_3d"),
            "custom_config": custom_config,
            "status": "QUEUED",
            "progress_pct": 0,
            "step_message": "Production job queued with multi-agent pipeline...",
            "output_path": None,
            "download_url": None,
            "error": None
        }
        return job_id

    @classmethod
    def run_custom_pipeline(cls, job_id: str):
        job = JOBS.get(job_id)
        if not job:
            return

        try:
            custom_data = job.get("custom_config", {})
            voice = custom_data.get("voice", "Reference Voice Clone (100% Match)")
            music_track = custom_data.get("background_music", "inspiring_educational")

            # Get user storyboard scenes
            scenes = custom_data.get("scenes") or custom_data.get("demonstration_scenes") or []
            if not scenes:
                scenes = [
                    {
                        "scene_number": 1,
                        "title": "Scene 1",
                        "image_path": "",
                        "motion_prompt": "",
                        "narration": "Welcome to our video presentation.",
                        "subtitle": "Welcome to our video presentation."
                    }
                ]

            job["status"] = "PROCESSING"
            job["progress_pct"] = 10
            job["step_message"] = f"[DirectorAgent] Starting 1080p production for {len(scenes)} scenes..."

            work_dir = os.path.join(settings.TEMP_DIR, f"custom_{job_id}_{int(time.time())}")
            os.makedirs(work_dir, exist_ok=True)

            clips = []
            total_scenes = len(scenes)

            for idx, scene in enumerate(scenes):
                s_num = idx + 1
                s_title = scene.get("title") or f"Scene {s_num}"
                narration = scene.get("narration") or ""
                subtitle = scene.get("subtitle") or narration
                raw_img = scene.get("image_path") or scene.get("preview_url") or ""
                motion_prompt = scene.get("motion_prompt") or ""
                motion_style = scene.get("motion_style") or "zoom_in"

                progress_val = 15 + int((idx / total_scenes) * 70)
                job["progress_pct"] = progress_val
                job["step_message"] = f"[VoiceAgent & VideoAgent] Rendering Scene {s_num}/{total_scenes}: {s_title}..."

                # 1. VoiceAgent: Synthesizes Speech Narration
                raw_speech_path = os.path.join(work_dir, f"speech_raw_{s_num}.mp3")
                voice_agent.synthesize_speech(narration, raw_speech_path, voice=voice)

                # 2. MusicAgent: Mixes Background Music with Audio Ducking
                audio_path = os.path.join(work_dir, f"audio_{s_num}.mp3")
                music_agent.mix_and_duck(
                    voice_audio_path=raw_speech_path,
                    music_track_id=music_track,
                    output_audio_path=audio_path,
                    ducking_volume=0.12
                )

                # Resolve image path
                resolved_img = None
                if raw_img:
                    clean_name = os.path.basename(raw_img.replace("\\", "/"))
                    candidate = os.path.join(settings.UPLOADS_DIR, clean_name)
                    if os.path.isabs(raw_img) and os.path.exists(raw_img):
                        resolved_img = raw_img
                    elif os.path.exists(candidate):
                        resolved_img = candidate
                    elif os.path.exists(raw_img):
                        resolved_img = raw_img

                clip_path = os.path.join(work_dir, f"clip_{s_num}.mp4")

                # 3. VideoAgent: Produces Animated Video Clip with Subtitles
                clip_info = video_agent.animate_or_motion_clip(
                    image_path=resolved_img or "",
                    audio_path=audio_path,
                    motion_prompt=motion_prompt,
                    motion_style=motion_style,
                    subtitle_text=subtitle,
                    narration=narration,
                    output_clip_path=clip_path,
                    scene_title=s_title,
                    scene_index=idx
                )

                clips.append(clip_path)

            job["progress_pct"] = 90
            job["step_message"] = f"[VideoAgent] Assembling {total_scenes} scenes into 1080p Full HD MP4..."

            out_filename = f"video_{job_id}.mp4"
            final_out_path = os.path.join(settings.OUTPUTS_DIR, out_filename)
            video_agent.assemble_full_video(clips, final_out_path)

            job["status"] = "COMPLETED"
            job["progress_pct"] = 100
            job["step_message"] = f"Video complete! All {total_scenes} scenes produced with multi-agent orchestration, ducked music & synced subtitles."
            job["output_path"] = final_out_path
            job["output_filename"] = out_filename
            job["download_url"] = f"/api/v1/videos/download/{out_filename}"

        except Exception as e:
            job["status"] = "FAILED"
            job["error"] = str(e)
            job["step_message"] = f"Production failed: {str(e)}"

pipeline_service = PipelineService()

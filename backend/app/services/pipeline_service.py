import os
import time
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.tts_service import tts_service
from app.services.video_service import video_service
from app.services.kling_service import kling_service

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
            "custom_config": custom_config,
            "status": "QUEUED",
            "progress_pct": 0,
            "step_message": "Custom video job queued...",
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

            # Get user storyboard scenes
            scenes = custom_data.get("scenes") or custom_data.get("demonstration_scenes") or []
            if not scenes:
                scenes = [
                    {
                        "scene_number": 1,
                        "title": "Scene 1",
                        "image_path": "",
                        "motion_prompt": "",
                        "narration": "",
                        "subtitle": ""
                    }
                ]

            job["status"] = "PROCESSING"
            job["progress_pct"] = 10
            job["step_message"] = f"Starting video production for {len(scenes)} scenes..."

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
                prompt = scene.get("motion_prompt") or ""

                progress_val = 15 + int((idx / total_scenes) * 70)
                job["progress_pct"] = progress_val
                job["step_message"] = f"Processing Scene {s_num}/{total_scenes}: {s_title}..."

                # 1. Synthesize Audio Narration
                audio_path = os.path.join(work_dir, f"audio_{s_num}.mp3")
                tts_service.generate_speech(narration, audio_path, voice=voice)
                audio_dur = video_service.get_audio_duration(audio_path)
                clip_path = os.path.join(work_dir, f"clip_{s_num}.mp4")

                # Resolve image path (from absolute path, filename, or /static/uploads preview)
                resolved_img = None
                if raw_img:
                    clean_name = os.path.basename(raw_img)
                    candidate = os.path.join(settings.UPLOADS_DIR, clean_name)
                    if os.path.isabs(raw_img) and os.path.exists(raw_img):
                        resolved_img = raw_img
                    elif os.path.exists(candidate):
                        resolved_img = candidate
                    elif os.path.exists(raw_img):
                        resolved_img = raw_img

                # 2. Animate Image with Kling AI if image + prompt provided
                kling_clip = None
                if resolved_img and prompt and kling_service.is_configured():
                    try:
                        job["step_message"] = f"Kling AI animating Scene {s_num}/{total_scenes}..."
                        kling_clip = kling_service.animate_image(
                            image_source=resolved_img,
                            motion_prompt=prompt,
                            duration_sec=int(audio_dur)
                        )
                    except Exception as ex:
                        print(f"[Pipeline] Kling animation error on scene {s_num}: {ex}")
                        kling_clip = None

                # 3. Render final clip with synchronized audio & subtitles
                if kling_clip and os.path.exists(kling_clip):
                    video_service.render_motion_clip(kling_clip, audio_path, subtitle, clip_path, header_title=s_title, narration=narration)
                elif resolved_img and os.path.exists(resolved_img):
                    # Image available: render image clip with audio & subtitle
                    video_service.render_image_audio_clip(resolved_img, audio_path, subtitle, clip_path, narration=narration)
                else:
                    # Fallback slate clip with audio and subtitle
                    video_service.render_motion_clip("", audio_path, subtitle, clip_path, header_title=s_title, narration=narration)

                clips.append(clip_path)

            job["progress_pct"] = 90
            job["step_message"] = f"Assembling {total_scenes} scenes into final 1080p MP4..."

            out_filename = f"video_{job_id}.mp4"
            final_out_path = os.path.join(settings.OUTPUTS_DIR, out_filename)
            video_service.assemble_full_video(clips, final_out_path)

            job["status"] = "COMPLETED"
            job["progress_pct"] = 100
            job["step_message"] = f"Video complete! All {total_scenes} scenes assembled in 1080p Full HD."
            job["output_path"] = final_out_path
            job["output_filename"] = out_filename
            job["download_url"] = f"/api/v1/videos/download/{out_filename}"

        except Exception as e:
            job["status"] = "FAILED"
            job["error"] = str(e)
            job["step_message"] = f"Generation failed: {str(e)}"

pipeline_service = PipelineService()

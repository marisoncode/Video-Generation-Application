import os
import time
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.curriculum_service import curriculum_service
from app.services.tts_service import tts_service
from app.services.slide_service import slide_service
from app.services.video_service import video_service
from app.services.kling_service import kling_service

# In-memory Job registry
JOBS: Dict[str, Dict[str, Any]] = {}

class PipelineService:
    @classmethod
    def create_job(cls, day_key: str, voice: str = "en-IN-NeerjaNeural") -> str:
        job_id = str(uuid.uuid4())[:8]
        JOBS[job_id] = {
            "job_id": job_id,
            "day": day_key.upper(),
            "voice": voice,
            "status": "QUEUED",
            "progress_pct": 0,
            "step_message": "Job queued for video generation...",
            "output_path": None,
            "download_url": None,
            "error": None
        }
        return job_id

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        return JOBS.get(job_id)

    @classmethod
    def run_pipeline(cls, job_id: str):
        job = JOBS.get(job_id)
        if not job:
            return

        try:
            day_key = job["day"]
            voice = job["voice"]
            curriculum = curriculum_service.get_day(day_key)
            if not curriculum:
                job["status"] = "FAILED"
                job["error"] = f"Curriculum for {day_key} not found."
                return

            job["status"] = "PROCESSING"
            job["progress_pct"] = 10
            job["step_message"] = f"Parsing curriculum and preparing scenes for {day_key}..."

            # Create workspace temp dir
            work_dir = os.path.join(settings.TEMP_DIR, f"build_{job_id}_{int(time.time())}")
            os.makedirs(work_dir, exist_ok=True)

            clips = []
            scenes = curriculum.get("scenes", [])
            total_scenes = len(scenes)

            for idx, scene in enumerate(scenes):
                s_num = scene.get("scene_number", idx + 1)
                s_type = scene.get("type", "demonstration")
                narration = scene.get("narration", "")
                subtitle = scene.get("subtitle", "")
                title = scene.get("title", f"Activity {s_num}")
                target = scene.get("target", "Sensory Stimulation")

                progress_val = 15 + int((idx / total_scenes) * 65)
                job["progress_pct"] = progress_val
                job["step_message"] = f"Rendering Scene {s_num}/{total_scenes}: {s_type.replace('_', ' ').title()}..."

                # 1. Synthesize brand-new spoken voiceover for this exact scene
                audio_path = os.path.join(work_dir, f"audio_scene_{s_num}.mp3")
                tts_service.generate_speech(narration, audio_path, voice=voice)

                clip_path = os.path.join(work_dir, f"clip_scene_{s_num}.mp4")

                # 2. Render concept-specific visual graphics
                if s_type == "title_slide":
                    slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
                    slide_service.render_title_slide(
                        title=curriculum.get("title", ""),
                        day=day_key,
                        age_group=curriculum.get("age_group", "3 MONTHS - 1 YRS"),
                        output_path=slide_img
                    )
                    video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

                elif s_type == "programme_slide":
                    slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
                    slide_service.render_programme_slide(
                        day=day_key,
                        programme_text=curriculum.get("programme", ""),
                        output_path=slide_img
                    )
                    video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

                elif s_type in ["educator_intro", "presenter_intro"]:
                    # 3D RBIQ Educator Welcome Intro with new synchronized audio & clean masking banner
                    video_service.render_motion_clip("educator_intro", audio_path, subtitle, clip_path, header_title=f"{day_key} • Educator Introduction", narration=narration)

                elif s_type in ["activity_title", "activity_slide"]:
                    # Clean 2-line arena slide: Royal Blue Activity Title + Magenta Skill Focus
                    slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
                    slide_service.render_demo_card(title=title, target=target, description="", output_path=slide_img)
                    video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

                elif s_type == "demonstration":
                    # Authentic 3D Pixar motion video with active mother and baby movements!
                    # Map to visual_demo (Scene 5), scent_demo (Scene 7), or sound_demo (Scene 9)
                    if s_num == 5 or "visual" in title.lower() or "mirror" in title.lower():
                        demo_template = "visual_demo"
                    elif s_num == 7 or "scent" in title.lower() or "smell" in title.lower() or "aroma" in title.lower():
                        demo_template = "scent_demo"
                    elif s_num == 9 or "sound" in title.lower() or "laugh" in title.lower() or "clap" in title.lower() or "vowel" in title.lower() or "melody" in title.lower():
                        demo_template = "sound_demo"
                    else:
                        demo_template = "visual_demo"

                    video_service.render_motion_clip(demo_template, audio_path, subtitle, clip_path, header_title=title, narration=narration)

                elif s_type in ["presenter", "educator_outro", "presenter_outro"]:
                    # 100% Brand-new 3D Educator Conclusion scene speaking that day's Parent/LMS Guide!
                    video_service.render_motion_clip("educator_outro", audio_path, subtitle, clip_path, header_title=f"{day_key} • Parent & LMS Guide", narration=narration)

                clips.append(clip_path)

            # Final Assembly
            job["progress_pct"] = 85
            job["step_message"] = "Assembling full 1080p MP4 video with smooth transitions and audio mixing..."

            out_filename = f"explainer_{day_key.lower()}_{job_id}.mp4"
            final_out_path = os.path.join(settings.OUTPUTS_DIR, out_filename)
            video_service.assemble_full_video(clips, final_out_path)

            job["status"] = "COMPLETED"
            job["progress_pct"] = 100
            job["step_message"] = "Video generation complete! 1080p Full HD MP4 is ready."
            job["output_path"] = final_out_path
            job["output_filename"] = out_filename
            job["download_url"] = f"/api/v1/videos/download/{out_filename}"

        except Exception as e:
            job["status"] = "FAILED"
            job["error"] = str(e)
            job["step_message"] = f"Generation failed: {str(e)}"

    @classmethod
    def create_custom_job(cls, custom_config: Dict[str, Any]) -> str:
        job_id = str(uuid.uuid4())[:8]
        JOBS[job_id] = {
            "job_id": job_id,
            "day": custom_config.get("day", "DAY-5").upper(),
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
            title_text = custom_data.get("title") or "AI Video Production"
            voice = custom_data.get("voice", "Reference Voice Clone (100% Match)")

            # Get user storyboard scenes (pure 1:1 user scenes)
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
                img_path = scene.get("image_path") or ""
                prompt = scene.get("motion_prompt") or ""

                progress_val = 15 + int((idx / total_scenes) * 70)
                job["progress_pct"] = progress_val
                job["step_message"] = f"Processing Scene {s_num}/{total_scenes}: {s_title}..."

                # 1. Synthesize Audio Narration
                audio_path = os.path.join(work_dir, f"audio_{s_num}.mp3")
                tts_service.generate_speech(narration, audio_path, voice=voice)
                audio_dur = video_service.get_audio_duration(audio_path)
                clip_path = os.path.join(work_dir, f"clip_{s_num}.mp4")

                # Resolve image path
                resolved_img = None
                if img_path:
                    if os.path.isabs(img_path) and os.path.exists(img_path):
                        resolved_img = img_path
                    else:
                        candidate = os.path.join(settings.UPLOADS_DIR, os.path.basename(img_path))
                        if os.path.exists(candidate):
                            resolved_img = candidate
                        elif os.path.exists(img_path):
                            resolved_img = img_path

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
                    # Fallback template
                    fallback_tmpls = ["visual_demo", "scent_demo", "sound_demo"]
                    tmpl = fallback_tmpls[idx % len(fallback_tmpls)]
                    video_service.render_motion_clip(tmpl, audio_path, subtitle, clip_path, header_title=s_title, narration=narration)

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

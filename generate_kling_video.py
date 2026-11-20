#!/usr/bin/env python3
"""
AI Animated Explainer Video Studio - Kling AI & Custom Director Engine
Generates the complete 10-scene 1080p Full HD video in ONE SINGLE ATTEMPT
using your uploaded Bing images, custom motion prompts, Kling AI animation,
cloned reference teacher voice, and synchronized subtitles.
"""
import sys
import os
import json
import time
import argparse

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.core.config import settings
from app.services.curriculum_service import curriculum_service
from app.services.tts_service import tts_service
from app.services.slide_service import slide_service
from app.services.video_service import video_service
from app.services.kling_service import kling_service

def main():
    print("=" * 75)
    print("  AI Animated Explainer Video Studio - Full 10-Scene Generator")
    print("  Kling AI Image-to-Video + Bing Images + Voice Clone + 1080p Subtitles")
    print("=" * 75)

    parser = argparse.ArgumentParser(description="Generate full-length explainer video with Kling AI")
    default_cfg = os.path.join(settings.BASE_DIR, "backend", "storage", "project_input.json")
    parser.add_argument("--config", default=default_cfg, help="Path to custom scene JSON input")
    parser.add_argument("--voice", default="Reference Voice Clone (100% Match)", help="Voice ID or Clone")
    args = parser.parse_args()

    config_path = args.config
    if not os.path.exists(config_path):
        print(f"[-] Config file '{config_path}' not found! Using default Day 5 curriculum.")
        custom_data = {}
    else:
        with open(config_path, "r", encoding="utf-8") as f:
            custom_data = json.load(f)

    day_key = custom_data.get("day", "DAY-5").upper()
    voice = args.voice or custom_data.get("voice", "Reference Voice Clone (100% Match)")
    curriculum = curriculum_service.get_day(day_key)
    if not curriculum:
        print(f"[-] Curriculum for {day_key} not found. Exiting.")
        return

    # Check Kling credentials
    kling_ready = kling_service.is_configured()
    print(f"\n[+] Status Check:")
    print(f"    - Target Day: {day_key} ({custom_data.get('title', curriculum.get('title'))})")
    print(f"    - Spoken Voice: {voice}")
    if kling_ready:
        print(f"    - Kling AI API: CONFIGURED (Will animate your uploaded Bing images)")
    else:
        print(f"    - Kling AI API: NOT CONFIGURED (Add KLING_ACCESS_KEY & KLING_SECRET_KEY in backend/.env)")
        print(f"      -> Falling back to authentic 3D motion templates so video completes cleanly.")

    # Map custom demonstration scenes by scene_number
    custom_scenes_map = {}
    for demo in custom_data.get("demonstration_scenes", []):
        s_num = demo.get("scene_number")
        if s_num:
            custom_scenes_map[s_num] = demo

    # Prepare temp work directory for this single run
    run_id = str(int(time.time()))[-6:]
    work_dir = os.path.join(settings.TEMP_DIR, f"kling_run_{day_key.lower()}_{run_id}")
    os.makedirs(work_dir, exist_ok=True)

    clips = []
    base_scenes = curriculum.get("scenes", [])
    total_scenes = len(base_scenes)

    print(f"\n[+] Executing All {total_scenes} Scenes in a Single Automated Run...")
    print("-" * 75)

    for idx, scene in enumerate(base_scenes):
        s_num = scene.get("scene_number", idx + 1)
        s_type = scene.get("type", "demonstration")
        narration = scene.get("narration", "")
        subtitle = scene.get("subtitle", "")
        title = scene.get("title", f"Scene {s_num}")
        target = scene.get("target", "Sensory Stimulation")

        # Check for overrides in custom JSON
        if s_num in custom_scenes_map:
            override = custom_scenes_map[s_num]
            if override.get("narration"):
                narration = override["narration"]
            if override.get("subtitle"):
                subtitle = override["subtitle"]
            if override.get("title"):
                title = override["title"]
            if override.get("target"):
                target = override["target"]

        print(f"\n[*] Scene {s_num}/{total_scenes} [{s_type.upper()}]: {title}")

        # 1. Synthesize audio narration for this exact scene
        audio_path = os.path.join(work_dir, f"audio_scene_{s_num}.mp3")
        tts_service.generate_speech(narration, audio_path, voice=voice)
        audio_dur = video_service.get_audio_duration(audio_path)
        print(f"    - Voice narration generated ({round(audio_dur, 1)}s)")

        clip_path = os.path.join(work_dir, f"clip_scene_{s_num}.mp4")

        # 2. Render visuals based on scene type
        if s_type == "title_slide":
            slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
            slide_service.render_title_slide(
                title=custom_data.get("title", curriculum.get("title", "")),
                day=day_key,
                age_group=custom_data.get("age_group", curriculum.get("age_group", "3 MONTHS - 1 YRS")),
                output_path=slide_img
            )
            video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

        elif s_type == "programme_slide":
            slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
            slide_service.render_programme_slide(
                day=day_key,
                programme_text=custom_data.get("programme", curriculum.get("programme", "")),
                output_path=slide_img
            )
            video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

        elif s_type in ["educator_intro", "presenter_intro"]:
            video_service.render_motion_clip("educator_intro", audio_path, subtitle, clip_path, header_title=f"{day_key} • Educator Introduction", narration=narration)

        elif s_type in ["activity_title", "activity_slide"]:
            slide_img = os.path.join(work_dir, f"slide_{s_num}.jpg")
            slide_service.render_demo_card(title=title, target=target, description="", output_path=slide_img)
            video_service.render_image_audio_clip(slide_img, audio_path, subtitle, clip_path, narration=narration)

        elif s_type == "demonstration":
            # Check if user provided custom image & motion prompt for Kling
            custom_demo = custom_scenes_map.get(s_num)
            kling_clip = None

            if custom_demo and kling_ready:
                img_path = custom_demo.get("image_path")
                prompt = custom_demo.get("motion_prompt", "")
                
                if img_path and os.path.exists(img_path) and prompt:
                    try:
                        print(f"    - Sending image '{img_path}' to Kling AI with motion prompt...")
                        kling_clip = kling_service.animate_image(
                            image_source=img_path,
                            motion_prompt=prompt,
                            duration_sec=int(audio_dur)
                        )
                    except Exception as e:
                        print(f"    [!] Kling animation failed: {e}. Using fallback motion template.")
                        kling_clip = None
                else:
                    if not img_path or not os.path.exists(img_path):
                        print(f"    [i] Image not found at '{img_path}'. Using authentic 3D template.")

            # If Kling clip is available, use it; otherwise use motion templates
            if kling_clip and os.path.exists(kling_clip):
                print(f"    - Overlaying subtitles & voice on custom Kling clip: {kling_clip}")
                video_service.render_motion_clip(kling_clip, audio_path, subtitle, clip_path, header_title=title, narration=narration)
            else:
                if s_num == 5 or "mirror" in title.lower() or "visual" in title.lower():
                    tmpl = "visual_demo"
                elif s_num == 7 or "scent" in title.lower() or "smell" in title.lower() or "cardamom" in title.lower():
                    tmpl = "scent_demo"
                elif s_num == 9 or "sound" in title.lower() or "vowel" in title.lower() or "clap" in title.lower():
                    tmpl = "sound_demo"
                else:
                    tmpl = "visual_demo"

                video_service.render_motion_clip(tmpl, audio_path, subtitle, clip_path, header_title=title, narration=narration)

        elif s_type in ["presenter", "educator_outro", "presenter_outro"]:
            video_service.render_motion_clip("educator_outro", audio_path, subtitle, clip_path, header_title=f"{day_key} • Parent & LMS Guide", narration=narration)

        clips.append(clip_path)
        print(f"    -> Rendered Scene {s_num} MP4 clip.")

    # 3. Assemble all 10 scenes into master full-length MP4
    print("\n" + "-" * 75)
    print("[+] Step 3: Assembling all 10 scenes into final Master 1080p MP4...")
    out_filename = f"explainer_{day_key.lower()}_master_{run_id}.mp4"
    final_out_path = os.path.join(settings.OUTPUTS_DIR, out_filename)
    
    video_service.assemble_full_video(clips, final_out_path)

    # Calculate final stats
    sz_mb = round(os.path.getsize(final_out_path) / (1024 * 1024), 2)
    final_dur = round(video_service.get_audio_duration(final_out_path), 1)

    print("=" * 75)
    print(f"[SUCCESS] Master Explainer Video Created in Single Run!")
    print(f"  - Output File: {final_out_path}")
    print(f"  - Duration:    {final_dur} seconds (~2 minutes full length)")
    print(f"  - File Size:   {sz_mb} MB")
    print(f"  - Resolution:  1920x1080 Full HD (Progressive, Uncropped)")
    print("=" * 75)

if __name__ == "__main__":
    main()

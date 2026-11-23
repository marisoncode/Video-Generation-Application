import os
import time
import json
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.agents.script_agent import script_agent
from app.agents.design_agent import design_agent
from app.agents.image_agent import image_agent
from app.agents.voice_agent import voice_agent
from app.agents.music_agent import music_agent
from app.agents.video_agent import video_agent

PROJECT_INPUT_JSON = os.path.join(settings.STORAGE_DIR, "project_input.json")

class DirectorAgent:
    """
    Master Production Director Agent:
    Orchestrates the entire AI video generation pipeline by delegating tasks to:
      1. ScriptAgent   -> Ingests PDF/Script/Prompt, segments scenes & narration
      2. DesignAgent   -> Applies visual art styles, character design, environment
      3. ImageAgent    -> Renders 16:9 images using FLUX cloud/fallback
      4. VoiceAgent    -> Manages reference audio uploads, cloning, and Edge-TTS synthesis
      5. MusicAgent    -> Curates ambient music and applies audio ducking
      6. VideoAgent    -> Handles character facial animation, camera motion, and 1080p assembly
    """

    def create_autonomous_storyboard(
        self,
        input_mode: str,
        topic_prompt: Optional[str] = None,
        script_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        design_style: str = "pixar_3d",
        custom_character: Optional[str] = None,
        custom_environment: Optional[str] = None,
        custom_design_prompt: Optional[str] = None,
        voice: str = "Reference Voice Clone (100% Match)",
        background_music: str = "inspiring_educational"
    ) -> Dict[str, Any]:
        """
        Stage 1: Autonomous creation flow up to the interactive approval board.
        """
        print(f"[DirectorAgent] Starting creation with style='{design_style}'...")

        # 1. Script Agent handles text/document processing
        script_output = script_agent.process_input(
            input_mode=input_mode,
            topic_prompt=topic_prompt,
            script_text=script_text,
            file_bytes=file_bytes,
            filename=filename
        )
        raw_scenes = script_output["scenes"]
        project_title = script_output["title"]

        # 2. Design Agent infuses visual art direction and character prompts
        designed_scenes = design_agent.design_scenes(
            scenes=raw_scenes,
            style_id=design_style,
            custom_character=custom_character,
            custom_environment=custom_environment,
            custom_design_prompt=custom_design_prompt
        )

        # 3. Image Agent renders 16:9 visuals
        scenes_with_images = image_agent.generate_storyboard_images(designed_scenes)

        # 4. Save to project_input.json for persistent state
        project_config = {
            "title": project_title,
            "voice": voice,
            "background_music": background_music,
            "design_style": design_style,
            "custom_character": custom_character or "",
            "custom_environment": custom_environment or "",
            "scenes": scenes_with_images
        }
        try:
            with open(PROJECT_INPUT_JSON, "w", encoding="utf-8") as f:
                json.dump(project_config, f, indent=2)
        except Exception as e:
            print(f"[DirectorAgent] Error persisting project_input.json: {e}")

        return project_config

    def regenerate_scene_visual(self, scene_index: int, custom_prompt: str) -> Dict[str, Any]:
        """Delegates image regeneration to ImageAgent."""
        img_res = image_agent.regenerate_scene_image(scene_index, custom_prompt)

        # Update in project_input.json
        if os.path.exists(PROJECT_INPUT_JSON):
            try:
                with open(PROJECT_INPUT_JSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for s in data.get("scenes", []):
                    if s.get("scene_number") == scene_index:
                        s["image_path"] = img_res["local_path"]
                        s["preview_url"] = img_res["preview_url"]
                        s["image_prompt"] = custom_prompt
                        s["image_provider"] = img_res["provider"]
                with open(PROJECT_INPUT_JSON, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
            except Exception as e:
                print(f"[DirectorAgent] Error updating project_input.json: {e}")

        return img_res

director_agent = DirectorAgent()

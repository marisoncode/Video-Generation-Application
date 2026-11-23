from typing import List, Dict, Any, Optional

class DesignAgent:
    """
    Dedicated Visual & Design Agent:
    Specializes in visual art direction, character consistency, and scene aesthetic framing.
    Translates script concepts and user design inputs into structured, high-detail prompts for AI rendering.
    """

    STYLE_PRESETS = {
        "pixar_3d": {
            "name": "3D Pixar / Disney 3D",
            "anchor": (
                "3D Pixar style character, cute friendly teacher Leo with expressive brown eyes and warm smile, "
                "wearing a navy blue vest and rolled-up sleeves, Disney Pixar animated aesthetic, "
                "vibrant cinematic studio lighting, Octane render 8K, highly detailed"
            ),
            "render_suffix": "Disney Pixar animation style, 16:9 widescreen composition, 8k render"
        },
        "cinematic_realistic": {
            "name": "Cinematic Realistic Film",
            "anchor": (
                "Photorealistic professional educator, realistic natural human features, warm friendly demeanor, "
                "dressed in smart casual attire, shot on 35mm Arri Alexa lens, cinematic depth of field, natural softbox lighting"
            ),
            "render_suffix": "hyperrealistic 8k resolution, cinematic color grading, photorealistic, 16:9"
        },
        "anime_ghibli": {
            "name": "Japanese Anime (Studio Ghibli)",
            "anchor": (
                "Studio Ghibli inspired anime aesthetic, charming expressive animated character, "
                "hand-drawn animation lines, Makoto Shinkai vibrant sky and lighting, lush painted textures"
            ),
            "render_suffix": "Japanese animation masterpiece, vibrant anime aesthetic, 16:9 widescreen, trending on ArtStation"
        },
        "claymation": {
            "name": "Claymation & Stop-Motion",
            "anchor": (
                "Handcrafted claymation character, tactile clay surface textures, charming sculpted details, "
                "miniature physical tabletop set, Aardman style stop-motion aesthetic"
            ),
            "render_suffix": "physical clay sculpture, stop-motion animation frame, warm tactile lighting, 16:9"
        },
        "storybook_watercolor": {
            "name": "Vintage Watercolor Storybook",
            "anchor": (
                "Classic children's storybook illustration, whimsical soft watercolor washes, delicate ink line art, "
                "gentle pastel color palette, Beatrix Potter inspired artistic aesthetic"
            ),
            "render_suffix": "watercolor and ink illustration, storybook art, high resolution, 16:9"
        },
        "cyberpunk_scifi": {
            "name": "Futuristic Sci-Fi & Cyberpunk",
            "anchor": (
                "Futuristic cybernetic science character, sleek augmented jumpsuit with subtle luminescent circuitry, "
                "state-of-the-art holographic interface, volumetric blue and amber lighting"
            ),
            "render_suffix": "sci-fi concept art, Octane render, volumetric atmosphere, 16:9 widescreen"
        }
    }

    def get_available_styles(self) -> List[Dict[str, str]]:
        """Returns the list of selectable visual design styles."""
        return [
            {"id": key, "name": val["name"]}
            for key, val in self.STYLE_PRESETS.items()
        ]

    def design_scenes(
        self,
        scenes: List[Dict[str, Any]],
        style_id: str = "pixar_3d",
        custom_character: Optional[str] = None,
        custom_environment: Optional[str] = None,
        custom_design_prompt: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Takes raw scenes from the ScriptAgent and infuses them with consistent visual prompts,
        motion prompts, and camera movements conforming to the user's design input.
        """
        style = self.STYLE_PRESETS.get(style_id, self.STYLE_PRESETS["pixar_3d"])
        
        # Base character definition
        if custom_character and custom_character.strip():
            char_anchor = f"{custom_character.strip()}, {style['name']} aesthetic"
        else:
            char_anchor = style["anchor"]

        auto_motions = ["zoom_in", "pan_right", "zoom_out", "pan_left"]

        designed_scenes = []
        for idx, s in enumerate(scenes):
            s_num = s.get("scene_number", idx + 1)
            narration = s.get("narration", "")
            concept = s.get("concept_summary", narration[:100])

            # Determine contextual environment setting
            setting = self._infer_environment(concept, custom_environment)

            # Build full 16:9 image prompt
            prompt_parts = [char_anchor]
            if custom_design_prompt and custom_design_prompt.strip():
                prompt_parts.append(custom_design_prompt.strip())
            prompt_parts.append(f"in a {setting}")
            prompt_parts.append(f"presenting Scene {s_num}: {concept[:80]}")
            prompt_parts.append(style["render_suffix"])

            full_image_prompt = ", ".join(prompt_parts)

            # Build facial motion prompt for character animation
            facial_motion = (
                "Warm friendly smile, direct eye contact with camera, natural eye blinking, "
                "gentle nodding head motion, expressive facial animation, lively gestures"
            )

            s["image_prompt"] = full_image_prompt
            s["motion_prompt"] = facial_motion
            s["motion_style"] = auto_motions[idx % len(auto_motions)]
            s["design_style"] = style_id

            designed_scenes.append(s)

        return designed_scenes

    def _infer_environment(self, concept_text: str, custom_env: Optional[str] = None) -> str:
        """Determines setting based on user custom environment or educational concept."""
        if custom_env and custom_env.strip():
            return custom_env.strip()

        snippet = concept_text.lower()
        if any(k in snippet for k in ["sun", "plant", "photosynthesis", "leaf", "chloroplast", "nature"]):
            return "glowing greenhouse laboratory observing vibrant plant cells under sunlight"
        elif any(k in snippet for k in ["space", "planet", "orbit", "solar", "star", "galaxy"]):
            return "futuristic astronomy planetarium with floating 3D planetary orbits"
        elif any(k in snippet for k in ["cell", "body", "heart", "dna", "micro", "biology"]):
            return "high-tech microscopic science lab with floating transparent holographic molecules"
        elif any(k in snippet for k in ["math", "formula", "physics", "code", "ai", "computer"]):
            return "sleek creative mathematics studio with glowing geometric floating projections"
        elif any(k in snippet for k in ["history", "ancient", "civilization", "pyramid", "book"]):
            return "grand historic library filled with antique globes and warm illuminated scrolls"
        else:
            return "modern vibrant educational studio with interactive holographic displays"

design_agent = DesignAgent()

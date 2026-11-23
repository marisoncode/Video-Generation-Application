import re
from typing import List, Dict, Any, Optional

class DesignAgent:
    """
    Dedicated Visual & Design Agent:
    Specializes in visual art direction, character consistency, and scene aesthetic framing.
    Translates script concepts and user design inputs into structured, high-detail prompts for AI rendering.
    Dynamically infers characters, environments, visual actions, and facial motions from narration and script context.
    """

    STYLE_PRESETS = {
        "pixar_3d": {
            "name": "3D Pixar / Disney 3D",
            "aesthetic": "3D Disney Pixar animated film aesthetic, soft expressive subsurface scattering, vibrant warm studio lighting, Octane render 8K",
            "render_suffix": "Disney Pixar animation style, highly detailed 3D render, 16:9 widescreen composition, cinematic depth of field, 8k render"
        },
        "cinematic_realistic": {
            "name": "Cinematic Realistic Film",
            "aesthetic": "Photorealistic cinematic film still, realistic natural human features, shot on 35mm Arri Alexa lens, cinematic depth of field, natural softbox lighting",
            "render_suffix": "hyperrealistic 8k resolution, cinematic color grading, photorealistic film still, 16:9 widescreen composition"
        },
        "anime_ghibli": {
            "name": "Japanese Anime (Studio Ghibli)",
            "aesthetic": "Studio Ghibli inspired anime aesthetic, hand-drawn animation lines, Makoto Shinkai vibrant sky and lighting, lush painted textures",
            "render_suffix": "Japanese animation masterpiece, vibrant anime aesthetic, trending on ArtStation, 16:9 widescreen"
        },
        "claymation": {
            "name": "Claymation & Stop-Motion",
            "aesthetic": "Handcrafted claymation character, tactile clay surface textures, charming sculpted details, miniature physical tabletop set, Aardman style stop-motion aesthetic",
            "render_suffix": "physical clay sculpture, stop-motion animation frame, warm tactile lighting, 16:9 widescreen"
        },
        "storybook_watercolor": {
            "name": "Vintage Watercolor Storybook",
            "aesthetic": "Classic children's storybook illustration, whimsical soft watercolor washes, delicate ink line art, gentle pastel color palette, Beatrix Potter inspired",
            "render_suffix": "watercolor and ink illustration, vintage storybook art, high resolution, 16:9 widescreen"
        },
        "cyberpunk_scifi": {
            "name": "Futuristic Sci-Fi & Cyberpunk",
            "aesthetic": "Futuristic sci-fi concept art, sleek augmented details, volumetric blue and amber lighting, state-of-the-art holographic interface",
            "render_suffix": "futuristic sci-fi concept art, Octane render, volumetric atmosphere, 16:9 widescreen"
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
        Takes raw scenes from ScriptAgent and crafts contextually accurate visual prompts,
        motion prompts, and camera movements conforming to the script's actual topic.
        """
        style = self.STYLE_PRESETS.get(style_id, self.STYLE_PRESETS["pixar_3d"])
        auto_motions = ["zoom_in", "pan_right", "zoom_out", "pan_left"]

        designed_scenes = []
        for idx, s in enumerate(scenes):
            s_num = s.get("scene_number", idx + 1)
            narration = s.get("narration", "")
            concept = s.get("concept_summary", narration[:120])

            # Dynamically infer character, setting, action, and motion from scene context
            char, setting, visual_action, facial_motion = self._infer_scene_elements(
                narration=narration,
                concept=concept,
                custom_char=custom_character,
                custom_env=custom_environment
            )

            # If Groq provided bespoke visual action or facial motion, prioritize it!
            groq_action = s.get("visual_action")
            groq_motion = s.get("facial_motion")
            if groq_action and len(groq_action.strip()) > 8:
                visual_action = groq_action.strip()
            if groq_motion and len(groq_motion.strip()) > 5:
                facial_motion = groq_motion.strip()

            # Build full 16:9 image prompt
            prompt_parts = []
            
            # Character & Aesthetic Anchor
            prompt_parts.append(f"{char}, {style['aesthetic']}")
            
            # Setting / Environment
            prompt_parts.append(f"in a {setting}")
            
            # Visual Action & Scene Topic
            prompt_parts.append(f"showing {visual_action}")

            # User custom design prompt if provided
            if custom_design_prompt and custom_design_prompt.strip():
                prompt_parts.append(custom_design_prompt.strip())

            # Style Render Suffix
            prompt_parts.append(style["render_suffix"])

            full_image_prompt = ", ".join(prompt_parts)

            s["image_prompt"] = full_image_prompt
            s["motion_prompt"] = facial_motion
            s["motion_style"] = auto_motions[idx % len(auto_motions)]
            s["design_style"] = style_id

            designed_scenes.append(s)

        return designed_scenes

    def _clean_script_text(self, text: str) -> str:
        """Removes LMS, pedagogical guide headers, and formatting artifacts."""
        cleaned = re.sub(r'(?i)(Parent/LMS guide|LMS guide|Teacher guide|Guide|Targeted development|Safety|Step \d+)[:\-]', '', text)
        cleaned = re.sub(r'\[.*?\]|\(.*?\)', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def _infer_scene_elements(
        self,
        narration: str,
        concept: str,
        custom_char: Optional[str] = None,
        custom_env: Optional[str] = None
    ) -> tuple[str, str, str, str]:
        """
        Analyzes the scene's content to determine:
          1. Character (e.g. mother and baby, pirate, chef, scientist, cute puppy)
          2. Environment setting (e.g. cozy nursery with floor mirror, island beach, kitchen, lab)
          3. Visual action (what is physically happening in the 16:9 frame)
          4. Facial motion prompt (natural blinking, expressions, smile, gestures)
        """
        combined = f"{concept} {narration}".lower()
        cleaned_text = self._clean_script_text(concept if len(concept) > 20 else narration)

        # 1. Baby / Infant / Toddler / Sensory Play
        if any(k in combined for k in ["baby", "infant", "toddler", "mirror play", "baby mirror", "caregiver", "sensory", "nursery", "parent"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Loving caring mother and an adorable happy 8-month-old baby with big curious bright eyes and rosy cheeks"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "warm sunlit cozy nursery playroom, soft pastel playmat, baby-safe floor mirror reflecting the baby"
            )
            action = "the happy baby looking curiously into the floor mirror at their reflection, smiling and clapping small hands delightedly with mother"
            motion = (
                "Baby smiling delightfully with open-mouthed joy, natural eye blinking, gentle curious head tilting, "
                "clapping small hands, mother smiling warmly with affectionate eye contact"
            )
            return char, setting, action, motion

        # 2. Puppy / Dog / Pets / Wildlife / Animals
        if any(k in combined for k in ["puppy", "dog", "bark", "barking", "kitten", "cat", "pet", "animal", "lion", "bear", "bird", "rabbit"]):
            animal_name = "golden retriever puppy"
            for a in ["puppy", "dog", "kitten", "cat", "rabbit", "bear", "lion", "elephant", "bird", "fox"]:
                if a in combined:
                    animal_name = a
                    break
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                f"Cute fluffy {animal_name} with shiny expressive dark eyes and friendly energetic posture"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "vibrant sunny green park with blooming wildflowers, soft golden morning light and lush grass"
            )
            action = f"the playful {animal_name} trotting forward happily, tilting its head with lively curious expression"
            motion = "Playful head tilt, shiny blinking eyes, cheerful open-mouth panting or barking motion, lively energetic movement"
            return char, setting, action, motion

        # 3. Pirate / Treasure Island / Adventure
        if any(k in combined for k in ["pirate", "treasure", "ship", "ocean", "island", "sea", "captain", "sword"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Charismatic expressive pirate with weathered tricorn hat, rustic adventurer coat, and deeply emotive eyes"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "windswept tropical treasure island beach with turquoise waves, palm trees, and an open rustic wooden chest on white sand"
            )
            action = "the pirate kneeling beside an ancient glowing treasure chest, showing heartfelt emotion and wonder"
            motion = "Deeply expressive emotive facial animation, natural eye blinking, subtle head movement, authentic gesturing"
            return char, setting, action, motion

        # 4. Cooking / Baking / Kitchen / Chef
        if any(k in combined for k in ["cook", "chef", "recipe", "kitchen", "baking", "bake", "cake", "food", "dish", "meal", "ingredient"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Cheerful passionate chef in crisp white chef jacket and apron with friendly warm smile"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "bright modern rustic kitchen with warm wooden shelves, marble countertop, and fresh colorful ingredients"
            )
            action = "the chef demonstrating culinary preparation with fresh ingredients and welcoming enthusiasm"
            motion = "Warm welcoming smile, direct eye contact with camera, expressive nodding, natural eye blinking, engaging hand gestures"
            return char, setting, action, motion

        # 5. Space / Astronomy / Planet / Gravity / Universe
        if any(k in combined for k in ["space", "planet", "orbit", "solar", "star", "galaxy", "gravity", "universe", "astronaut", "cosmos"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Curious enthusiastic astronomer in modern explorer jumpsuit with expressive bright eyes"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "futuristic astronomy observatory planetarium with floating luminous 3D planetary orbits and nebula projections"
            )
            action = "exploring floating luminous planetary models and gravitational cosmic orbits"
            motion = "Awe-inspired wide smile, expressive blinking eyes, enthusiastic pointing and engaging presentation gestures"
            return char, setting, action, motion

        # 6. Biology / Cells / DNA / Plants / Photosynthesis
        if any(k in combined for k in ["plant", "photosynthesis", "leaf", "chloroplast", "cell", "dna", "microscope", "biology", "molecule"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Curious nature researcher in casual field jacket with warm friendly demeanor and magnifying glass"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "glowing botanical greenhouse laboratory surrounded by vibrant living plant leaves absorbing golden sunlight"
            )
            action = "observing living plant structures and transparent 3D holographic cellular models"
            motion = "Curious warm smile, engaged eye contact, gentle inquisitive head nod, natural blinking"
            return char, setting, action, motion

        # 7. Science / Physics / Chemistry / Discovery
        if any(k in combined for k in ["science", "scientist", "physics", "chemistry", "experiment", "laboratory", "lab"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Enthusiastic curious scientist in clean modern lab attire with stylish glasses and engaging warm smile"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "high-tech modern science laboratory with glowing interactive holographic diagrams and clean ambient lighting"
            )
            action = "demonstrating an exciting scientific principle with interactive glowing models"
            motion = "Enthusiastic warm smile, direct eye contact with camera, natural eye blinking, lively demonstrative gestures"
            return char, setting, action, motion

        # 8. Doctor / Healthcare / Medicine / Clinic
        if any(k in combined for k in ["doctor", "nurse", "hospital", "clinic", "health", "medicine", "patient"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Compassionate healthcare professional in clean modern scrubs with stethoscope and comforting warm smile"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "contemporary bright wellness clinic with calm natural lighting and soothing decor"
            )
            action = "providing reassuring health and wellness guidance with genuine empathy"
            motion = "Comforting gentle smile, reassuring eye contact, attentive nodding, natural blinking"
            return char, setting, action, motion

        # 9. Teacher / School / Academic Explainer
        if any(k in combined for k in ["teacher", "student", "classroom", "school", "lesson", "grade", "lecture", "teach"]):
            char = (
                custom_char.strip() if custom_char and custom_char.strip() else
                "Friendly charismatic educator with warm expressive smile and engaging presence"
            )
            setting = (
                custom_env.strip() if custom_env and custom_env.strip() else
                "vibrant modern interactive learning studio with colorful educational visuals and warm ambient lighting"
            )
            action = "presenting the key educational concept with welcoming clarity"
            motion = "Warm friendly smile, direct engaging eye contact, natural blinking, expressive head nods"
            return char, setting, action, motion

        # 10. General / Custom Fallback
        char = (
            custom_char.strip() if custom_char and custom_char.strip() else
            "Expressive friendly character with warm natural facial features and engaging smile"
        )
        setting = (
            custom_env.strip() if custom_env and custom_env.strip() else
            "beautifully lit atmospheric studio setting matching the theme with soft depth of field"
        )
        action_summary = cleaned_text[:80] if cleaned_text else "the main concept"
        action = f"engaging with {action_summary}"
        motion = "Warm friendly smile, direct eye contact with camera, natural eye blinking, gentle nodding motion, lively gestures"
        return char, setting, action, motion

design_agent = DesignAgent()

import os
import sys
from google import genai
from google.genai import types
from dotenv import load_dotenv
import mimetypes

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
    MODEL_NAME = 'gemini-3.1-flash-lite'
else:
    client = None

def check_content(text, media_paths=None):

    if not text and not media_paths:
        return False, None

    if client:
        try:
            prompt = (
                "You are a professional content moderator for a sports social media platform, following community guidelines similar to major platforms like Instagram or Facebook.\n"
                "Balance freedom of expression with user safety. Allow general venting or frustration, but flag content if it crosses into these specific violations:\n"
                "1. Cyberbullying & Harassment: Targeted attacks, calling specific individuals 'stupid' or other insulting names, hostiles mockings, or telling them to 'go home' or give up. This includes Singlish/Manglish insults and hostile put-downs.\n"
                "2. Hate Speech & Discrimination: Slurs, dehumanizing language, or severe expressions of hatred against groups or individuals.\n"
                "3. Self-Harm & Suicide: Any credible mention of wanting to die, self-injury, or suicidal ideation.\n"
                "4. Violence & Threats: Credible physical threats, incitement of violence, or glorification of violence.\n"
                "5. 18+ Adult Content: Sexual explicitness, nudity, or inappropriate adult themes.\n"
                "6. Spam: Obvious phishing or malicious links.\n\n"
                "Note on Regional Dialects:\n"
                "- The user base frequently uses Singlish/Manglish (South East Asian colloquial English) terms. Understand terms like 'sibeh' (extremely/very), 'sia' (emphasis particle), 'dk' (don't know), 'somore' (some more), 'go home sleep la' (go home and sleep / get lost), and 'walau eh' (expression of annoyance/shock).\n"
                "- Targeted insults using these terms (e.g., calling someone 'sibeh stupid' or telling them to 'go home sleep la') must be flagged under Cyberbullying & Harassment, and NOT excused as harmless venting.\n\n"
                "If the content is safe, just venting, or everyday banter, respond ONLY with 'SAFE'.\n"
                "If it clearly violates a rule, respond with 'FLAGGED: [A brief reason why]'."
            )

            contents = [prompt]
            if text:
                contents.append(f"User's text: {text}")

            if media_paths:
                for path in media_paths:
                    if os.path.exists(path):
                        mime_type, _ = mimetypes.guess_type(path)
                        with open(path, "rb") as f:
                            file_data = f.read()
                            contents.append(
                                types.Part.from_bytes(
                                    data=file_data,
                                    mime_type=mime_type or 'application/octet-stream'
                                )
                            )


            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents
            )
            
            # Debug the raw response
            if not response.candidates or not response.text:
                return True, "Content was blocked by AI safety filters."

            result = response.text.strip()
   
            if result.startswith("FLAGGED"):
                reason = result.replace("FLAGGED:", "").strip()
                return True, reason
                
            return False, None
            
        except Exception as e:
            print(f"GenAI SDK Moderation Error: {e}", file=sys.stderr, flush=True)
            return False, None

    return False, None


def check_hashtags(hashtags):
    import json
    if not hashtags:
        return []
    if client:
        try:
            prompt = (
                "You are a professional content moderator for a sports social media platform.\n"
                "Review the following list of hashtags and identify any that violate community guidelines (cyberbullying, harassment, targeted insults, hate speech, self-harm, sexual content, slurs, or violence).\n"
                "Understand regional South East Asian (Singlish/Manglish) insults and slurs.\n\n"
                "Respond ONLY with a JSON array of the violating hashtags (lowercase, e.g., [\"badword1\", \"badword2\"]).\n"
                "If none violate the rules, respond with []."
            )
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt, f"Hashtags: {json.dumps(hashtags)}"]
            )
            result = response.text.strip()
            # Clean up markdown formatting if the model outputs code blocks
            if result.startswith("```"):
                result = result.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
                if result.startswith("json"):
                    result = result[4:].strip()
            violating = json.loads(result)
            return [v.lower() for v in violating] if isinstance(violating, list) else []
        except Exception as e:
            print(f"GenAI Hashtag Moderation Error: {e}", file=sys.stderr, flush=True)
            return []
    return []



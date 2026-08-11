import re
import os
import asyncio
import warnings
from concurrent.futures import ThreadPoolExecutor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

_executor = ThreadPoolExecutor(max_workers=4)

# ── Load guardrails ONCE at startup ───────────────────────────────────────────
print("[Guardrails] Loading ToxicLanguage model...")
try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from guardrails import Guard
        from guardrails.hub import ToxicLanguage
        _input_guard = Guard().use(
            ToxicLanguage(threshold=0.5, validation_method="sentence", on_fail="exception")
        )
        _output_guard = Guard().use(
            ToxicLanguage(threshold=0.5, validation_method="sentence", on_fail="exception")
        )
    print("[Guardrails] ToxicLanguage model loaded ✓")
    GUARDRAILS_READY = True
except Exception as e:
    print(f"[Guardrails] Failed to load: {e}")
    GUARDRAILS_READY = False
    _input_guard  = None
    _output_guard = None

# ── Smalltalk ─────────────────────────────────────────────────────────────────
GREETINGS = [
    'hi','hii','hiii','hey','hello','helo','heya','howdy','sup','yo',
    'good morning','good evening','good night','good afternoon',
    'how are you','how r u','how are u',"how's it going",
    'ok','okay','cool','got it','alright',
]
THANKS = ['thank you','thanks','ty','thx','thank u','thanks a lot','thank you so much']
BYES   = ['bye','goodbye','see you','cya']

def is_greeting(question: str) -> bool:
    q = question.strip().lower().rstrip('!?.')
    return q in GREETINGS or q in THANKS or q in BYES

# ── Jailbreak / prompt injection ONLY ────────────────────────────────────────
# Only patterns that are 100% never policy questions
# Off-topic detection (coding, languages etc.) is handled by Groq classifier
# in chat_controller.js — no need for regex here
INJECTION_PATTERNS = [
    r'\bignore\s+(previous|prior|above|all)\s+instructions\b',
    r'\bjailbreak\b',
    r'\bforget\s+(your|all|previous)\s+(rules|instructions|guidelines)\b',
    r'\bpretend\s+(to\s+be|you\s+are)\b',
    r'\bsuppose\s+you\s+are\b',
    r'\bdan\s+mode\b',
    r'\byou\s+are\s+now\s+(a|an)\b',
]

def is_injection(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in INJECTION_PATTERNS)

# ── Toxic check ───────────────────────────────────────────────────────────────
def _sync_toxic_check(question: str) -> bool:
    if not GUARDRAILS_READY:
        return True
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _input_guard.validate(question)
        return True
    except Exception:
        return False

async def is_toxic(question: str) -> bool:
    loop = asyncio.get_running_loop()
    is_clean = await loop.run_in_executor(_executor, _sync_toxic_check, question)
    return not is_clean

# ── validate_input ────────────────────────────────────────────────────────────
async def validate_input(question: str) -> dict:

    # 1. Smalltalk → allow instantly (0ms)
    if is_greeting(question):
        return {"valid": True, "message": ""}

    # 2. Jailbreak → block instantly (0ms)
    if is_injection(question):
        return {
            "valid": False,
            "message": "I can only assist with company policy-related questions."
        }

    # 3. Toxic check (~50ms)
    toxic = await is_toxic(question)
    if toxic:
        return {
            "valid": False,
            "message": "Please keep your question respectful and professional."
        }

    # 4. Everything else → ALLOW
    # Off-topic detection handled by Groq classifier in chat_controller.js
    return {"valid": True, "message": ""}

# ── validate_output ───────────────────────────────────────────────────────────
def validate_output(answer: str) -> dict:
    if not GUARDRAILS_READY:
        return {"valid": True, "message": answer}
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _output_guard.validate(answer)
        return {"valid": True, "message": answer}
    except Exception:
        return {"valid": False, "message": "Response blocked due to policy violation."}
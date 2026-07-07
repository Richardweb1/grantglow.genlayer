# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class GrantGlow(gl.Contract):
    latest_result_code: u64
    latest_priority_code: u64
    latest_program_name: str
    latest_source_url: str
    latest_deadline: str
    latest_eligibility: str
    latest_reasoning: str
    history_log: str
    check_count: u64
    open_count: u64
    closed_count: u64
    unclear_count: u64
    high_priority_count: u64

    RESULT_OPEN = 1
    RESULT_CLOSED = 2
    RESULT_UNCLEAR = 3
    PRIORITY_LOW = 1
    PRIORITY_MEDIUM = 2
    PRIORITY_HIGH = 3

    def __init__(self):
        self.latest_result_code = 0
        self.latest_priority_code = 0
        self.latest_program_name = ""
        self.latest_source_url = ""
        self.latest_deadline = ""
        self.latest_eligibility = ""
        self.latest_reasoning = ""
        self.history_log = ""
        self.check_count = 0
        self.open_count = 0
        self.closed_count = 0
        self.unclear_count = 0
        self.high_priority_count = 0

    def _result_name(self, code: u64) -> str:
        if code == self.RESULT_OPEN:
            return "OPEN"
        if code == self.RESULT_CLOSED:
            return "CLOSED"
        if code == self.RESULT_UNCLEAR:
            return "UNCLEAR"
        return "IDLE"

    def _priority_name(self, code: u64) -> str:
        if code == self.PRIORITY_HIGH:
            return "HIGH"
        if code == self.PRIORITY_MEDIUM:
            return "MEDIUM"
        if code == self.PRIORITY_LOW:
            return "LOW"
        return "IDLE"

    def _validate_inputs(self, source_url: str, program_name: str):
        if len(source_url) < 12 or len(source_url) > 300:
            raise gl.UserError("Source URL must contain 12 to 300 characters")
        if not source_url.startswith("https://"):
            raise gl.UserError("Source URL must start with https://")
        if " " in source_url or "\n" in source_url or "\r" in source_url:
            raise gl.UserError("Source URL contains invalid whitespace")
        if len(program_name.strip()) < 2 or len(program_name.strip()) > 80:
            raise gl.UserError("Program name must contain 2 to 80 characters")

    @gl.public.write
    def check_grant(self, source_url: str, program_name: str):
        self.review_grant(source_url, program_name, "general applicant")

    @gl.public.write
    def review_grant(self, source_url: str, program_name: str, applicant_profile: str):
        self._validate_inputs(source_url, program_name)
        clean_name = program_name.strip()
        clean_profile = applicant_profile.strip()[:280]
        if len(clean_profile) < 3:
            clean_profile = "general applicant"

        def judge_live_source() -> dict:
            response = gl.nondet.web.get(source_url)
            evidence = response.body.decode("utf-8")[:12000]
            prompt = f"""
You are GrantGlow, an autonomous public-funding analyst.
Use ONLY the fetched evidence below. Do not use training knowledge or outside facts.
Program: {clean_name}
Applicant profile: {clean_profile}

Analyze the funding page as a project workflow, not a simple label.
Allowed verdicts:
- OPEN: explicit evidence that applications are currently accepted.
- CLOSED: explicit evidence that applications are closed, ended, paused, or the deadline passed.
- UNCLEAR: evidence is missing, conflicting, generic, or has no clear current application status.

Priority:
- HIGH: open and urgent, time-sensitive, or strong applicant fit.
- MEDIUM: open but not urgent, or promising but needs more review.
- LOW: closed, unclear, generic, or weak fit.

Return strict JSON with exactly:
{{"verdict":"OPEN|CLOSED|UNCLEAR","deadline":"specific deadline or UNKNOWN","eligibility":"short applicant-fit note","priority":"HIGH|MEDIUM|LOW","reasoning":"evidence-based reason, maximum 500 characters"}}
Evidence:
<evidence>{evidence}</evidence>
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raise gl.UserError("AI response was not a JSON object")
            verdict = str(raw.get("verdict", "")).strip().upper()
            priority = str(raw.get("priority", "")).strip().upper()
            deadline = str(raw.get("deadline", "UNKNOWN")).strip()[:120]
            eligibility = str(raw.get("eligibility", "")).strip()[:300]
            reasoning = str(raw.get("reasoning", "")).strip()[:400]
            if verdict == "OPEN":
                code = 1
            elif verdict == "CLOSED":
                code = 2
            else:
                code = 3
                verdict = "UNCLEAR"
            if priority == "HIGH":
                priority_code = 3
            elif priority == "MEDIUM":
                priority_code = 2
            else:
                priority_code = 1
                priority = "LOW"
            if len(deadline) == 0:
                deadline = "UNKNOWN"
            if len(eligibility) == 0:
                eligibility = "No eligibility signal found in the fetched evidence."
            if len(reasoning) == 0:
                reasoning = "The live evidence did not provide a usable explanation."
            return {
                "code": code,
                "verdict": verdict,
                "deadline": deadline,
                "eligibility": eligibility,
                "priority_code": priority_code,
                "priority": priority,
                "reasoning": reasoning,
            }

        def validate_judgment(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_result = judge_live_source()
            leader_data = leader_result.calldata
            return (
                isinstance(leader_data, dict)
                and leader_data.get("code") in (1, 2, 3)
                and leader_data.get("code") == validator_result.get("code")
                and leader_data.get("priority_code") in (1, 2, 3)
                and leader_data.get("priority_code") == validator_result.get("priority_code")
            )

        result = gl.vm.run_nondet_unsafe(judge_live_source, validate_judgment)
        self.latest_result_code = int(result["code"])
        self.latest_priority_code = int(result["priority_code"])
        self.latest_program_name = clean_name
        self.latest_source_url = source_url
        self.latest_deadline = str(result["deadline"])[:120]
        self.latest_eligibility = str(result["eligibility"])[:300]
        self.latest_reasoning = str(result["reasoning"])[:400]
        self.check_count += 1
        if self.latest_result_code == self.RESULT_OPEN:
            self.open_count += 1
        elif self.latest_result_code == self.RESULT_CLOSED:
            self.closed_count += 1
        else:
            self.unclear_count += 1
        if self.latest_priority_code == self.PRIORITY_HIGH:
            self.high_priority_count += 1

        entry = json.dumps({
            "id": self.check_count,
            "verdict": self._result_name(self.latest_result_code),
            "priority": self._priority_name(self.latest_priority_code),
            "program": self.latest_program_name,
            "deadline": self.latest_deadline,
            "url": self.latest_source_url,
        }, separators=(",", ":"))
        if len(self.history_log) == 0:
            self.history_log = entry
        else:
            self.history_log = (self.history_log + "\n" + entry)[-5000:]

    @gl.public.view
    def get_latest_result(self) -> str:
        return json.dumps({
            "code": self.latest_result_code,
            "verdict": self._result_name(self.latest_result_code),
            "priority_code": self.latest_priority_code,
            "priority": self._priority_name(self.latest_priority_code),
            "program": self.latest_program_name,
            "url": self.latest_source_url,
            "deadline": self.latest_deadline,
            "eligibility": self.latest_eligibility,
            "reasoning": self.latest_reasoning,
        }, separators=(",", ":"))

    @gl.public.view
    def get_dashboard(self) -> str:
        return json.dumps({
            "total": self.check_count,
            "open": self.open_count,
            "closed": self.closed_count,
            "unclear": self.unclear_count,
            "high_priority": self.high_priority_count,
            "latest_verdict": self._result_name(self.latest_result_code),
            "latest_priority": self._priority_name(self.latest_priority_code),
            "history": self.history_log,
        }, separators=(",", ":"))

    @gl.public.view
    def get_count(self) -> u64:
        return self.check_count

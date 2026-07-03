# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class GrantGlow(gl.Contract):
    latest_result_code: u64
    latest_program_name: str
    latest_source_url: str
    latest_reasoning: str
    check_count: u64

    RESULT_OPEN = 1
    RESULT_CLOSED = 2
    RESULT_UNCLEAR = 3

    def __init__(self):
        self.latest_result_code = 0
        self.latest_program_name = ""
        self.latest_source_url = ""
        self.latest_reasoning = ""
        self.check_count = 0

    def _result_name(self, code: u64) -> str:
        if code == self.RESULT_OPEN:
            return "OPEN"
        if code == self.RESULT_CLOSED:
            return "CLOSED"
        if code == self.RESULT_UNCLEAR:
            return "UNCLEAR"
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
        self._validate_inputs(source_url, program_name)
        clean_name = program_name.strip()

        def judge_live_source() -> dict:
            response = gl.nondet.web.get(source_url)
            evidence = response.body.decode("utf-8")[:8000]
            prompt = f"""
You classify whether a grant or funding program currently accepts applications.
Use ONLY the fetched evidence below. Do not use training knowledge or outside facts.
Program: {clean_name}
Allowed verdicts:
- OPEN: explicit evidence that applications are currently accepted.
- CLOSED: explicit evidence that applications are closed, ended, paused, or the deadline passed.
- UNCLEAR: evidence is missing, conflicting, generic, or has no clear current application status.
Return strict JSON with exactly: {{"verdict":"OPEN|CLOSED|UNCLEAR","reasoning":"evidence-based reason, maximum 400 characters"}}.
Evidence:
<evidence>{evidence}</evidence>
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw, dict):
                raise gl.UserError("AI response was not a JSON object")
            verdict = str(raw.get("verdict", "")).strip().upper()
            reasoning = str(raw.get("reasoning", "")).strip()[:400]
            if verdict == "OPEN":
                code = 1
            elif verdict == "CLOSED":
                code = 2
            else:
                code = 3
                verdict = "UNCLEAR"
            if len(reasoning) == 0:
                reasoning = "The live evidence did not provide a usable explanation."
            return {"code": code, "verdict": verdict, "reasoning": reasoning}

        def validate_judgment(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_result = judge_live_source()
            leader_data = leader_result.calldata
            return (
                isinstance(leader_data, dict)
                and leader_data.get("code") in (1, 2, 3)
                and leader_data.get("code") == validator_result.get("code")
            )

        result = gl.vm.run_nondet_unsafe(judge_live_source, validate_judgment)
        self.latest_result_code = int(result["code"])
        self.latest_program_name = clean_name
        self.latest_source_url = source_url
        self.latest_reasoning = str(result["reasoning"])[:400]
        self.check_count += 1

    @gl.public.view
    def get_latest_result(self) -> str:
        return json.dumps({
            "code": self.latest_result_code,
            "verdict": self._result_name(self.latest_result_code),
            "program": self.latest_program_name,
            "url": self.latest_source_url,
            "reasoning": self.latest_reasoning,
        }, separators=(",", ":"))

    @gl.public.view
    def get_count(self) -> u64:
        return self.check_count

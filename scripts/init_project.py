#!/usr/bin/env python3
"""Initialise project.yaml from a reusable profile using only the standard library."""
from __future__ import annotations
import argparse, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROFILES=ROOT/'profiles'

def choose(prompt, options):
    print(prompt)
    for i,o in enumerate(options,1): print(f"  {i}. {o}")
    while True:
        raw=input("> ").strip()
        if raw.isdigit() and 1<=int(raw)<=len(options): return options[int(raw)-1]

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--profile'); ap.add_argument('--name'); a=ap.parse_args()
    names=sorted(p.stem for p in PROFILES.glob('*.json'))
    profile=a.profile or choose('Project profile:', names)
    if profile not in names: raise SystemExit(f"Unknown profile {profile}; choose from {', '.join(names)}")
    name=a.name or input('Project name: ').strip() or 'my-project'
    data=json.loads((PROFILES/f'{profile}.json').read_text())
    agents=set(data['agents'])
    yaml=f"""project:\n  name: {name}\n  profile: {profile}\n\nstack:\n  frontend: {data['frontend']}\n  backend: {data['backend']}\n  data: {data['data']}\n  cloud: {data['cloud']}\n  ai: {data['ai']}\n  containers: targeted_if_justified\n\nagents:\n  frontend: {str('frontend' in agents).lower()}\n  accessibility: {str('accessibility' in agents).lower()}\n  backend: {str('backend' in agents).lower()}\n  ai: {str('ai' in agents).lower()}\n  ai_evals: {str('ai_evals' in agents).lower()}\n  devops_cloud: false\n  data: {str('data' in agents).lower()}\n  mobile: {str('mobile' in agents).lower()}\n\nquality:\n  lint: required\n  typecheck: as_applicable\n  unit_tests: required\n  integration_tests: as_applicable\n  bdd: required_for_business_flows\n  e2e: required_for_critical_user_flows\n  accessibility: {data['a11y']}\n  security_review: required_for_sensitive_changes\n  ai_evals: {'required_for_ai_behaviour' if data['ai'] != 'disabled' else 'not-applicable'}\n\nautonomy:\n  default_mode: assisted\n  max_nested_depth: 3\n  max_implementation_iterations: 8\n  max_remediation_cycles: 5\n  max_same_failure_repetitions: 2\n  max_parallel_writers: 3\n  require_worktrees_for_parallel_writes: true\n\ndelivery:\n  autonomous_commit: false\n  autonomous_push: false\n  autonomous_merge: false\n  autonomous_deploy: false\n"""
    (ROOT/'project.yaml').write_text(yaml)
    print(f"Initialised project.yaml for {name} using profile {profile}.")
    print("Next: complete PROJECT.md, review agents/quality gates, and create your first task.")
if __name__=='__main__': main()

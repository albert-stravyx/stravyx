#!/usr/bin/env python3
from __future__ import annotations
import argparse, fnmatch, json, os, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
POLICY=ROOT/'PROJECT_POLICY.json'

def run(*args):
    p=subprocess.run(args,cwd=ROOT,text=True,capture_output=True)
    return p.stdout.strip() if p.returncode==0 else ''

def tracked():
    out=run('git','ls-files')
    return [x for x in out.splitlines() if x]

def changed(base=None):
    if base:
        out=run('git','diff','--name-only',f'{base}...HEAD')
        if out:return [x for x in out.splitlines() if x]
    out=run('git','diff','--name-only','HEAD~1','HEAD')
    return [x for x in out.splitlines() if x]

def matches(path,glob):
    # fnmatch handles ** adequately for our slash-normalized repository paths.
    return fnmatch.fnmatch(path,glob) or (glob.endswith('/**') and path.startswith(glob[:-3]))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--base');a=ap.parse_args()
    if not POLICY.exists():
        print('ERROR: PROJECT_POLICY.json is missing');return 2
    policy=json.loads(POLICY.read_text())
    errors=[];warnings=[]
    required=list(dict.fromkeys(policy.get('required_project_files',[])+policy.get('required_artifacts',[])))
    for f in required:
        if not (ROOT/f).exists():errors.append(f'Missing required project-governance file: {f}')
    files=tracked()
    allowed=policy.get('allowed_tracked_globs',[])
    for f in files:
        if any(matches(f,g) for g in allowed):
            continue
        for g in policy.get('forbidden_tracked_globs',[]):
            if matches(f,g):errors.append(f'Forbidden/local factory artifact is tracked: {f} (matches {g})');break
    ch=changed(a.base or os.getenv('GOVERNANCE_BASE_SHA'))
    arch=policy.get('architecture',{})
    sensitive=[f for f in ch if any(matches(f,g) for g in arch.get('sensitive_globs',[]))]
    adrdir=arch.get('adr_directory','docs/adr').rstrip('/')+'/'
    adr=[f for f in ch if f.startswith(adrdir)]
    if sensitive and arch.get('require_adr_for_sensitive_change',False) and not adr:
        errors.append('Architecture-sensitive files changed without an ADR. Changed: '+', '.join(sensitive[:8]))
    mig=policy.get('database',{})
    migration_files=[f for f in ch if any(matches(f,g) for g in mig.get('migration_globs',[]))]
    for f in migration_files:
        p=ROOT/f
        if p.exists() and p.is_file():
            txt=p.read_text(errors='ignore').upper()
            found=[k for k in mig.get('destructive_keywords',[]) if k in txt]
            if found:warnings.append(f'Potential destructive migration in {f}: {", ".join(found)}. Treat as {mig.get("destructive_change_severity","R4")} and obtain required approval/review.')
    print('PROJECT GOVERNANCE CHECK')
    print('─'*56)
    print('Changed files:',len(ch))
    for w in warnings:print('WARNING:',w)
    for e in errors:print('ERROR:',e)
    if errors:
        print(f'RESULT: FAIL ({len(errors)} blocking issue(s), {len(warnings)} warning(s))');return 1
    print(f'RESULT: PASS ({len(warnings)} warning(s))');return 0

if __name__=='__main__':sys.exit(main())

import os
import re

tables = ["candidates", "resumes", "project_context", "evaluations", "attempts", "case_studies"]

for root, dirs, files in os.walk("."):
    if "venv" in root or "__pycache__" in root:
        continue
    for f in files:
        if f.endswith(".py") and f != "scratch_rename.py":
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
            
            new_content = content
            for table in tables:
                # Replace whole words. We only replace when they follow TABLE, INTO, FROM, UPDATE, ALTER TABLE, etc.
                # To be safe and aggressive (since this is a small backend), let's replace \b(candidates)\b inside SQL queries.
                # Actually, simpler: replace all word instances of the tables except in specific contexts, but since they are quite unique names in this codebase, we can replace \btablename\b where it's part of a string (since SQL queries are strings).
                
                # A safer approach for this specific codebase since we know exactly where these are used:
                # We can just replace the raw table names.
                new_content = re.sub(rf"\b{table}\b", f"AIPrepTool_{table}", new_content)
                
            if new_content != content:
                with open(path, "w", encoding="utf-8") as file:
                    file.write(new_content)
                print(f"Updated {path}")

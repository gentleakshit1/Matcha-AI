import os
import re

dirs_to_check = [
    r"d:\brocodeAkshit\SummerInternSignity\matcha\matcha_frontend\src\pages",
    r"d:\brocodeAkshit\SummerInternSignity\matcha\matcha_frontend\src\components"
]

def replace_url(content):
    content = re.sub(r"'http://127\.0\.0\.1:8000/api/([^']*)'", r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/\1`", content)
    content = re.sub(r"`http://127\.0\.0\.1:8000/api/([^`]*)`", r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/\1`", content)
    content = re.sub(r"'http://localhost:8000/api/([^']*)'", r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/\1`", content)
    content = re.sub(r"`http://localhost:8000/api/([^`]*)`", r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/\1`", content)
    return content

for d in dirs_to_check:
    for filename in os.listdir(d):
        if filename.endswith(".jsx"):
            filepath = os.path.join(d, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = replace_url(content)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

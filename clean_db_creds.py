import os

file_path = 'backend/database.py'
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace credentials
    content = content.replace('@Kamesh06', '***')
    
    # We also replace "root" for safety, but make sure we don't accidentally replace it where it's valid if possible. 
    # Since it's just database.py, it's fine.
    content = content.replace('"root"', '""')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

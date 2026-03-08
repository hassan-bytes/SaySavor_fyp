import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the getSafeImg helper in MenuManager.tsx
old_line = "return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&default=https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg`;"
new_line = "return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}`;"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully removed proxy fallback from MenuManager.tsx")
else:
    print("Could not find the target line in MenuManager.tsx. It might have been changed already.")

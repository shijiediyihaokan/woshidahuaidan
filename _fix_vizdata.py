import sys

FILE = 'E:/ggn-gear-site/public/admin/js/admin-products.js'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Patch 1: buildFrontmatter - add vizData JSON storage
# The JS source line is: fm += 'order: ' + o + '\npublished: true\n---\n';
# In the file, \n is literal backslash-n (two chars: 0x5C 0x6E)
old1 = "    fm += 'order: ' + o + '\\npublished: true\\n---\\n';"
new1 = (
    "    fm += 'order: ' + o + '\\n';\n"
    "\n"
    "    /* Store vizData modules as JSON for edit restore */\n"
    "    if (typeof __vizData !== 'undefined' && __vizData.length) {\n"
    "      fm += 'vizData: ' + JSON.stringify(__vizData) + '\\n';\n"
    "    }\n"
    "\n"
    "    fm += 'published: true\\n---\\n';"
)

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print('Patch 1 OK (buildFrontmatter)')
else:
    print('Patch 1 FAIL')
    idx = content.find("fm += 'order: ' + o + '")
    if idx >= 0:
        # Show the exact bytes
        chunk = content[idx-4:idx+60]
        print(f'  file:  {repr(chunk)}')
        print(f'  old1:  {repr(old1)}')
        # Compare byte by byte
        for i in range(min(len(chunk), len(old1))):
            if chunk[i] != old1[i]:
                print(f'  diff at {i}: file={repr(chunk[i])} ({hex(ord(chunk[i]))}) old1={repr(old1[i])} ({hex(ord(old1[i]))})')
                break

# Patch 2: parseFrontmatter - extract vizData after gallery
old2 = "    }\n\n    return prod;"
gallery_idx = content.find("galleryMatch")
if gallery_idx > 0:
    idx = content.find(old2, gallery_idx)
    if idx > 0 and idx < gallery_idx + 500:
        new2 = (
            "    }\n"
            "\n"
            "    /* vizData: JSON array for detail page module restore */\n"
            "    var vizMatch = fm.match(/vizData:\\s*(\\[[\\s\\S]*?\\])\\s*\\n/);\n"
            "    if (vizMatch) {\n"
            "      prod.vizData = vizMatch[1].trim();\n"
            "    }\n"
            "\n"
            "    return prod;"
        )
        content = content[:idx] + new2 + content[idx+len(old2):]
        changes += 1
        print('Patch 2 OK (parseFrontmatter)')
    else:
        print(f'Patch 2 FAIL - idx={idx} (gallery_idx={gallery_idx})')
else:
    print('Patch 2 FAIL - galleryMatch not found')

# Patch 3: editProduct - restore vizData
old3 = "    document.getElementById('pOrder').value = p.order || 0;\n\n    /* Set edit state */"
new3 = (
    "    document.getElementById('pOrder').value = p.order || 0;\n"
    "\n"
    "    /* Restore detail page modules from vizData */\n"
    "    if (typeof __vizData !== 'undefined') {\n"
    "      __vizData.length = 0;\n"
    "      if (p.vizData) {\n"
    "        try {\n"
    "          var vizParsed = JSON.parse(p.vizData);\n"
    "          if (Array.isArray(vizParsed)) {\n"
    "            vizParsed.forEach(function(m) { __vizData.push(m); });\n"
    "          }\n"
    "        } catch(e) { console.warn('vizData parse error:', e); }\n"
    "      }\n"
    "      if (window.AdminEditor && window.AdminEditor.renderAll) {\n"
    "        window.AdminEditor.renderAll();\n"
    "      }\n"
    "    }\n"
    "\n"
    "    /* Set edit state */"
)

if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print('Patch 3 OK (editProduct)')
else:
    print('Patch 3 FAIL')
    # Try finding nearby
    idx = content.find('pOrder')
    if idx > 0:
        print(f'  pOrder at {idx}: {repr(content[idx:idx+80])}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone: {changes}/3 patches applied')
sys.exit(0 if changes == 3 else 1)

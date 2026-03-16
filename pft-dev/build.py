import os
import re

def build():
    base_dir = r"c:\Users\soumy\.antigravity\pft-dev"
    out_file = r"c:\Users\soumy\.antigravity\PersonalFinanceTracker.html"

    with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # Read CSS
    with open(os.path.join(base_dir, "css", "style.css"), "r", encoding="utf-8") as f:
        css = f.read()

    # Read JS modules in order
    js_files = ["store.js", "parser.js", "budget.js", "habits.js", "reports.js", "splitwise.js", "nudge.js", "ui.js", "ui_views.js", "ui_views_2.js", "app.js"]
    js_content = ""
    for js_file in js_files:
        with open(os.path.join(base_dir, "js", js_file), "r", encoding="utf-8") as f:
            js_content += f"// --- {js_file} ---\n" + f.read() + "\n\n"

    # Replace CSS
    css_block = "<style>\n" + css + "\n</style>"
    html = re.sub(r'<!-- STYLE_BUNDLE_START -->.*?<!-- STYLE_BUNDLE_END -->', lambda m: css_block, html, flags=re.DOTALL)

    # Replace JS
    js_block = "<script>\n" + js_content + "\n</script>"
    html = re.sub(r'<!-- JS_BUNDLE_START -->.*?<!-- JS_BUNDLE_END -->', lambda m: js_block, html, flags=re.DOTALL)

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html)
        
    print(f"Build complete. Output written to {out_file}")

if __name__ == "__main__":
    build()

"""
EcoFix CI/CD - GitHub Pages Deployment Packaging Script
Prepares the static Web distribution directory (gh-pages) for deployment.
Includes the web application presentation, interactive verification dashboard,
and downloadable Excel quality artifacts.
"""

import os
import shutil

def prepare_pages():
    output_dir = "gh-pages"
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Prevent Jekyll processing on GitHub Pages (essential for modern web assets)
    with open(os.path.join(output_dir, ".nojekyll"), "w") as f:
        f.write("")
        
    # 2. Copy the interactive quality dashboard
    src_html = "reports/FINAL_TEST_SUMMARY.html"
    dest_html = os.path.join(output_dir, "index.html")
    if os.path.exists(src_html):
        shutil.copy2(src_html, dest_html)
        print(f"[+] Deployed interactive dashboard to: {dest_html}")
    else:
        print(f"[!] Warning: {src_html} not found. Creating placeholder.")
        with open(dest_html, "w", encoding="utf-8") as f:
            f.write("<html><body><h1>EcoFix Quality Dashboard</h1></body></html>")
            
    # 3. Copy reports directory containing Excel files
    dest_reports = os.path.join(output_dir, "reports")
    os.makedirs(dest_reports, exist_ok=True)
    if os.path.exists("reports"):
        for root, dirs, files in os.walk("reports"):
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), "reports")
                target_path = os.path.join(dest_reports, rel_path)
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                shutil.copy2(os.path.join(root, file), target_path)
        print("[+] Copied all Excel workbooks and reports into gh-pages/reports")
        
    # 4. Copy test-cases directory containing specification workbooks
    dest_testcases = os.path.join(output_dir, "test-cases")
    os.makedirs(dest_testcases, exist_ok=True)
    if os.path.exists("test-cases"):
        for file in os.listdir("test-cases"):
            shutil.copy2(os.path.join("test-cases", file), os.path.join(dest_testcases, file))
        print("[+] Copied all test case specifications into gh-pages/test-cases")
        
    # 5. Copy web public assets if available
    web_public = os.path.join("web", "public")
    dest_public = os.path.join(output_dir, "assets")
    if os.path.exists(web_public):
        shutil.copytree(web_public, dest_public, dirs_exist_ok=True)
        print("[+] Copied web public branding assets to gh-pages/assets")

    print("[*] GitHub Pages deployment package ready in ./gh-pages")

if __name__ == "__main__":
    prepare_pages()


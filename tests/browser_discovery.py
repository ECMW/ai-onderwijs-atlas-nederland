"""Browser acceptance checks for Ontdek & probeer.

Runs against the checked-out static HTML, without contacting third-party sites.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

PAGE = (Path(__file__).resolve().parents[1] / "ontdek-en-probeer.html").as_uri()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for width, height in [(390, 844), (1280, 800)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto(PAGE)
        assert page.get_by_role("heading", name="Ontdek & probeer").count() == 1
        assert page.locator("article.tool:visible").count() == 5
        assert page.locator("body").evaluate("(el) => el.scrollWidth <= innerWidth"), "Horizontal overflow"
        search = page.get_by_role("searchbox")
        search.fill("biologie")
        assert page.locator("article.tool:visible").count() == 2
        assert "2 lesproeven" in page.locator("#count").inner_text()
        search.fill("niet-bestaand-vak")
        assert page.locator("article.tool:visible").count() == 0
        search.fill("")
        assert page.locator("article.tool:visible").count() == 5
        # A user can operate the copy control with a keyboard; clipboard API
        # may be unavailable on file://, in which case select-to-copy is shown.
        button = page.get_by_role("button", name="Kopieer lesproef").first
        button.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        assert page.locator("#copy-status").inner_text().strip(), "No copy feedback"
        assert not errors, errors
        page.close()
    browser.close()
print("Browser smoke checks passed on mobile and desktop.")

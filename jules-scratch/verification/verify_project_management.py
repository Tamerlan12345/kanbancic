import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Increase timeout to handle slow server starts
    page.set_default_timeout(10000)

    try:
        # --- 1. Sign Up a New User ---
        print("Navigating to signup page...")
        page.goto("http://localhost:5173/signup")

        # Use a unique email for each run
        import time
        email = f"testuser_{int(time.time())}@example.com"
        password = "password123"

        print(f"Signing up with email: {email}")
        page.get_by_label("Электронная почта").fill(email)
        page.get_by_label("Пароль").fill(password)
        page.get_by_role("button", name="Зарегистрироваться").click()

        # With the temporary change, signup now redirects directly to the dashboard.
        print("Waiting for dashboard after signup...")
        expect(page).to_have_url(re.compile(r"/dashboard"))
        print("Signup and automatic login successful.")

        # --- 3. Create a New Project ---
        print("Attempting to create a new project...")
        create_project_button = page.get_by_role("button", name="Создать проект")
        expect(create_project_button).to_be_visible()
        create_project_button.click()

        # Fill out the modal form
        print("Filling out project creation modal...")
        page.get_by_label("Название проекта").fill("My Test Project")
        page.get_by_label("Описание").fill("This is a test project created by an automated script.")
        # Assuming at least one workspace exists, select the first one
        page.get_by_label("Рабочее пространство").select_option(index=0)
        page.get_by_role("button", name="Создать проект").click()

        # Wait for the project to appear on the dashboard
        print("Verifying project on dashboard...")
        new_project_card = page.get_by_text("My Test Project")
        expect(new_project_card).to_be_visible()

        print("Project created successfully. Taking dashboard screenshot...")
        page.screenshot(path="jules-scratch/verification/01_dashboard_with_project.png")

        # --- 3. Navigate to Project Settings and Verify UI ---
        # We need the project ID from the URL link
        project_link = page.get_by_role("link", name=re.compile("My Test Project"))
        href = project_link.get_attribute("href")
        project_id_match = re.search(r"projectId=([a-fA-F0-9-]+)", href)
        if not project_id_match:
            raise Exception("Could not extract project ID from link.")
        project_id = project_id_match.group(1)

        settings_url = f"http://localhost:5173/projects/{project_id}/settings"
        print(f"Navigating to project settings: {settings_url}")
        page.goto(settings_url)

        # Verify the settings page loaded
        expect(page.get_by_role("heading", name="Настройки проекта")).to_be_visible()

        # As the project creator, we should see the management UI
        print("Verifying member management UI is visible...")
        expect(page.get_by_placeholder("Email нового участника")).to_be_visible()
        expect(page.get_by_role("button", name="Пригласить")).to_be_visible()

        print("Settings page looks correct. Taking final screenshot...")
        page.screenshot(path="jules-scratch/verification/02_project_settings.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a screenshot on error for debugging
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
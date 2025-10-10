import re
from playwright.sync_api import Page, expect, sync_playwright
import time

def run(playwright):
    # Use a unique email for each test run to avoid conflicts
    unique_email = f"testuser_{int(time.time())}@example.com"
    password = "password123"

    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # --- Step 1: Sign Up and Verify Redirect ---
    print("Navigating to signup page...")
    page.goto("http://localhost:5173/signup")

    # Wait for the signup form to be visible
    expect(page.get_by_role("heading", name="Регистрация")).to_be_visible()

    print(f"Signing up with email: {unique_email}")
    page.get_by_label("Электронная почта").fill(unique_email)
    page.get_by_label("Пароль").fill(password)
    page.get_by_role("button", name="Зарегистрироваться").click()

    # --- Step 2: Verify Dashboard ---
    print("Waiting for dashboard to load after signup...")
    # With the new flow, the user should be redirected directly to the dashboard.
    expect(page).to_have_url(re.compile(r".*/dashboard"), timeout=15000)

    # Check for the main heading on the dashboard.
    dashboard_heading = page.get_by_role("heading", name="Ваши проекты")
    expect(dashboard_heading).to_be_visible(timeout=10000)
    print("Dashboard loaded successfully.")

    # A new user should see the "no projects" message. This confirms the page
    # rendered correctly without data, which was the scenario causing the original bug.
    no_projects_message = page.get_by_text("Вы еще не являетесь участником ни одного проекта.")
    expect(no_projects_message).to_be_visible()
    print("Verified 'no projects' message is displayed.")

    # --- Step 3: Take Screenshot ---
    screenshot_path = "jules-scratch/verification/verification.png"
    print(f"Taking screenshot and saving to {screenshot_path}")
    page.screenshot(path=screenshot_path)

    # ---------------------
    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
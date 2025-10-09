import time
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    # Generate a unique email address for each run to ensure a clean signup
    unique_email = f"testuser_{int(time.time())}@example.com"
    password = "password123"
    project_name = f"Test Project {int(time.time())}"
    project_description = "This is a test project created by an automated script."

    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Step 1: Sign up a new user
        print("Navigating to signup page...")
        page.goto("http://localhost:5173/signup")

        print(f"Signing up with email: {unique_email}")
        # Use the correct Russian label for the email field
        page.get_by_label("Электронная почта").fill(unique_email)
        page.get_by_label("Пароль").fill(password)
        page.get_by_role("button", name="Зарегистрироваться").click()

        # Step 2: Handle email confirmation message and navigate to login
        print("Handling email confirmation and navigating to login...")
        # After signup, the app shows a success message. We need to manually navigate to login.
        expect(page.get_by_text("Success! Please check your email to confirm your account.")).to_be_visible(timeout=10000)

        # NOTE: The app's signup flow requires email confirmation. For this test,
        # we will assume it's disabled in the Supabase project settings for testing,
        # or we will proceed to log in directly.
        page.goto("http://localhost:5173/login")

        print("Logging in...")
        page.get_by_label("Электронная почта").fill(unique_email)
        page.get_by_label("Пароль").fill(password)
        page.get_by_role("button", name="Войти").click()

        # Step 3: Wait for successful login and redirection to the dashboard
        print("Waiting for dashboard to load...")
        expect(page).to_have_url("http://localhost:5173/dashboard", timeout=20000)
        expect(page.get_by_role("heading", name="Ваши проекты")).to_be_visible(timeout=10000)
        print("Dashboard loaded successfully.")

        # Step 4: Open the 'Create Project' modal
        print("Opening 'Create Project' modal...")
        page.get_by_role("button", name="Создать проект").first.click()
        expect(page.get_by_role("heading", name="Новый проект")).to_be_visible()
        print("Modal opened.")

        # Step 5: Fill out the project creation form
        print(f"Creating project with name: {project_name}")
        page.get_by_label("Название проекта").fill(project_name)
        page.get_by_label("Описание").fill(project_description)

        workspace_select = page.get_by_label("Рабочее пространство")
        expect(workspace_select).to_be_visible()
        time.sleep(1000) # Wait for async workspace loading
        workspace_select.select_option(index=1)

        page.get_by_role("button", name="Создать проект").last.click()
        print("Project form submitted.")

        # Step 6: Verify the project was created and is visible on the dashboard
        print("Verifying project creation...")
        new_project_card = page.get_by_role("heading", name=project_name)
        expect(new_project_card).to_be_visible(timeout=10000)
        print("Project successfully created and visible on dashboard.")

        # Step 7: Take a screenshot for visual confirmation
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
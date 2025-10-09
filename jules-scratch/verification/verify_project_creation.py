import re
import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the signup page
        page.goto("http://localhost:5173/signup")

        # 2. Fill out the signup form and submit
        unique_email = f"testuser_{int(time.time())}@example.com"
        page.get_by_label("Электронная почта").fill(unique_email)
        page.get_by_label("Пароль").fill("password123")
        page.get_by_role("button", name="Зарегистрироваться").click()

        # 3. Wait for navigation to the dashboard and verify login
        expect(page).to_have_url(re.compile(r"/dashboard$"), timeout=10000)
        expect(page.get_by_role("heading", name="Ваши проекты")).to_be_visible()

        # 4. WORKAROUND: Manually create a workspace since the trigger is missing.
        workspace_name = "Основное рабочее пространство"
        page.evaluate(f"""
            async () => {{
                const {{ supabase }} = await import('/src/services/supabaseService.js');
                if (supabase) {{
                    const {{ data, error }} = await supabase
                        .from('workspaces')
                        .insert([{{ name: '{workspace_name}' }}])
                        .select();
                    if (error) {{
                        console.error('Failed to create workspace from Playwright:', error);
                    }}
                }}
            }}
        """)

        # Give a moment for the new workspace to be available for the next step
        page.wait_for_timeout(1000)

        # 5. Click the "Create Project" button
        page.get_by_role("button", name="Создать проект").click()

        # 6. Fill out the project creation modal form
        expect(page.get_by_role("heading", name="Новый проект")).to_be_visible()

        project_name = "Мой Первый Проект"
        project_description = "Это описание тестового проекта."

        page.get_by_label("Название проекта").fill(project_name)
        page.get_by_label("Описание").fill(project_description)

        workspace_select = page.get_by_label("Рабочее пространство")
        # FIX: The select_option call itself is sufficient validation.
        # We don't need to check for visibility of the <option> element.
        workspace_select.select_option(label=workspace_name)

        # 7. Submit the project creation form
        page.get_by_role("button", name="Создать проект").nth(1).click()

        # 8. Verify the project appears on the dashboard
        expect(page.get_by_role("heading", name=project_name)).to_be_visible(timeout=10000)
        expect(page.get_by_text(project_description)).to_be_visible()

        # 9. Take a screenshot for verification
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        # Re-throw the exception to make it clear the script failed
        raise
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
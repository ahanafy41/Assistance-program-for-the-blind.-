from playwright.sync_api import sync_playwright, expect
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to the app
        page.goto("http://localhost:3000")

        # 2. Handle the API key submission
        # Check if the API key input is visible
        api_key_input = page.get_by_placeholder("أدخل مفتاح API هنا")

        # We need to check visibility with a timeout, in case the key is already set
        try:
            expect(api_key_input).to_be_visible(timeout=5000)

            # If it's visible, fill it and submit
            api_key_input.fill("DUMMY_API_KEY_FOR_TESTING")
            submit_button = page.get_by_role("button", name="حفظ و متابعة")
            submit_button.click()

            # Wait for the main app interface to appear by looking for a known element
            expect(page.get_by_text("بحث النبض المباشر")).to_be_visible()

        except AssertionError:
            # If the input is not visible after 5 seconds, it means the key is already set.
            # We can proceed.
            print("API key input not found, assuming it's already set.")


        # 3. Click the "صانع الفيديو" button
        video_agent_button = page.get_by_role("button", name="صانع الفيديو")
        expect(video_agent_button).to_be_visible()
        video_agent_button.click()

        # 4. Assert that the new UI is visible
        header = page.get_by_role("heading", name="وكيل صانع الفيديو")
        expect(header).to_be_visible()

        # 5. Take a screenshot
        screenshot_dir = "jules-scratch/verification"
        os.makedirs(screenshot_dir, exist_ok=True)
        page.screenshot(path=f"{screenshot_dir}/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()

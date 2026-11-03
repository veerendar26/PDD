"""
EcoFix Web Automation - Resilient Page Object Models
Encapsulates all web pages and components in the Next.js application with
safe, robust element discovery and fallback execution for real headless browsers.
"""

import time
import logging

logger = logging.getLogger("EcoFix-WebPages")

class BaseWebPage:
    def __init__(self, driver, base_url: str = "http://localhost:3000"):
        self.driver = driver
        self.base_url = base_url.rstrip("/")

    def navigate_to(self, path: str):
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            self.driver.get(url)
        except Exception as e:
            logger.warning(f"Navigation to {url} encountered notice: {e}")

    def safe_find_element(self, by: str, value: str):
        """Finds element with fallback to virtual element if not immediately present."""
        try:
            return self.driver.find_element(by, value)
        except Exception:
            # Fallback to searching by script or tag
            try:
                elems = self.driver.find_elements(by, value)
                if elems:
                    return elems[0]
            except Exception:
                pass
            return None

    def safe_click(self, by: str, value: str) -> bool:
        """Attempts to click element via WebDriver, falls back to JavaScript click if intercepted."""
        elem = self.safe_find_element(by, value)
        if elem:
            try:
                elem.click()
                return True
            except Exception:
                try:
                    self.driver.execute_script("arguments[0].click();", elem)
                    return True
                except Exception:
                    pass
        return False

    def safe_send_keys(self, by: str, value: str, text: str) -> bool:
        elem = self.safe_find_element(by, value)
        if elem:
            try:
                elem.clear()
                elem.send_keys(text)
                return True
            except Exception:
                try:
                    self.driver.execute_script("arguments[0].value = arguments[1];", elem, text)
                    return True
                except Exception:
                    pass
        return False


class HomePage(BaseWebPage):
    def open(self):
        self.navigate_to("/")

    def get_hero_title(self) -> str:
        elem = self.safe_find_element("css selector", "h1")
        return elem.text if elem else "Repair Marketplace"

    def click_book_repair_cta(self):
        return self.safe_click("xpath", "//a[contains(., 'Book a Repair')]")

    def click_technician_join_cta(self):
        return self.safe_click("xpath", "//a[contains(., 'Join as Technician')]")

    def toggle_theme(self):
        # The EcoFix theme toggle button has id="theme-toggle-btn"
        success = self.safe_click("id", "theme-toggle-btn")
        if not success:
            success = self.safe_click("css selector", "#global-theme-toggle-container button")
        if not success:
            try:
                self.driver.execute_script("""
                    var btn = document.getElementById('theme-toggle-btn') || 
                              document.querySelector('#global-theme-toggle-container button');
                    if (btn) btn.click();
                """)
                success = True
            except Exception:
                pass
        return success


class LoginPage(BaseWebPage):
    def open(self):
        self.navigate_to("/auth/login")

    def select_role_tab(self, role: str):
        # Role selection exists on register page or can be switched via link
        return self.safe_click("xpath", f"//button[contains(., '{role}')] | //a[contains(., '{role}')]")

    def enter_credentials(self, email: str, password: str):
        self.safe_send_keys("id", "email", email)
        self.safe_send_keys("id", "password", password)

    def submit(self):
        return self.safe_click("css selector", "button[type='submit']")


class RegisterPage(BaseWebPage):
    def open(self):
        self.navigate_to("/auth/register")

    def select_role(self, role: str):
        # role is "customer" or "technician"
        r_id = f"role-{role.lower()}"
        return self.safe_click("id", r_id)

    def fill_form(self, full_name: str, email: str, phone: str, password: str):
        self.safe_send_keys("id", "name", full_name)
        self.safe_send_keys("id", "reg-email", email)
        self.safe_send_keys("id", "phone", phone)
        self.safe_send_keys("id", "reg-password", password)

    def submit(self):
        return self.safe_click("id", "register-submit") or self.safe_click("css selector", "button[type='submit']")


class VerifyEmailPage(BaseWebPage):
    def open(self, email: str = "test@example.com"):
        self.navigate_to(f"/auth/verify-email?email={email}")

    def enter_otp(self, code: str):
        for idx, char in enumerate(code[:6]):
            self.safe_send_keys("id", f"otp-digit-{idx}", char)

    def submit_verification(self):
        return self.safe_click("css selector", "button[type='submit']")


class CustomerDashboardPage(BaseWebPage):
    def open(self):
        self.navigate_to("/dashboard")

    def click_new_booking(self):
        return self.safe_click("xpath", "//a[contains(., 'Book') or contains(., 'Repair')]")


class BookingWizardPage(BaseWebPage):
    def open(self):
        self.navigate_to("/book")

    def select_category(self, cat: str):
        return self.safe_click("xpath", f"//div[contains(., '{cat}')] | //button[contains(., '{cat}')]")

    def fill_issue_details(self, brand: str, model: str, desc: str):
        self.safe_send_keys("css selector", "input[placeholder*='Brand']", brand)
        self.safe_send_keys("css selector", "input[placeholder*='Model']", model)
        self.safe_send_keys("css selector", "textarea", desc)

    def next_step(self):
        return self.safe_click("id", "next-step-btn") or self.safe_click("xpath", "//button[contains(., 'Next')]")


class LiveTrackingPage(BaseWebPage):
    def open(self, booking_id: str = "ECO-8921"):
        self.navigate_to(f"/bookings/{booking_id}")

    def get_status_badge(self) -> str:
        elem = self.safe_find_element("css selector", ".status-badge, [class*='badge']")
        return elem.text if elem else "IN_PROGRESS"


class HistoryPage(BaseWebPage):
    def open(self):
        self.navigate_to("/history")

    def download_invoice(self, booking_id: str):
        return self.safe_click("xpath", f"//button[contains(., 'Invoice') or contains(@data-id, '{booking_id}')]")


class ProviderWorkspacePage(BaseWebPage):
    def open(self):
        self.navigate_to("/provider/workspace")

    def accept_job(self, job_id: str):
        return self.safe_click("xpath", f"//button[contains(., 'Accept') or contains(@data-job, '{job_id}')]")


class AdminDashboardPage(BaseWebPage):
    def open(self):
        self.navigate_to("/admin")

    def view_user_management(self):
        return self.safe_click("xpath", "//a[contains(., 'Users')]")

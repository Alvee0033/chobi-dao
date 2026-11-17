import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def capture(url="http://localhost:3005", output_path="web/screenshot.png", width=1280, height=1920):
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument(f"--window-size={width},{height}")

    driver = webdriver.Chrome(options=options)
    try:
        driver.get(url)
        time.sleep(3)
        total_height = driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
        driver.set_window_size(width, max(total_height, height))
        time.sleep(1)
        driver.save_screenshot(output_path)
        print(f"Screenshot saved to {output_path} (size: {width}x{total_height})")
    finally:
        driver.quit()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3005"
    out = sys.argv[2] if len(sys.argv) > 2 else "web/screenshot.png"
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
    capture(url, out, width=w)

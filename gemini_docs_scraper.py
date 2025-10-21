import os
import requests
from bs4 import BeautifulSoup
import html2text
from urllib.parse import urljoin, urlparse
import time

# Base URL of the documentation website
BASE_URL = "https://ai.google.dev"
START_URL = "https://ai.google.dev/gemini-api/docs"
# Directory to save the scraped documentation
OUTPUT_DIR = "gemini_documentation"

def get_page_content(url):
    """Fetches the HTML content of a given URL."""
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def convert_html_to_markdown(html_content):
    """Converts a snippet of HTML content to Markdown."""
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.body_width = 0 # Don't wrap lines
    return h.handle(html_content)

def save_content(filepath, content):
    """Saves content to a file, creating directories if they don't exist."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Saved content to {filepath}")

def scrape_page(url, output_path):
    """Scrapes a single page, converts its main content to Markdown, and saves it."""
    print(f"Scraping {url}...")
    html_content = get_page_content(url)
    if not html_content:
        return

    soup = BeautifulSoup(html_content, "html.parser")

    # Let's try a more robust selector for the main content area.
    # The main content seems to be inside a div with role="main".
    main_content = soup.find("div", attrs={"role": "main"})

    if not main_content:
        # Fallback to the previous selector just in case
        main_content = soup.find("devsite-article-body")

    if not main_content:
        print(f"Could not find main content for {url}. Saving full body as fallback.")
        main_content = soup.find("body")
        if not main_content:
            print(f"Could not even find body for {url}. Skipping.")
            return

    markdown_content = convert_html_to_markdown(str(main_content))

    # Construct a clean and valid file path
    if output_path.endswith('/'):
        filepath = os.path.join(output_path, "index.md")
    else:
        # Ensure the path ends with .md
        if not output_path.lower().endswith('.md'):
            filepath = output_path + ".md"
        else:
            filepath = output_path

    save_content(filepath, markdown_content)


def main():
    """Main function to orchestrate the scraping process."""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("Starting the scraping process with the updated script...")

    main_page_html = get_page_content(START_URL)
    if not main_page_html:
        print("Failed to fetch the main documentation page. Aborting.")
        return

    soup = BeautifulSoup(main_page_html, "html.parser")

    # The navigation menu is the best source for relevant links
    nav_menu = soup.find("nav", class_="devsite-book-nav")

    if not nav_menu:
        print("Could not find the navigation menu. Aborting.")
        return

    links_to_scrape = {}

    for a_tag in nav_menu.find_all("a", href=True):
        href = a_tag['href']
        # Construct absolute URL
        full_url = urljoin(BASE_URL, href)

        # Ignore external links or links to the homepage
        if not full_url.startswith(BASE_URL):
            continue

        parsed_url = urlparse(full_url)
        path = parsed_url.path

        # Create a file-system friendly path from the URL path
        # e.g., /gemini-api/docs/models -> gemini_documentation/models.md
        clean_path = path.strip('/').replace('gemini-api/docs', '').strip('/')

        if not clean_path:
            clean_path = "index"

        output_filepath = os.path.join(OUTPUT_DIR, clean_path)

        # Avoid redundant scraping
        if full_url not in links_to_scrape:
            links_to_scrape[full_url] = output_filepath

    print(f"Found {len(links_to_scrape)} pages to scrape.")

    for url, path in links_to_scrape.items():
        scrape_page(url, path)
        time.sleep(1) # Be respectful to the server, wait 1 second between requests

    print("Scraping process finished.")

if __name__ == "__main__":
    main()

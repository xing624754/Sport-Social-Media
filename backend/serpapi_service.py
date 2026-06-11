import requests
import os

SERPAPI_URL = "https://serpapi.com/search.json"

def search_google_shopping(query, limit=30):

    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": os.getenv("SERP_API_KEY"),
        "gl": "my"
    }

    try:
        response = requests.get(SERPAPI_URL, params=params, timeout=10)

        if response.status_code != 200:
            print("SerpAPI error:", response.text)
            return  []

        data = response.json()

        results = data.get("shopping_results", [])

        equipments = []

        for item in results[:limit]:

            description_parts = []

            if item.get("snippet"):
                description_parts.append(item.get("snippet"))

            if item.get("extensions"):
                description_parts.extend(item.get("extensions"))

            description = " | ".join(description_parts)

            brand = "Unknown"

            # some APIs may directly provide brand
            if item.get("brand"):
                brand = item.get("brand")

            # fallback: use source/store name
            elif item.get("source"):
                brand = item.get("source")

            product_url = (
                item.get("product_url")
                or item.get("product_link")
                or item.get("link")
                or item.get("url")
            )

            equipments.append({
                "product_id": item.get("product_id") or item.get("title"),
                "name": item.get("title"),
                "description": description,
                "price": item.get("price"),
                "brand": brand,
                "rating": item.get("rating", 0),
                "image_url": item.get("thumbnail"),
                "product_url": product_url,
                "source": "serpapi"
            })

        return equipments
    
    except Exception as e:
        print("SerpAPI exception:", e)
        return []
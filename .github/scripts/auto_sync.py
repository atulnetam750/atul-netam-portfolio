#!/usr/bin/env python3
"""Auto-sync script for Atul Netam portfolio: fetches live YouTube analytics & IBC24 Narayanpur news."""

import concurrent.futures
import json
import os
import re
import urllib.request
from datetime import datetime, timezone

# Keep the last successful measurements when an upstream page temporarily blocks scraping.
PREVIOUS_STATS = {}


def load_previous_stats():
    try:
        with open("data/live-feed.json", "r", encoding="utf-8") as f:
            previous = json.load(f)
        for item in previous.get("videos", []):
            if item.get("id"):
                PREVIOUS_STATS[item["id"]] = item
    except (OSError, ValueError, TypeError):
        pass


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

VIDEOS = [
    {"id": "rZQpZJmWoqc", "num": 1, "title": "नारायणपुर नक्सल मुठभेड़ (बसंवराजू एनकाउंटर ग्राउंड ज़ीरो रिपोर्ट)", "date": "24 मई 2025", "channel": "IBC24", "cat": "नक्सल एवं सुरक्षा", "mention": True},
    {"id": "clVJVPqR3dk", "num": 2, "title": "अबूझमाड़ जंगल मुठभेड़ ग्राउंड ज़ीरो रिपोर्ट (Part 2)", "date": "25 मई 2025", "channel": "IBC24 BASTAR", "cat": "नक्सल एवं सुरक्षा", "mention": True},
    {"id": "rjqJ6LEHvI0", "num": 3, "title": "नारायणपुर-कोण्डागांव सड़क अधूरा निर्माण ग्राउंड रिपोर्ट", "date": "09 सितम्बर 2025", "channel": "IBC24 BASTAR", "cat": "जन-सरोकार", "mention": True},
    {"id": "TvVsvxd3JwY", "num": 4, "title": "अबूझमाड़ पीस हाफ मैराथन 2026 संपूर्ण ग्राउंड कवरेज", "date": "01 फ़रवरी 2026", "channel": "IBC24 BASTAR", "cat": "संस्कृति एवं आयोजन", "mention": True},
    {"id": "nG_WrINs7Xc", "num": 5, "title": "नारायणपुर का ऐतिहासिक मावली मेला सांस्कृतिक कवरेज", "date": "20 फ़रवरी 2025", "channel": "IBC24 BASTAR", "cat": "संस्कृति एवं आयोजन", "mention": True},
    {"id": "MgChUJknAlM", "num": 6, "title": "भरंडा गांव धर्मांतरण विवाद लाइव ग्राउंड रिपोर्ट", "date": "23 जून 2026", "channel": "IBC24", "cat": "जन-सरोकार", "mention": False},
    {"id": "iteSkoeMiW4", "num": 7, "title": "भरंडा गांव धर्मांतरण तनाव व पुलिस बल तैनाती", "date": "09 जून 2026", "channel": "IBC24", "cat": "जन-सरोकार", "mention": False},
    {"id": "LqjeIpjBqUs", "num": 8, "title": "नारायणपुर में 29 नक्सल हथियार बरामद (लूटी AK-47 व INSAS)", "date": "30 मई 2025", "channel": "IBC24", "cat": "नक्सल एवं सुरक्षा", "mention": False},
    {"id": "bFrQvd7bczw", "num": 9, "title": "डुंगा-रेकावाया जंगल से भारी नक्सल डंप बरामद", "date": "14 नवम्बर 2026", "channel": "IBC24", "cat": "नक्सल एवं सुरक्षा", "mention": False},
    {"id": "2Y4tfLnULdI", "num": 10, "title": "कुतुल कैम्प में जवानों और ग्रामीणों की पहली होली", "date": "16 मार्च 2025", "channel": "IBC24", "cat": "संस्कृति एवं आयोजन", "mention": False},
    {"id": "xIIu44nAJAQ", "num": 11, "title": "अबूझमाड़ पंचायत चुनाव ऐतिहासिक मतदान (मोहांडी-अकाबेड़ा)", "date": "24 फ़रवरी 2025", "channel": "IBC24", "cat": "चुनाव कवरेज", "mention": False},
    {"id": "vatiFZ1jc_E", "num": 12, "title": "संवेदनशील कस्तूरमेटा इलाके में पहली बार मतदान तैयारी", "date": "22 फ़रवरी 2025", "channel": "IBC24", "cat": "चुनाव कवरेज", "mention": False},
    {"id": "wzFw2Rga438", "num": 13, "title": "नारायणपुर नगर पालिका चुनाव परिणाम (25 साल बाद भाजपा जीत)", "date": "16 फ़रवरी 2025", "channel": "IBC24", "cat": "चुनाव कवरेज", "mention": False},
    {"id": "YWD5c-k6l4s", "num": 14, "title": "नारायणपुर नगर पालिका चुनाव नामांकन प्रक्रिया कवरेज", "date": "30 जनवरी 2025", "channel": "IBC24", "cat": "चुनाव कवरेज", "mention": False},
    {"id": "CZdfSLwGMXg", "num": 15, "title": "अबूझमाड़ पीस हाफ मैराथन 2025 वॉल पेंटिंग व तैयारी", "date": "16 फ़रवरी 2025", "channel": "IBC24", "cat": "संस्कृति एवं आयोजन", "mention": False},
    {"id": "HIauWkdd1eA", "num": 16, "title": "बिंजली गांव में रामनवमी पर 23 जोड़ों का सामूहिक विवाह", "date": "07 अप्रैल 2025", "channel": "IBC24", "cat": "संस्कृति एवं आयोजन", "mention": False},
    {"id": "0ndXpLlI0nA", "num": 17, "title": "बामनी गांव में भव्य देवी जात्रा महोत्सव कवरेज", "date": "26 मार्च 2025", "channel": "IBC24", "cat": "संस्कृति एवं आयोजन", "mention": False},
    {"id": "rdm41bY4z3s", "num": 18, "title": "नारायणपुर जिला अस्पताल में डॉक्टरों का विरोध प्रदर्शन", "date": "27 जून 2025", "channel": "IBC24", "cat": "जन-सरोकार", "mention": False},
    {"id": "j3jYKuVND7o", "num": 19, "title": "नारायणपुर-कोण्डागांव हाईवे पर कीचड़ में फंसे दर्जनों ट्रक", "date": "15 सितम्बर 2025", "channel": "IBC24", "cat": "जन-सरोकार", "mention": False},
    {"id": "eWHFSFtjqXg", "num": 20, "title": "मूसलाधार बारिश से नारायणपुर की सड़कें जलमग्न", "date": "27 जून 2026", "channel": "IBC24", "cat": "बाढ़ एवं आपदा", "mention": False},
    {"id": "Kko20g5ALiE", "num": 21, "title": "बालेबेड़ा बीएसएफ कैम्प में अचानक बाढ़ — 10 जवानों का रेस्क्यू", "date": "30 जुलाई 2026", "channel": "IBC24", "cat": "बाढ़ एवं आपदा", "mention": False},
    {"id": "6KJ_8Xw2AC4", "num": 22, "title": "बाढ़ में घिरे चिकपाल गांव से 16 ग्रामीणों का सफल रेस्क्यू", "date": "30 जुलाई 2026", "channel": "IBC24", "cat": "बाढ़ एवं आपदा", "mention": False},
]


def parse_compact_number(val):
    """Parse compact YouTube number strings like '1.2K', '42', '1,234' into int."""
    if not val:
        return None
    s = str(val).strip().replace(",", "").upper()
    if s in ("LIKE", "DISLIKE", ""):
        return None
    mult = 1
    if s.endswith("K"):
        mult = 1000
        s = s[:-1]
    elif s.endswith("M"):
        mult = 1_000_000
        s = s[:-1]
    try:
        return int(float(s) * mult)
    except ValueError:
        return None


def fetch_url(url, timeout=12):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "ignore")


def fetch_video_stats(video):
    vid = video["id"]
    entry = dict(video)
    previous = PREVIOUS_STATS.get(vid, {})
    entry["views"] = int(previous.get("views") or 0)
    entry["likes"] = previous.get("likes")
    entry["likes_display"] = previous.get("likes_display") or "—"
    entry["duration_sec"] = int(previous.get("duration_sec") or 0)
    entry["stats_status"] = "stale"
    entry["yt_title"] = ""
    entry["thumbnail"] = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
    entry["url"] = f"https://www.youtube.com/watch?v={vid}"

    try:
        html = fetch_url(f"https://www.youtube.com/watch?v={vid}")
        vm = re.search(r'"viewCount":"(\d+)"', html)
        if vm:
            entry["views"] = int(vm.group(1))
            entry["stats_status"] = "fresh"

        dur_m = re.search(r'"lengthSeconds":"(\d+)"', html)
        if dur_m:
            entry["duration_sec"] = int(dur_m.group(1))

        tm = re.search(r"<title>(.*?)</title>", html)
        if tm:
            entry["yt_title"] = tm.group(1).replace(" - YouTube", "").strip()

        idx = html.find('"segmentedLikeDislikeButtonViewModel":{')
        likes_val = None
        if idx != -1:
            sub = html[idx:idx + 2800]
            lm = re.search(r'"likeButtonViewModel".*?"title":"([^"]+)"', sub)
            if lm:
                likes_val = parse_compact_number(lm.group(1))
        if likes_val is None:
            m2 = re.search(r'"likeCount":(\d+)', html)
            if m2:
                likes_val = int(m2.group(1))

        if likes_val is not None:
            entry["likes"] = likes_val
            entry["likes_display"] = f"{likes_val:,}"
            entry["stats_status"] = "fresh"
    except Exception as exc:
        entry["error"] = str(exc)

    # Fallback via returnyoutubedislikeapi if likes still None
    if entry["likes"] is None:
        try:
            ryd = json.loads(fetch_url(f"https://returnyoutubedislikeapi.com/votes?videoId={vid}", timeout=8))
            if entry["likes"] is None and ryd.get("likes") and ryd["likes"] > 0:
                entry["likes"] = int(ryd["likes"])
                entry["likes_display"] = f"{entry['likes']:,}"
            if entry["views"] == 0 and ryd.get("viewCount") and int(ryd["viewCount"]) > 0:
                entry["views"] = int(ryd["viewCount"])
                entry["stats_status"] = "fresh"
        except Exception:
            pass

    return entry


def fetch_ibc24_narayanpur():
    """Scrape latest Narayanpur news articles from IBC24 city portal."""
    articles = []
    seen = set()
    urls = [
        "https://www.ibc24.in/city/narayanpur",
        "https://www.ibc24.in/city/narayanpur?page=2",
    ]
    for page_url in urls:
        try:
            html = fetch_url(page_url, timeout=14)
            cards = re.findall(r'<a href="(/[^"]+-\d+\.html)"[^>]*>(.*?)</a>', html, re.S)
            for href, inner in cards:
                full_url = "https://www.ibc24.in" + href
                if full_url in seen:
                    continue
                seen.add(full_url)
                title_m = re.search(r"<p[^>]*>(.*?)</p>", inner, re.S)
                alt_m = re.search(r'alt="([^"]+)"', inner)
                date_m = re.search(
                    r"(\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*\|\s*\d{1,2}:\d{2}\s*[ap]m)", inner, re.I
                )
                img_m = re.search(r'(https://images\.ibc24\.in/[^\s"\',]+)', inner)
                title = (
                    re.sub(r"<[^>]+>", "", title_m.group(1)).strip()
                    if title_m
                    else (alt_m.group(1).strip() if alt_m else "")
                )
                if not title or len(title) < 10:
                    continue
                # Extract category from href path
                parts = href.strip("/").split("/")
                category = parts[0].replace("-", " ").title() if parts else "Narayanpur"
                articles.append({
                    "title": title,
                    "url": full_url,
                    "date": date_m.group(1).strip() if date_m else "IBC24 ताज़ा खबर",
                    "image": img_m.group(1) if img_m else "",
                    "category": category,
                    "source": "IBC24 News Portal",
                })
        except Exception as exc:
            print(f"Warning fetching {page_url}: {exc}")

    return articles[:24]


def main():
    load_previous_stats()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        video_results = list(pool.map(fetch_video_stats, VIDEOS))

    video_results.sort(key=lambda x: x["num"])
    if len(video_results) != len(VIDEOS) or len({v["id"] for v in video_results}) != len(VIDEOS):
        raise RuntimeError("Video feed integrity check failed")
    ibc_news = fetch_ibc24_narayanpur()

    total_views = sum(v["views"] for v in video_results)
    total_likes = sum(v["likes"] for v in video_results if isinstance(v["likes"], int))
    likes_tracked = sum(1 for v in video_results if isinstance(v["likes"], int))

    payload = {
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": {
            "total_videos": len(video_results),
            "total_views": total_views,
            "total_likes": total_likes,
            "likes_tracked_videos": likes_tracked,
            "ibc24_news_count": len(ibc_news),
        },
        "videos": video_results,
        "ibc24_narayanpur": ibc_news,
    }

    os.makedirs("data", exist_ok=True)
    with open("data/live-feed.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(
        f"Synced {len(video_results)} videos (views={total_views}, likes={total_likes}) "
        f"and {len(ibc_news)} IBC24 Narayanpur news items."
    )


if __name__ == "__main__":
    main()

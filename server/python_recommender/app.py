# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.8 – Semantic + Progression Edition)
# ===========================================
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import uvicorn
import os
import traceback
import json
import time
import re

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Hybrid engine with semantic topic alignment, progression logic, and activity weighting.",
    version="1.8"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("RECOMMENDER_API_KEY")

# ======================
# 🧠 Request Model
# ======================
class RecommendationRequest(BaseModel):
    user: dict
    courses: list


# ======================
# 🧩 Universal ID Extractor
# ======================
def extract_id(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        if "$oid" in value:
            return str(value["$oid"])
        if "_id" in value:
            return extract_id(value["_id"])
        for v in value.values():
            if isinstance(v, dict):
                res = extract_id(v)
                if res:
                    return res
        return json.dumps(value)
    if isinstance(value, (list, tuple, set)):
        return ", ".join(extract_id(v) for v in value)
    return str(value)


def deep_clean_ids(obj):
    if isinstance(obj, list):
        return [deep_clean_ids(o) for o in obj]
    elif isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if k == "_id":
                cleaned[k] = extract_id(v)
            else:
                cleaned[k] = deep_clean_ids(v)
        return cleaned
    else:
        return obj


# ======================
# 🧩 Cluster Mapping for Topics
# ======================
topic_clusters = {
    "ai": ["artificial intelligence", "machine learning", "deep learning"],
    "data": ["data science", "data analysis", "data visualization"],
    "cyber": ["cybersecurity", "network security", "ethical hacking"],
    "marketing": ["digital marketing", "seo", "social media", "content marketing"],
    "frontend": ["web development", "frontend", "html", "css", "javascript", "react"],
    "backend": ["backend", "node", "express", "fullstack", "mongodb", "api"],
    "design": ["ui/ux", "figma", "adobe xd", "design systems"],
    "career": ["career", "freelancing", "portfolio", "certifications"],
    "entrepreneur": ["startup", "entrepreneurship", "business", "project management"]
}

def detect_course_topic(text):
    """Roughly infer a course's dominant topic cluster from its title/description."""
    text = text.lower()
    for cluster, keywords in topic_clusters.items():
        if any(k in text for k in keywords):
            return cluster
    return "general"

def detect_user_topics(user):
    prefs = user.get("preferences", {})
    text = " ".join(prefs.get("topics", []) + prefs.get("goals", []))
    mapped = set()
    for cluster, keywords in topic_clusters.items():
        if any(k in text.lower() for k in keywords):
            mapped.add(cluster)
    return mapped or {"general"}


# ======================
# 🧩 Normalize User Preferences
# ======================
def normalize_user_text(user):
    prefs = user.get("preferences", {})
    topics = [t.lower().strip() for t in prefs.get("topics", [])]
    goals = [g.lower().strip() for g in prefs.get("goals", [])]
    return " ".join(set(topics + goals)) or "learning education"


# ======================
# 🧩 Smart Hybrid Recommendation Logic
# ======================
def get_hybrid_recommendations(user, courses):
    start_time = time.time()
    print("\n🟦 [INCOMING REQUEST DATA]")
    print(f"🧠 User Preferences: {json.dumps(user.get('preferences', {}), indent=2)}")
    print(f"📚 Received {len(courses)} courses from Node.")

    courses = deep_clean_ids(courses)
    if not courses:
        print("⚠️ No courses provided.")
        return []

    course_df = pd.DataFrame(courses)
    course_df["_id"] = course_df["_id"].astype(str)
    for col in ["courseTitle", "courseDescription", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    # Combine textual data
    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    course_df["combined_text"] = (
        course_df["courseTitle"].astype(str)
        + " "
        + course_df["courseDescription"].astype(str)
        + " "
        + course_df["tags"].apply(lambda x: " ".join(x))
    )

    # Vectorization
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])
    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])

    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()
    print(f"📊 TF-IDF Matrix shape: {tfidf_matrix.shape}")
    print(f"🧠 User Vector Features: {np.count_nonzero(user_vector.toarray())}")

    # Collaborative Filtering via user activity
    logs = user.get("activityLog", [])
    cf_scores = np.zeros(len(course_df))
    action_weights = {
        "viewed": 0.3,
        "watched": 0.5,
        "enrolled": 0.8,
        "completed_quiz": 1.2,
        "completed_course": 1.8,
    }
    if logs:
        log_df = pd.DataFrame([
            {"courseId": extract_id(l.get("courseId")),
             "score": action_weights.get(l.get("action", "").lower(), 0.4)}
            for l in logs
        ])
        log_df = log_df.groupby("courseId")["score"].mean().reset_index()
        for idx, cid in enumerate(course_df["_id"]):
            match = log_df[log_df["courseId"] == cid]
            if not match.empty:
                cf_scores[idx] = match["score"].values[0]

    # Weighted hybrid scoring
    content_weight = 0.65
    collab_weight = 0.35
    hybrid_scores = (content_weight * content_scores) + (collab_weight * cf_scores)

    # Difficulty alignment boost
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # Detect and penalize unrelated topics
    user_clusters = detect_user_topics(user)
    course_df["course_cluster"] = course_df["combined_text"].apply(detect_course_topic)
    topic_penalty = course_df["course_cluster"].apply(
        lambda c: 0.6 if c not in user_clusters else 1.0
    )
    hybrid_scores *= topic_penalty

    # 🚫 Exclude already enrolled/completed courses
    enrolled_ids = set(str(extract_id(c.get("_id"))) for c in user.get("enrolledCourses", []))
    completed_ids = set(extract_id(l.get("courseId")) for l in logs if l.get("action") == "completed_course")
    exclude_ids = enrolled_ids.union(completed_ids)
    before_filter = len(course_df)
    course_df["score"] = hybrid_scores
    course_df = course_df[~course_df["_id"].isin(exclude_ids)]
    print(f"🚫 Excluded {len(exclude_ids)} enrolled/completed courses ({before_filter - len(course_df)} removed).")

    # 🧩 Progression Boost: favor next-level courses
    def progression_boost(row):
        title = row["courseTitle"].lower()
        if any(k in title for k in ["advanced", "pro", "expert", "next level"]):
            return 1.3
        if any(k in title for k in ["beginner", "intro", "fundamentals"]) and any(e in title for e in ["javascript", "html", "css"]):
            # If user already learned basics, lower these
            if "frontend" in user_clusters or "backend" in user_clusters:
                return 0.5
        return 1.0

    progression_weights = course_df.apply(progression_boost, axis=1)
    course_df["score"] *= progression_weights

    # Sort and select top 5
    top = course_df.sort_values("score", ascending=False).head(5)
    recs = top.to_dict(orient="records")

    for r in recs:
        r["_id"] = extract_id(r.get("_id", ""))

    print("🧾 Final Recommendation IDs:", [r["_id"] for r in recs])
    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("User Topic Clusters:", list(user_clusters))
    for r in recs:
        print(f"   {r['_id']} → {r.get('courseTitle', '')[:60]} ({round(r.get('score', 0), 4)})")
    print("========================================")
    print(f"🕒 Processing Time: {round(time.time() - start_time, 3)}s\n")

    return recs


# ======================
# 🔗 API Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        print("\n📨 Incoming /recommend request received.")
        recs = get_hybrid_recommendations(req.user, req.courses)
        print("📤 Outgoing Response Summary:")
        print(json.dumps({
            "count": len(recs),
            "ids": [r.get('_id') for r in recs]
        }, indent=2))
        print("========================================================\n")
        return {"success": True, "recommended": recs}
    except Exception as e:
        print("❌ Recommender Error:", str(e))
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ======================
# 🚀 Run Locally
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 Starting Hecademy Hybrid Recommender v1.8 on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

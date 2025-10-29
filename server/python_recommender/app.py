# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.7 – Intelligent Match Upgrade)
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

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Upgraded hybrid recommender with behavioral weighting and exclusion logic.",
    version="1.7"
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
# 🧩 Helper — Universal ID Extractor
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
# 🧩 Normalize User Preferences
# ======================
def normalize_user_text(user):
    prefs = user.get("preferences", {})
    topics = [t.lower().strip() for t in prefs.get("topics", [])]
    goals = [g.lower().strip() for g in prefs.get("goals", [])]

    clusters = {
        "ai": ["artificial intelligence", "machine learning", "deep learning"],
        "data": ["data science", "data analysis", "data visualization"],
        "cyber": ["cybersecurity", "network security", "ethical hacking"],
        "marketing": ["digital marketing", "seo", "social media", "content marketing"],
        "frontend": ["web development", "frontend", "html", "css", "javascript", "react"],
        "backend": ["backend", "node", "express", "fullstack", "mongodb"],
        "design": ["ui/ux", "figma", "adobe xd", "design systems"],
        "career": ["career", "freelancing", "portfolio", "certifications"],
        "entrepreneur": ["startup", "entrepreneurship", "business", "project management"]
    }

    mapped = []
    for word in topics + goals:
        for key, group in clusters.items():
            if any(g in word for g in group):
                mapped.append(key)
                break
        else:
            mapped.append(word)

    return " ".join(set(mapped)) or "learning education"


# ======================
# 🧩 Advanced Recommendation Engine
# ======================
def get_hybrid_recommendations(user, courses):
    start_time = time.time()
    print("\n🟦 [INCOMING REQUEST DATA]")
    print(f"🧠 User Preferences: {json.dumps(user.get('preferences', {}), indent=2)}")
    print(f"📚 Received {len(courses)} courses from Node.")

    # 🧼 Clean IDs
    courses = deep_clean_ids(courses)
    if len(courses) == 0:
        print("⚠️ No courses provided.")
        return []

    course_df = pd.DataFrame(courses)
    course_df["_id"] = course_df["_id"].astype(str)
    if "difficulty" not in course_df.columns:
        course_df["difficulty"] = ""

    # Combine course text for TF-IDF
    for col in ["courseTitle", "courseDescription", "tags"]:
        if col not in course_df.columns:
            course_df[col] = ""

    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    course_df["combined_text"] = (
        course_df["courseTitle"].astype(str)
        + " "
        + course_df["courseDescription"].astype(str)
        + " "
        + course_df["tags"].apply(lambda x: " ".join(x))
    )

    # 🧠 Create vector representations
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])
    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])

    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()
    print(f"📊 TF-IDF Matrix shape: {tfidf_matrix.shape}")
    print(f"🧠 User Vector Features: {np.count_nonzero(user_vector.toarray())}")

    # ==============================
    # 🤝 Enhanced Collaborative + Activity Weighting
    # ==============================
    logs = user.get("activityLog", [])
    cf_scores = np.zeros(len(course_df))

    # Activity weights
    action_weights = {
        "viewed": 0.3,
        "watched": 0.5,
        "enrolled": 0.8,
        "completed_quiz": 1.2,
        "completed_course": 1.8,
    }

    if logs:
        log_df = pd.DataFrame([
            {
                "courseId": extract_id(l.get("courseId")),
                "score": action_weights.get(l.get("action", "").lower(), 0.4),
            }
            for l in logs
        ])
        log_df = log_df.groupby("courseId")["score"].mean().reset_index()
        for idx, cid in enumerate(course_df["_id"]):
            match = log_df[log_df["courseId"] == cid]
            if not match.empty:
                cf_scores[idx] = match["score"].values[0]

    # ==============================
    # ⚖️ Smart Hybrid Scoring Logic
    # ==============================
    # Balance content + collaborative + difficulty + topicality
    content_weight = 0.65
    collab_weight = 0.35

    hybrid_scores = (content_weight * content_scores) + (collab_weight * cf_scores)

    # Difficulty match boost
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # ==============================
    # 🚫 Exclude Already Enrolled / Completed
    # ==============================
    enrolled_ids = set(str(extract_id(c.get("_id"))) for c in user.get("enrolledCourses", []))
    completed_ids = set(
        extract_id(l.get("courseId")) for l in logs if l.get("action") == "completed_course"
    )
    exclude_ids = enrolled_ids.union(completed_ids)

    course_df["score"] = hybrid_scores
    course_df = course_df[~course_df["_id"].isin(exclude_ids)]
    print(f"🚫 Excluded {len(exclude_ids)} enrolled/completed courses.")

    if course_df.empty:
        print("⚠️ All recommended courses were filtered out. Returning fallback.")
        return []

    # Rank & pick top
    top = course_df.sort_values("score", ascending=False).head(5)
    recs = top.to_dict(orient="records")

    # Clean IDs for output
    for r in recs:
        r["_id"] = extract_id(r.get("_id", ""))

    print("🧾 Final Recommendation IDs:", [r["_id"] for r in recs])
    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("Preferred Difficulty:", preferred_diff)
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
    print(f"🚀 Starting Hecademy Hybrid Recommender v1.7 on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

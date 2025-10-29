# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.6)
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
import re

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Hybrid engine combining content-based, collaborative, and difficulty weighting.",
    version="1.6.0"
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
# 🧩 Helper — Clean ObjectIDs robustly
# ======================
def fix_id(v):
    """Recursively flatten ObjectIDs, Buffers, or nested dicts into clean string IDs."""
    if v is None:
        return ""
    if isinstance(v, dict):
        # Mongo-style {"$oid": "..."}
        if "$oid" in v:
            return str(v["$oid"])
        # Nested _id fields
        if "_id" in v:
            return fix_id(v["_id"])
        # Node.js Buffer object
        if "buffer" in v and "data" in v["buffer"]:
            data = v["buffer"].get("data", [])
            try:
                return "".join(format(x, "02x") for x in data)
            except Exception:
                return str(data)
        # Numeric key dicts like {"0": {...}, "1": {...}}
        for key, val in v.items():
            if isinstance(val, dict) and "$oid" in val:
                return str(val["$oid"])
            if isinstance(val, str) and len(val) >= 12 and all(c in "0123456789abcdef" for c in val.lower()):
                return val
        # Default flatten
        return str(v)
    if isinstance(v, (list, tuple, set)):
        return ", ".join(str(x) for x in v)
    if isinstance(v, (bytes, bytearray)):
        return v.hex()
    if isinstance(v, str):
        return v.strip()
    return str(v)


# ======================
# 🧩 Normalize user topics & goals
# ======================
def normalize_user_text(user):
    prefs = user.get("preferences", {})
    topics = [t.lower().strip() for t in prefs.get("topics", [])]
    goals = [g.lower().strip() for g in prefs.get("goals", [])]

    clusters = {
        "ai": ["artificial intelligence", "machine learning", "deep learning", "applied ai"],
        "data": ["data science", "data analysis", "data visualization"],
        "cyber": ["cybersecurity", "network security", "ethical hacking", "security practices"],
        "marketing": ["digital marketing", "seo", "social media marketing", "content marketing", "analytics", "marketing strategy"],
        "frontend": ["web development", "frontend development", "html", "css", "javascript", "react"],
        "backend": ["backend development", "node.js", "fullstack development"],
        "design": ["ui/ux", "ui design", "ux design", "web design", "figma", "adobe xd", "prototyping"],
        "career": ["career growth", "job readiness", "freelancing", "portfolio building", "certifications"],
        "entrepreneur": ["startup", "entrepreneurship", "business analytics", "project management"]
    }

    mapped = []
    for word in topics + goals:
        added = False
        for key, group in clusters.items():
            if any(g in word for g in group):
                mapped.append(key)
                added = True
                break
        if not added:
            mapped.append(word)

    return " ".join(set(mapped)) or "learning education"


# ======================
# 🧩 Hybrid Recommendation Logic
# ======================
def get_hybrid_recommendations(user, courses):
    if not courses:
        print("⚠️ No courses provided.")
        return []

    # ------------------------------
    # 🧱 Step 1: Pre-clean IDs before DataFrame
    # ------------------------------
    for c in courses:
        if "_id" in c:
            c["_id"] = fix_id(c["_id"])

    course_df = pd.DataFrame(courses)
    if "_id" not in course_df.columns:
        course_df["_id"] = ""
    course_df["_id"] = course_df["_id"].apply(fix_id)

    def normalize_column(df, old, new):
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    normalize_column(course_df, "courseTitle", "title")
    normalize_column(course_df, "courseDescription", "description")
    normalize_column(course_df, "courseTags", "tags")

    # Fill missing columns
    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])

    # ------------------------------
    # 🧩 Step 2: Build combined course text safely
    # ------------------------------
    course_df["combined_text"] = (
        course_df["title"].astype(str)
        + " "
        + course_df["description"].astype(str)
        + " "
        + course_df["tags"].apply(lambda x: " ".join(x))
    )

    # 🧼 Clean HTML tags and strip
    course_df["combined_text"] = course_df["combined_text"].replace(
        to_replace=r"<.*?>", value="", regex=True
    ).str.strip()

    # 🧩 Fallback for empty text
    course_df["combined_text"] = course_df["combined_text"].apply(
        lambda t: t if isinstance(t, str) and len(t.strip()) > 3 else "untitled course content"
    )

    # 🚨 Vocabulary safety check
    if course_df["combined_text"].isna().all() or not any(course_df["combined_text"].str.strip()):
        print("⚠️ All course text empty — returning fallback recommendations.")
        return course_df.head(5).to_dict(orient="records")

    # ------------------------------
    # 🧩 Step 3: Content-Based Filtering
    # ------------------------------
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=7000, min_df=1)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])

    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # ------------------------------
    # 🤝 Step 4: Collaborative Filtering (Activity-based)
    # ------------------------------
    logs = user.get("activityLog", [])
    cf_scores = np.zeros(len(course_df))

    if logs:
        df_logs = pd.DataFrame([
            {"courseId": fix_id(log.get("courseId")), "score": 1.5 if log.get("action") == "completed_quiz" else 1.0}
            for log in logs
        ])
        df_logs = df_logs.groupby("courseId").mean().reset_index()

        for idx, cid in enumerate(course_df["_id"].astype(str)):
            match = df_logs[df_logs["courseId"] == cid]
            if not match.empty:
                cf_scores[idx] = match["score"].values[0]

    # ------------------------------
    # ⚖️ Step 5: Weighted Hybrid Scoring
    # ------------------------------
    hybrid_scores = 0.65 * content_scores + 0.35 * cf_scores

    # ------------------------------
    # 🎚️ Step 6: Difficulty Weight
    # ------------------------------
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # ------------------------------
    # 🧊 Step 7: Cold Start Fallback
    # ------------------------------
    if not np.any(hybrid_scores):
        print("⚠️ Cold start triggered — returning top 5 popular or new courses.")
        if "rating" in course_df.columns:
            fallback = course_df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in course_df.columns:
            fallback = course_df.sort_values("createdAt", ascending=False).head(5)
        else:
            fallback = course_df.head(5)
        fallback["_id"] = fallback["_id"].apply(fix_id)
        return fallback.to_dict(orient="records")

    # ------------------------------
    # 🏁 Step 8: Rank, Clean, Return
    # ------------------------------
    course_df["score"] = hybrid_scores
    top = course_df.sort_values("score", ascending=False).head(5)
    top["_id"] = top["_id"].apply(fix_id)

    recs = top.to_dict(orient="records")

    # ✅ Final cleanup
    for r in recs:
        if not isinstance(r.get("_id"), str):
            r["_id"] = fix_id(r["_id"])
        if "[object" in str(r["_id"]):
            r["_id"] = fix_id(r["_id"])

    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("Preferred Difficulty:", preferred_diff)
    print("Top 5 Course IDs:", [r["_id"] for r in recs])
    print("========================================\n")

    return recs


# ======================
# 🔗 API Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        recs = get_hybrid_recommendations(req.user, req.courses)
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
    print(f"🚀 Starting Hecademy Hybrid Recommender v1.6 on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

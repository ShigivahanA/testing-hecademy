# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.5.2)
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
    version="1.5.2"
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
# 🧩 Helper — Clean Mongo ObjectIDs safely and recursively
# ======================
def clean_object_id(value):
    """
    Safely extract a Mongo ObjectId (24-char hex) from any nested or stringified structure.
    Handles cases like:
      - {"$oid": "..."}
      - {"_id": {"$oid": "..."}}
      - "ObjectId('...')"
      - nested dicts with courseId, buffer, etc.
    """
    try:
        if not value:
            return ""

        # 1️⃣ String case
        if isinstance(value, str):
            # remove wrappers like ObjectId('...')
            val = re.sub(r"[^0-9a-fA-F]", "", value)
            return val if len(val) == 24 else ""

        # 2️⃣ Dict case
        if isinstance(value, dict):
            if "$oid" in value:
                return str(value["$oid"])
            if "_id" in value:
                return clean_object_id(value["_id"])
            if "courseId" in value:
                return clean_object_id(value["courseId"])
            if "buffer" in value and isinstance(value["buffer"], dict):
                data = value["buffer"].get("data", [])
                try:
                    hexid = "".join(format(x, "02x") for x in data)
                    return hexid if len(hexid) == 24 else ""
                except Exception:
                    pass

            # recursive fallback: search any nested dict values
            for v in value.values():
                possible = clean_object_id(v)
                if possible:
                    return possible
            return ""

        # 3️⃣ Unexpected types (numeric, list, etc.)
        s = str(value)
        val = re.sub(r"[^0-9a-fA-F]", "", s)
        return val if len(val) == 24 else ""

    except Exception as e:
        print(f"⚠️ clean_object_id error: {e} | value={value}")
        return ""


# ======================
# 🧩 Normalize user topics & goals
# ======================
def normalize_user_text(user):
    """Normalize messy topic/goal words into semantic clusters for TF-IDF."""
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
    # 🧱 Step 1: Normalize course data
    # ------------------------------
    course_df = pd.DataFrame(courses)

    def normalize_column(df, old, new):
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    normalize_column(course_df, "courseTitle", "title")
    normalize_column(course_df, "courseDescription", "description")
    normalize_column(course_df, "courseTags", "tags")

    # 🔧 Clean all IDs safely
    if "_id" in course_df.columns:
        course_df["_id"] = course_df["_id"].apply(clean_object_id)

    # Fill missing columns
    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    course_df["combined_text"] = (
        course_df["title"].astype(str) + " " +
        course_df["description"].astype(str) + " " +
        course_df["tags"].apply(lambda x: " ".join(x))
    )

    # ------------------------------
    # 🧩 Step 2: Content-Based Filtering
    # ------------------------------
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=7000)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])

    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # ------------------------------
    # 🤝 Step 3: Collaborative Filtering
    # ------------------------------
    logs = user.get("activityLog", [])
    cf_scores = np.zeros(len(course_df))

    if logs:
        df_logs = pd.DataFrame([
            {"courseId": clean_object_id(log.get("courseId")), "score": 1.5 if log.get("action") == "completed_quiz" else 1.0}
            for log in logs
        ])
        df_logs = df_logs.groupby("courseId").mean().reset_index()

        for idx, cid in enumerate(course_df["_id"].astype(str)):
            match = df_logs[df_logs["courseId"] == cid]
            if not match.empty:
                cf_scores[idx] = match["score"].values[0]

    # ------------------------------
    # ⚖️ Step 4: Weighted Hybrid Scoring
    # ------------------------------
    hybrid_scores = 0.65 * content_scores + 0.35 * cf_scores

    # ------------------------------
    # 🎚️ Step 5: Difficulty Weight
    # ------------------------------
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # ------------------------------
    # 🧊 Step 6: Cold Start Fallback
    # ------------------------------
    if not np.any(hybrid_scores):
        print("⚠️ Cold start triggered — returning top 5 fallback courses.")
        if "rating" in course_df.columns:
            fallback = course_df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in course_df.columns:
            fallback = course_df.sort_values("createdAt", ascending=False).head(5)
        else:
            fallback = course_df.head(5)

        fallback["_id"] = fallback["_id"].apply(clean_object_id)
        fallback = fallback[fallback["_id"].apply(lambda x: isinstance(x, str) and len(x) == 24)]
        return fallback.to_dict(orient="records")

    # ------------------------------
    # 🏁 Step 7: Rank, Validate, Clean IDs
    # ------------------------------
    course_df["score"] = hybrid_scores
    top = course_df.sort_values("score", ascending=False).head(5)
    top["_id"] = top["_id"].apply(clean_object_id)

    # Filter valid Mongo IDs (exactly 24 hex chars)
    top = top[top["_id"].apply(lambda x: isinstance(x, str) and len(x) == 24)]

    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("Normalized:", user_text)
    print("Preferred Difficulty:", preferred_diff)
    print("Total Courses:", len(course_df))
    print("Top 5 Results:", top[['_id', 'title', 'score']].to_dict(orient='records'))
    print("========================================\n")

    return top.to_dict(orient="records")


# ======================
# 🔗 API Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        recs = get_hybrid_recommendations(req.user, req.courses)

        # 🧹 Final cleaning for IDs before response
        for r in recs:
            r["_id"] = clean_object_id(r.get("_id", ""))
        recs = [r for r in recs if r.get("_id") and len(str(r["_id"])) == 24]

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
    print(f"🚀 Starting Hecademy Hybrid Recommender on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

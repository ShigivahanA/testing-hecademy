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
import ast  # ✅ to safely parse stringified dicts

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
# 🧩 Helper — Clean IDs safely (final, robust version)
# ======================
def clean_object_id(value):
    """Ensure Mongo-like ObjectIDs, Buffers, or stringified dicts become consistent 24-char hex strings."""
    try:
        if value is None:
            return ""

        # 🧠 If it's a stringified dict, safely parse it first
        if isinstance(value, str) and value.strip().startswith("{") and "$oid" in value:
            try:
                parsed = ast.literal_eval(value)
                if isinstance(parsed, dict):
                    value = parsed
            except Exception:
                pass  # if parsing fails, continue with raw string

        # 🧩 Handle dicts containing Mongo formats
        if isinstance(value, dict):
            if "$oid" in value:
                return str(value["$oid"])
            elif "_id" in value:
                return clean_object_id(value["_id"])
            elif "buffer" in value and "data" in value["buffer"]:
                data = value["buffer"].get("data", [])
                try:
                    hexid = "".join(format(x, "02x") for x in data)
                    return hexid if len(hexid) == 24 else ""
                except Exception:
                    return ""
            elif "courseId" in value:
                return clean_object_id(value["courseId"])

        # 🧩 Handle plain ObjectId strings
        if isinstance(value, str):
            val = value.strip()
            # if looks like hex ObjectId
            if len(val) == 24 and all(c in "0123456789abcdef" for c in val.lower()):
                return val
            # if still contains $oid inside the string (edge case)
            match = re.search(r"'?\$oid'?:\s*'([0-9a-f]{24})'", val)
            if match:
                return match.group(1)
            return val

        # fallback
        return str(value)
    except Exception as e:
        print(f"⚠️ clean_object_id error: {e} | value={value}")
        return ""


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

    course_df = pd.DataFrame(courses)

    # normalize column names
    def normalize_column(df, old, new):
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    normalize_column(course_df, "courseTitle", "title")
    normalize_column(course_df, "courseDescription", "description")
    normalize_column(course_df, "courseTags", "tags")

    # 🧹 Clean all IDs safely
    if "_id" in course_df.columns:
        course_df["_id"] = course_df["_id"].apply(clean_object_id)

    # sanity log: show first 3 course IDs received
    print("🧩 First 3 course IDs received:", list(course_df["_id"].head(3)))

    # fill missing cols
    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    course_df["combined_text"] = (
        course_df["title"].astype(str) + " " +
        course_df["description"].astype(str) + " " +
        course_df["tags"].apply(lambda x: " ".join(x))
    )

    # content-based similarity
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=7000)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])
    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # collaborative filtering
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

    # hybrid score
    hybrid_scores = 0.65 * content_scores + 0.35 * cf_scores

    # difficulty weight
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # fallback if cold start
    if not np.any(hybrid_scores):
        print("⚠️ Cold start triggered — returning top 5 popular or new courses.")
        if "rating" in course_df.columns:
            fallback = course_df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in course_df.columns:
            fallback = course_df.sort_values("createdAt", ascending=False).head(5)
        else:
            fallback = course_df.head(5)
        fallback["_id"] = fallback["_id"].apply(clean_object_id)
        return fallback.to_dict(orient="records")

    # rank + clean
    course_df["score"] = hybrid_scores
    top = course_df.sort_values("score", ascending=False).head(5)
    top["_id"] = top["_id"].apply(clean_object_id)
    top = top[top["_id"].apply(lambda x: isinstance(x, str) and len(x) >= 12)]

    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("Preferred Difficulty:", preferred_diff)
    print("Top 5 IDs:", top["_id"].tolist())
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
        for r in recs:
            r["_id"] = clean_object_id(r.get("_id", ""))
        recs = [r for r in recs if r.get("_id") and len(str(r["_id"])) >= 10]
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

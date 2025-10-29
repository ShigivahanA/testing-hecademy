# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.5)
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

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Combines content-based, collaborative, and difficulty-weighted filtering.",
    version="1.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to backend domain later
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
# 🧩 Helper — Robust ObjectID Cleaner
# ======================
def clean_object_id(value):
    """Ensure every _id becomes a clean string suitable for frontend URLs."""
    try:
        if value is None:
            return ""
        # Mongo-style dict
        if isinstance(value, dict):
            if "$oid" in value:
                return str(value["$oid"])
            elif "_id" in value:
                return clean_object_id(value["_id"])
            elif "courseId" in value:
                return clean_object_id(value["courseId"])
            elif "buffer" in value and "data" in value["buffer"]:
                data = value["buffer"].get("data", [])
                return "".join(format(x, "02x") for x in data) or ""
            # search nested dicts for $oid
            for k, v in value.items():
                if isinstance(v, dict) and "$oid" in v:
                    return str(v["$oid"])
            return str(value)
        # direct string id
        if isinstance(value, str):
            v = value.strip()
            if len(v) == 24 and all(c in "0123456789abcdef" for c in v.lower()):
                return v
            if v and "object" not in v.lower():
                return v
        # fallback for unknown types
        return str(value)
    except Exception:
        return ""


# ======================
# 🧩 Hybrid Recommendation Logic
# ======================
def get_hybrid_recommendations(user, courses):
    if not courses:
        print("⚠️ No courses provided.")
        return []

    # --- Normalize courses
    df = pd.DataFrame(courses)
    for old, new in [("courseTitle", "title"), ("courseDescription", "description"), ("courseTags", "tags")]:
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    if "_id" in df.columns:
        df["_id"] = df["_id"].apply(clean_object_id)

    for col in ["title", "description", "tags", "difficulty"]:
        if col not in df.columns:
            df[col] = ""
    df["tags"] = df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    df["combined_text"] = (
        df["title"].astype(str) + " " +
        df["description"].astype(str) + " " +
        df["tags"].apply(lambda x: " ".join(x))
    )

    # --- Content-Based Filtering
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(df["combined_text"])

    prefs = user.get("preferences", {})
    user_text = " ".join(prefs.get("topics", []) + prefs.get("goals", [])) or "learning education"
    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # --- Collaborative Filtering
    activity_logs = []
    for log in user.get("activityLog", []):
        score = 1
        if log.get("action") == "completed_quiz":
            score += log.get("details", {}).get("score", 0) / 100
        elif log.get("action") == "watched":
            score += 0.5
        activity_logs.append({
            "courseId": clean_object_id(log.get("courseId")),
            "score": score
        })

    if activity_logs:
        df_activity = pd.DataFrame(activity_logs)
        df_activity = df_activity.groupby("courseId").mean().reset_index()

        all_ids = df["_id"].astype(str).tolist()
        user_cf = np.zeros(len(all_ids))
        for idx, cid in enumerate(all_ids):
            if cid in df_activity["courseId"].values:
                user_cf[idx] = df_activity[df_activity["courseId"] == cid]["score"].values[0]

        if np.sum(user_cf) > 0:
            profile = np.dot(user_cf, tfidf_matrix.toarray()) / (np.sum(user_cf) + 1e-6)
            collab_scores = cosine_similarity([profile], tfidf_matrix.toarray()).flatten()
        else:
            collab_scores = np.zeros(len(df))
    else:
        collab_scores = np.zeros(len(df))

    # --- Weighted Hybrid Scoring
    hybrid_scores = 0.6 * content_scores + 0.4 * collab_scores

    # --- Difficulty Boost
    pref_diff = prefs.get("difficulty", "")
    if pref_diff:
        diff_boost = df["difficulty"].apply(
            lambda d: 1.1 if str(d).lower() == pref_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # --- Fallback if all zero
    if not np.any(hybrid_scores):
        print("⚠️ Cold start: returning top-rated/newest.")
        if "rating" in df.columns:
            top = df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in df.columns:
            top = df.sort_values("createdAt", ascending=False).head(5)
        else:
            top = df.head(5)
    else:
        df["score"] = hybrid_scores
        top = df.sort_values("score", ascending=False).head(5)

    # --- Clean IDs + filter valid
    top["_id"] = top["_id"].apply(clean_object_id)
    top = top[top["_id"].astype(str).str.len() > 10]

    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", prefs.get("topics", []))
    print("Preferred Difficulty:", pref_diff)
    print("Top Results:", top[['_id', 'title']].to_dict(orient='records'))
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
        return {"success": True, "recommended": recs}
    except Exception as e:
        print("❌ Recommender Error:", e)
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ======================
# 🚀 Run Locally
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 Starting Hecademy Hybrid Recommender on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

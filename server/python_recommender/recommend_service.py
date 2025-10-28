# ===========================================
# 🚀 Hecademy Hybrid Recommender Service
# ===========================================
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
import numpy as np
import pandas as pd
import uvicorn
import os

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Combines content-based + collaborative filtering + difficulty weighting.",
    version="1.1.0"
)

# Optional security key (set in environment)
API_KEY = os.getenv("RECOMMENDER_API_KEY")

# ======================
# 🧠 Request Model
# ======================
class RecommendationRequest(BaseModel):
    user: dict
    courses: list


# ======================
# 🧩 Hybrid Recommender
# ======================
def get_hybrid_recommendations(user, courses):
    if not courses:
        return []

    # Convert to DataFrame
    course_df = pd.DataFrame(courses)

    # Fill missing fields
    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""
    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])

    # Combine text for TF-IDF
    course_df["combined_text"] = (
        course_df["title"].astype(str) + " " +
        course_df["description"].astype(str) + " " +
        course_df["tags"].apply(lambda x: " ".join(x))
    )

    # === 1. Content-based ===
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])

    user_prefs = user.get("preferences", {})
    user_text = " ".join(user_prefs.get("topics", []) + user_prefs.get("goals", []))
    if not user_text.strip():
        user_text = "learning education"  # fallback text
    user_vector = vectorizer.transform([user_text])

    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # === 2. Collaborative (activity-based) ===
    activity_logs = []
    for log in user.get("activityLog", []):
        score = 1
        if log.get("action") == "completed_quiz":
            score += log.get("details", {}).get("score", 0) / 100
        elif log.get("action") == "watched":
            score += 0.5
        activity_logs.append({"courseId": log.get("courseId"), "score": score})

    if activity_logs:
        df_activity = pd.DataFrame(activity_logs)
        df_activity = df_activity.groupby("courseId").mean().reset_index()
        all_course_ids = course_df["_id"].astype(str).tolist()
        user_vector_cf = np.zeros(len(all_course_ids))

        for idx, cid in enumerate(all_course_ids):
            if cid in df_activity["courseId"].astype(str).values:
                user_vector_cf[idx] = df_activity[
                    df_activity["courseId"].astype(str) == cid
                ]["score"].values[0]

        nn = NearestNeighbors(metric="cosine", algorithm="brute")
        nn.fit(tfidf_matrix)
        distances, _ = nn.kneighbors([user_vector_cf], n_neighbors=len(all_course_ids))
        collaborative_scores = 1 - distances.flatten()
    else:
        collaborative_scores = np.zeros(len(course_df))

    # === 3. Weighted hybrid ===
    hybrid_scores = 0.6 * content_scores + 0.4 * collaborative_scores

    # === 4. Difficulty weighting ===
    preferred_diff = user_prefs.get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.1 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores = hybrid_scores * diff_boost

    # === 5. Cold start fallback ===
    if not np.any(hybrid_scores):
        # Recommend top-rated or newest courses
        if "rating" in course_df.columns:
            top_courses = course_df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in course_df.columns:
            top_courses = course_df.sort_values("createdAt", ascending=False).head(5)
        else:
            top_courses = course_df.head(5)
        return top_courses.to_dict(orient="records")

    # === 6. Sort and return top 5 ===
    course_df["score"] = hybrid_scores
    top_courses = course_df.sort_values("score", ascending=False).head(5)
    return top_courses.to_dict(orient="records")


# ======================
# 🔗 API Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    # 🔒 Security check (optional)
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        recommendations = get_hybrid_recommendations(req.user, req.courses)
        return {"success": True, "recommended": recommendations}
    except Exception as e:
        print("❌ Recommender Error:", str(e))
        return {"success": False, "error": str(e)}


# ======================
# 🚀 Run (for local dev)
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)

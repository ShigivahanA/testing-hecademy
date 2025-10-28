# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.3)
# ===========================================
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
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
    version="1.3.0"
)

# Optional API key (set this in your environment if needed)
API_KEY = os.getenv("RECOMMENDER_API_KEY")


# ======================
# 🧠 Request Model
# ======================
class RecommendationRequest(BaseModel):
    user: dict
    courses: list


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

    # Handle alternate field names
    normalize_column(course_df, "courseTitle", "title")
    normalize_column(course_df, "courseDescription", "description")
    normalize_column(course_df, "courseTags", "tags")

    # Clean MongoDB-style ObjectIDs
    if "_id" in course_df.columns:
        course_df["_id"] = course_df["_id"].apply(
            lambda x: x.get("$oid") if isinstance(x, dict) and "$oid" in x else str(x)
        )

    # Fill missing essential columns
    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    # Ensure tags are lists
    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])

    # Combine fields for TF-IDF vectorization
    course_df["combined_text"] = (
        course_df["title"].astype(str) + " " +
        course_df["description"].astype(str) + " " +
        course_df["tags"].apply(lambda x: " ".join(x))
    )

    # ------------------------------
    # 🧩 Step 2: Content-Based Filtering
    # ------------------------------
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])

    user_prefs = user.get("preferences", {})
    user_text = " ".join(user_prefs.get("topics", []) + user_prefs.get("goals", []))
    if not user_text.strip():
        user_text = "learning education"  # fallback text

    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # ------------------------------
    # 🤝 Step 3: Collaborative Filtering (fixed)
    # ------------------------------
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
        df_activity["courseId"] = df_activity["courseId"].apply(
            lambda x: x.get("$oid") if isinstance(x, dict) and "$oid" in x else str(x)
        )
        df_activity = df_activity.groupby("courseId").mean().reset_index()

        all_course_ids = course_df["_id"].astype(str).tolist()
        user_vector_cf = np.zeros(len(all_course_ids))

        # Build user-course engagement vector
        for idx, cid in enumerate(all_course_ids):
            if cid in df_activity["courseId"].values:
                user_vector_cf[idx] = df_activity[df_activity["courseId"] == cid]["score"].values[0]

        # Compute collaborative similarity:
        # Create a weighted "user profile" from courses user engaged with
        if np.sum(user_vector_cf) > 0:
            user_profile_vector = np.dot(user_vector_cf, tfidf_matrix.toarray()) / (np.sum(user_vector_cf) + 1e-6)
            collaborative_scores = cosine_similarity(
                [user_profile_vector], tfidf_matrix.toarray()
            ).flatten()
        else:
            collaborative_scores = np.zeros(len(course_df))
    else:
        collaborative_scores = np.zeros(len(course_df))

    # ------------------------------
    # ⚖️ Step 4: Weighted Hybrid Scoring
    # ------------------------------
    hybrid_scores = 0.6 * content_scores + 0.4 * collaborative_scores

    # ------------------------------
    # 🎚️ Step 5: Difficulty Preference Boost
    # ------------------------------
    preferred_diff = user_prefs.get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.1 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores = hybrid_scores * diff_boost

    # ------------------------------
    # 🧊 Step 6: Cold Start Fallback
    # ------------------------------
    if not np.any(hybrid_scores):
        if "rating" in course_df.columns:
            top_courses = course_df.sort_values("rating", ascending=False).head(5)
        elif "createdAt" in course_df.columns:
            top_courses = course_df.sort_values("createdAt", ascending=False).head(5)
        else:
            top_courses = course_df.head(5)
        print("⚠️ Cold start: returning top-rated/newest courses.")
        return top_courses.to_dict(orient="records")

    # ------------------------------
    # 🏁 Step 7: Rank and Return
    # ------------------------------
    course_df["score"] = hybrid_scores
    top_courses = course_df.sort_values("score", ascending=False).head(5)

    # Debugging logs
    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user_prefs.get("topics", []))
    print("Total Courses:", len(course_df))
    print("Top Results:", top_courses[["title", "score"]].to_dict(orient="records"))
    print("========================================\n")

    return top_courses.to_dict(orient="records")


# ======================
# 🔗 API Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    # Optional security check
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        recommendations = get_hybrid_recommendations(req.user, req.courses)
        return {"success": True, "recommended": recommendations}
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

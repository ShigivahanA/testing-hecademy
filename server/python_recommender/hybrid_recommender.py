from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
import numpy as np
import pandas as pd

def get_hybrid_recommendations(user, courses):
    course_df = pd.DataFrame(courses)
    course_df["combined_text"] = (
        course_df["title"] + " " +
        course_df["description"] + " " +
        course_df["tags"].apply(lambda x: " ".join(x))
    )

    # === 1. Content-based ===
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])
    user_text = " ".join(
        user.get("preferences", {}).get("topics", []) +
        user.get("preferences", {}).get("goals", [])
    )
    user_vector = vectorizer.transform([user_text])
    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # === 2. Collaborative (activity-based) ===
    activity_logs = []
    for log in user.get("activityLog", []):
        score = 1
        if log["action"] == "completed_quiz":
            score += log["details"].get("score", 0) / 100
        elif log["action"] == "watched":
            score += 0.5
        activity_logs.append({"courseId": log["courseId"], "score": score})

    if activity_logs:
        df_activity = pd.DataFrame(activity_logs)
        df_activity = df_activity.groupby("courseId").mean().reset_index()
        all_course_ids = course_df["_id"].tolist()
        user_vector_cf = np.zeros(len(all_course_ids))
        for idx, cid in enumerate(all_course_ids):
            if cid in df_activity["courseId"].values:
                user_vector_cf[idx] = df_activity[
                    df_activity["courseId"] == cid
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
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.1 if d == preferred_diff else 1.0
        )
        hybrid_scores = hybrid_scores * diff_boost

    # === 5. Sort and return top 5 ===
    course_df["score"] = hybrid_scores
    top_courses = course_df.sort_values("score", ascending=False).head(5)
    return top_courses.to_dict(orient="records")

# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.9 – Semantic Threshold Edition)
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
import os, json, traceback, time, re

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="v1.9 – semantic topic distance & score-threshold filtered hybrid recommender.",
    version="1.9"
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
# 🧠 Models
# ======================
class RecommendationRequest(BaseModel):
    user: dict
    courses: list


# ======================
# 🧩 Utilities
# ======================
def extract_id(value):
    """Safely extract string IDs from Mongo-style or nested objects."""
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
    """Recursively clean all nested _id fields into strings."""
    if isinstance(obj, list):
        return [deep_clean_ids(o) for o in obj]
    elif isinstance(obj, dict):
        return {k: (extract_id(v) if k == "_id" else deep_clean_ids(v)) for k, v in obj.items()}
    else:
        return obj


# ======================
# 🧩 Topic Cluster Definitions
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
    """Infer which topic cluster a course belongs to."""
    text = text.lower()
    for cluster, keys in topic_clusters.items():
        if any(k in text for k in keys):
            return cluster
    return "general"

def detect_user_topics(user):
    """Infer which clusters the user’s preferences belong to."""
    prefs = user.get("preferences", {})
    text = " ".join(prefs.get("topics", []) + prefs.get("goals", []))
    mapped = set()
    for cluster, keys in topic_clusters.items():
        if any(k in text.lower() for k in keys):
            mapped.add(cluster)
    return mapped or {"general"}

def normalize_user_text(user):
    """Convert user’s preference fields into normalized input for TF-IDF."""
    prefs = user.get("preferences", {})
    topics = [t.lower().strip() for t in prefs.get("topics", [])]
    goals = [g.lower().strip() for g in prefs.get("goals", [])]
    return " ".join(set(topics + goals)) or "learning education"


# ======================
# 🧩 Core Hybrid Recommender
# ======================
def get_hybrid_recommendations(user, courses):
    start = time.time()
    print("\n📨 Incoming /recommend request received.")
    print("🟦 [INCOMING REQUEST DATA]")
    print(f"🧠 User Preferences: {json.dumps(user.get('preferences', {}), indent=2)}")

    # Clean & prepare course data
    courses = deep_clean_ids(courses)
    if not courses:
        print("⚠️ No courses provided.")
        return []

    df = pd.DataFrame(courses)
    print(f"📚 Received {len(df)} courses from Node.")

    for col in ["courseTitle", "courseDescription", "tags", "difficulty"]:
        if col not in df.columns:
            df[col] = ""
    df["_id"] = df["_id"].astype(str)
    df["tags"] = df["tags"].apply(lambda x: x if isinstance(x, list) else [])
    df["combined_text"] = (
        df["courseTitle"].astype(str)
        + " "
        + df["courseDescription"].astype(str)
        + " "
        + df["tags"].apply(lambda x: " ".join(x))
    )
    df["combined_text"] = df["combined_text"].replace(to_replace=r"<.*?>", value="", regex=True)

    print(f"🧾 DataFrame shape: {df.shape}")
    print("🧾 Columns:", df.columns.tolist())
    print("🧹 Sample combined text snippet:", df["combined_text"].iloc[0][:200])

    # TF-IDF
    vect = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000)
    tfidf = vect.fit_transform(df["combined_text"])
    user_text = normalize_user_text(user)
    user_vec = vect.transform([user_text])
    content_scores = cosine_similarity(user_vec, tfidf).flatten()

    print(f"📊 TF-IDF Matrix shape: {tfidf.shape}")
    print(f"🧠 User Vector Features: {np.count_nonzero(user_vec.toarray())}")

    # Collaborative Filtering from activity logs
    logs = user.get("activityLog", [])
    cf = np.zeros(len(df))
    weights = {
        "viewed": 0.3,
        "watched": 0.5,
        "enrolled": 0.8,
        "completed_quiz": 1.2,
        "completed_course": 1.8
    }

    if logs:
        ldf = pd.DataFrame([
            {"courseId": extract_id(l.get("courseId")),
             "score": weights.get(l.get("action", "").lower(), 0.4)}
            for l in logs
        ])
        ldf = ldf.groupby("courseId")["score"].mean().reset_index()
        for i, cid in enumerate(df["_id"]):
            m = ldf[ldf["courseId"] == cid]
            if not m.empty:
                cf[i] = m["score"].values[0]

    # Hybrid score
    scores = 0.65 * content_scores + 0.35 * cf

    # Difficulty alignment boost
    diff = user.get("preferences", {}).get("difficulty", "")
    if diff:
        diff_boost = df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == diff.lower() else 1.0
        )
        scores *= diff_boost

    # Topic penalty
    user_clusters = detect_user_topics(user)
    df["course_cluster"] = df["combined_text"].apply(detect_course_topic)
    penalty = df["course_cluster"].apply(lambda c: 1.0 if c in user_clusters else 0.5)
    scores *= penalty

    # Exclude enrolled or completed
    enrolled = set(str(extract_id(c.get("_id"))) for c in user.get("enrolledCourses", []))
    completed = set(extract_id(l.get("courseId")) for l in logs if l.get("action") == "completed_course")
    exclude = enrolled.union(completed)
    before = len(df)
    df["score"] = scores
    df = df[~df["_id"].isin(exclude)]
    print(f"🚫 Excluded {len(exclude)} enrolled/completed courses ({before - len(df)} removed).")

    # Progression boost
    def progression(row):
        title = row["courseTitle"].lower()
        if any(k in title for k in ["advanced", "pro", "expert", "next level"]):
            return 1.3
        if any(k in title for k in ["beginner", "intro", "fundamentals"]) and \
           any(e in title for e in ["javascript", "html", "css"]) and \
           ("frontend" in user_clusters or "backend" in user_clusters):
            return 0.5
        return 1.0

    df["score"] *= df.apply(progression, axis=1)
    print(f"🧮 Hybrid Score Range: min={df['score'].min():.4f}, max={df['score'].max():.4f}")

    # ✅ SEMANTIC THRESHOLD FILTER
    max_score = df["score"].max() if not df.empty else 0
    if max_score > 0:
        threshold = max(0.05, 0.25 * max_score)
        filtered = df[df["score"] >= threshold]
        print(f"🧮 Threshold = {threshold:.4f} | Filtered out {len(df) - len(filtered)} low-relevance courses.")
        df = filtered

    # Rank
    top = df.sort_values("score", ascending=False).head(5)
    recs = top.to_dict(orient="records")
    for r in recs:
        r["_id"] = extract_id(r.get("_id", ""))

    print("🧾 Final Recommendation IDs:", [r["_id"] for r in recs])
    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("User Topic Clusters:", list(user_clusters))
    for r in recs:
        print(f"   {r['_id']} → {r.get('courseTitle','')[:60]} ({round(r.get('score',0),4)})")
    print("========================================")
    print(f"🕒 Processing Time: {round(time.time()-start,3)}s\n")

    return recs


# ======================
# 🔗 Endpoint
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        recs = get_hybrid_recommendations(req.user, req.courses)
        print("📤 Outgoing Response Summary:")
        print(json.dumps({"count": len(recs), "ids": [r.get('_id') for r in recs]}, indent=2))
        print("========================================================\n")
        return {"success": True, "recommended": recs}
    except Exception as e:
        print("❌ Recommender Error:", str(e))
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ======================
# 🚀 Run
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 Starting Hecademy Hybrid Recommender v1.9 on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

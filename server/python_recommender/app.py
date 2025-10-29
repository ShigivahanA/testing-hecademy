# ===========================================
# 🚀 Hecademy Hybrid Recommender Service (v1.6.5 – ID Fix & Refinement)
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
import json
import time

# ======================
# ⚙️ FastAPI setup
# ======================
app = FastAPI(
    title="Hecademy Hybrid Recommender API",
    description="Hybrid engine combining content-based, collaborative, and difficulty weighting.",
    version="1.6.5" # Updated version number
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
# 🧩 Robust ID Extractor (Handles Any Format) - SLIGHTLY REFINED
# ======================
def extract_id(value):
    """Handles every possible _id shape including nested, buffer, or numeric-key dicts."""
    if value is None:
        return ""
    
    # Base case: Already a string
    if isinstance(value, str):
        # Basic validation for common Mongo ID-like string format to prevent passing back large object strings
        if len(value) > 5 and value not in ["", "None", "[object Object]"]:
             return value
        return value

    # Dictionary handling
    if isinstance(value, dict):
        # 1️⃣ Mongo style: {"$oid": "..."}
        if "$oid" in value:
            return str(value["$oid"])
        
        # 2️⃣ Nested _id: {"_id": {"$oid": "..."}}
        if "_id" in value:
            res = extract_id(value["_id"])
            if res:
                return res
        
        # 3️⃣ Node buffer: {"buffer": {"data": [...]}}
        if "buffer" in value and "data" in value["buffer"]:
            data = value["buffer"].get("data", [])
            # Convert byte data to hex string
            if isinstance(data, list):
                return "".join(format(x, "02x") for x in data)
            
        # 4️⃣ Search all inner values recursively
        for k, v in value.items():
            if isinstance(v, dict) or (isinstance(v, list) and v and isinstance(v[0], dict)):
                res = extract_id(v)
                if res and len(res) > 5: # Only return valid-looking ID strings
                    return res
        
        # Fallback to string of dict (should be avoided)
        return "" # Changed from str(value) to "" to prevent ["object Object"] string pollution
    
    # List/Tuple handling (e.g., list of IDs, or list of ID dicts)
    if isinstance(value, (list, tuple, set)):
        # Only return the first valid ID found in a list
        for v in value:
            res = extract_id(v)
            if res and len(res) > 5:
                return res
        return ""

    return str(value)


# ======================
# 🧩 Deep Cleaner — Fix IDs inside nested dicts/lists
# ======================
# NOTE: This function is mostly redundant if the DataFrame processing (Step 1) is correct,
# but we keep it for robustness in case nested data like 'courseContent' has an '_id'.
def deep_clean_ids(obj):
    """Recursively fix _id fields in nested dicts and lists."""
    if isinstance(obj, list):
        return [deep_clean_ids(o) for o in obj]
    elif isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if k == "_id":
                # Ensure the _id field in the final output dict is a clean string ID
                cleaned[k] = extract_id(v)
            else:
                cleaned[k] = deep_clean_ids(v)
        return cleaned
    else:
        return obj


# ======================
# 🧩 Normalize user topics & goals (UNMODIFIED)
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
# 🧩 Main Hybrid Recommendation Logic - CRITICAL CHANGES IN STEPS 1 & 9
# ======================
def get_hybrid_recommendations(user, courses):
    start_time = time.time()
    print("\n🟦 [INCOMING REQUEST DATA]")
    # ... (omitted logging for brevity)
    # The original log data for User Preferences, Course Count, and Sample Keys is helpful.
    print(f"🧠 User Preferences: {json.dumps(user.get('preferences', {}), indent=2)}")
    print(f"📚 Received {len(courses)} courses from Node.")
    if len(courses) > 0:
        print("📋 Sample Course Keys:", list(courses[0].keys())[:10])

    if not courses:
        print("⚠️ No courses provided.")
        return []

    # ------------------------------
    # 🧱 Step 1: Clean IDs before DataFrame - CRITICAL FIX
    # ------------------------------
    # Pre-clean the list of dicts before creating the DataFrame to ensure _id is a string.
    cleaned_courses = []
    for c in courses:
        # Create a copy and ensure _id is a string
        clean_c = c.copy()
        clean_c["_id"] = extract_id(c.get("_id", ""))
        cleaned_courses.append(clean_c)

    course_df = pd.DataFrame(cleaned_courses)
    
    # DOUBLE CHECK: Re-apply extract_id on the DataFrame column as a safeguard
    if "_id" not in course_df.columns:
        course_df["_id"] = ""
    # The crucial step is ensuring the column is applied AND explicitly converted to string type
    course_df["_id"] = course_df["_id"].apply(extract_id).astype(str) 

    print(f"🧾 DataFrame shape: {course_df.shape}")
    print("🧾 Columns:", course_df.columns.tolist())

    # ------------------------------
    # 🧩 Step 2-8: (Unmodified Logic: Normalize, Combine Text, TF-IDF, CF, Hybrid Score, Difficulty Boost, Cold Start)
    # ------------------------------
    # ... (omitted steps 2 through 8 as they are not the source of the ID issue)
    
    # ------------------------------
    # 🧩 Step 2: Normalize course columns
    # ------------------------------
    def normalize_column(df, old, new):
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    normalize_column(course_df, "courseTitle", "title")
    normalize_column(course_df, "courseDescription", "description")
    normalize_column(course_df, "courseTags", "tags")

    for col in ["title", "description", "tags", "difficulty"]:
        if col not in course_df.columns:
            course_df[col] = ""

    course_df["tags"] = course_df["tags"].apply(lambda x: x if isinstance(x, list) else [])

    # ------------------------------
    # 🧩 Step 3: Combine course text
    # ------------------------------
    course_df["combined_text"] = (
        course_df["title"].astype(str)
        + " "
        + course_df["description"].astype(str)
        + " "
        + course_df["tags"].apply(lambda x: " ".join(x))
    )

    # Clean HTML & fallback
    course_df["combined_text"] = course_df["combined_text"].replace(
        to_replace=r"<.*?>", value="", regex=True
    ).str.strip()
    course_df["combined_text"] = course_df["combined_text"].apply(
        lambda t: t if isinstance(t, str) and len(t.strip()) > 3 else "untitled course content"
    )

    print("🧹 Sample combined text snippet:", course_df["combined_text"].iloc[0][:200])

    # ------------------------------
    # 🧩 Step 4: TF-IDF Vectorization
    # ------------------------------
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=7000)
    tfidf_matrix = vectorizer.fit_transform(course_df["combined_text"])
    print(f"📊 TF-IDF Matrix shape: {tfidf_matrix.shape}")

    user_text = normalize_user_text(user)
    user_vector = vectorizer.transform([user_text])
    print(f"🧠 User Vector (nonzero features): {np.count_nonzero(user_vector.toarray())}")

    content_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()

    # ------------------------------
    # 🤝 Step 5: Collaborative Filtering
    # ------------------------------
    logs = user.get("activityLog", [])
    cf_scores = np.zeros(len(course_df))
    if logs:
        df_logs = pd.DataFrame([
            {"courseId": extract_id(log.get("courseId")), "score": 1.5 if log.get("action") == "completed_quiz" else 1.0}
            for log in logs
        ])
        df_logs = df_logs.groupby("courseId").mean().reset_index()
        for idx, cid in enumerate(course_df["_id"].astype(str)):
            match = df_logs[df_logs["courseId"] == cid]
            if not match.empty:
                cf_scores[idx] = match["score"].values[0]

    # ------------------------------
    # ⚖️ Step 6: Hybrid Score
    # ------------------------------
    hybrid_scores = 0.65 * content_scores + 0.35 * cf_scores
    print(f"🧮 Hybrid Score Range: min={hybrid_scores.min():.4f}, max={hybrid_scores.max():.4f}")

    # ------------------------------
    # 🎚️ Step 7: Difficulty Boost
    # ------------------------------
    preferred_diff = user.get("preferences", {}).get("difficulty", "")
    if preferred_diff:
        diff_boost = course_df["difficulty"].apply(
            lambda d: 1.15 if str(d).lower() == preferred_diff.lower() else 1.0
        )
        hybrid_scores *= diff_boost

    # ------------------------------
    # 🧊 Step 8: Cold Start Fallback
    # ------------------------------
    if not np.any(hybrid_scores):
        print("⚠️ Cold start triggered — returning fallback courses.")
        return course_df.head(5).to_dict(orient="records")
        
    # ------------------------------
    # 🏁 Step 9: Rank & Clean Output - CRITICAL LOGGING FIX
    # ------------------------------
    course_df["score"] = hybrid_scores
    top = course_df.sort_values("score", ascending=False).head(5)

    # Convert to dicts first
    recs = top.to_dict(orient="records")
    
    # Then apply deep cleaning (important for nested fields)
    recs = deep_clean_ids(recs)
    
    # Filter out bad IDs from the logging array for a clean debug output
    cleaned_ids_for_log = [r["_id"] for r in recs if r.get("_id") and r.get("_id") != "[object Object]"]

    print("🧾 Cleaned Recommendation IDs:", cleaned_ids_for_log)
    print("\n✅ ===== Recommendation Debug Info =====")
    print("User Topics:", user.get("preferences", {}).get("topics", []))
    print("User Goals:", user.get("preferences", {}).get("goals", []))
    print("Preferred Difficulty:", preferred_diff)
    print("🏁 Top 5 Recommendations:")
    for r in recs:
        # Use the already cleaned string ID for logging
        clean_id = r.get('_id', '[MISSING_ID]') 
        print(f"   {clean_id} → {r.get('title', '')[:60]} ({round(r.get('score', 0), 4)})")
    print("========================================")
    print(f"🕒 Processing Time: {round(time.time() - start_time, 3)}s\n")

    return recs


# ======================
# 🔗 API Endpoint - SLIGHTLY MODIFIED LOGGING
# ======================
@app.post("/recommend")
async def recommend(req: RecommendationRequest, x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        print("\n📨 Incoming /recommend request received.")
        recs = get_hybrid_recommendations(req.user, req.courses)
        
        # Ensure only string IDs are logged in the summary
        clean_ids_for_summary = [r.get('_id') for r in recs if r.get('_id') and r.get('_id') != "[object Object]"]
        
        print("📤 Outgoing Response Summary:")
        print(json.dumps({
            "count": len(recs),
            "ids": clean_ids_for_summary
        }, indent=2))
        print("========================================================\n")
        return {"success": True, "recommended": recs}
    except Exception as e:
        print("❌ Recommender Error:", str(e))
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ======================
# 🚀 Run Locally (UNMODIFIED)
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 Starting Hecademy Hybrid Recommender v1.6.5 on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
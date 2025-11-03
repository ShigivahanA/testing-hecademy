# ===========================================
# 🤖 Hecademy AI Tutor Service (v2.3 – Course Data API Edition)
# ===========================================
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os, json, traceback, re, time

# ======================
# ⚙️ Setup
# ======================
app = FastAPI(
    title="Hecademy AI Tutor API",
    description="v2.3 – accepts course data via API instead of MongoDB connection.",
    version="2.3"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("AITUTOR_API_KEY")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ======================
# 📦 Request Models
# ======================
class Course(BaseModel):
    _id: str
    courseTitle: Optional[str] = ""
    courseDescription: Optional[str] = ""
    tags: Optional[List[str]] = []
    difficulty: Optional[str] = ""
    courseContent: Optional[List[Dict]] = []


class TutorRequest(BaseModel):
    question: str
    user: Optional[dict] = {}
    courses: List[Course]


# ======================
# 🧠 Helper Functions
# ======================
def clean_html(text: str) -> str:
    """Remove HTML tags and non-text chars."""
    return re.sub(r"<[^>]+>", "", str(text or "")).strip()


def get_embedding(text: str):
    """Generate an embedding vector for text."""
    res = client.embeddings.create(model="text-embedding-3-small", input=text)
    return res.data[0].embedding


def combine_course_text(course: dict) -> str:
    """Combine title, description, tags, and lecture titles into a single text block."""
    text = f"{course.get('courseTitle', '')} {course.get('courseDescription', '')}"
    tags = " ".join(course.get("tags", []))
    text += " " + tags

    if course.get("courseContent"):
        for chapter in course["courseContent"]:
            text += " " + chapter.get("chapterTitle", "")
            for lec in chapter.get("chapterContent", []):
                text += " " + lec.get("lectureTitle", "")

    return clean_html(text)


# ======================
# 💬 Tutor Logic
# ======================
@app.post("/ask")
async def ask_tutor(req: TutorRequest, x_api_key: Optional[str] = Header(None)):
    """AI Tutor endpoint that answers questions based on provided course data."""
    start = time.time()

    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

    try:
        question = req.question.strip()
        user = req.user or {}
        courses = [c.dict() for c in req.courses]

        if not question:
            raise ValueError("Empty question.")
        if not courses:
            raise ValueError("No course data provided.")

        print("\n📨 Incoming /ask request received.")
        print(f"🧠 Question: {question[:80]}")
        print(f"📚 Courses Received: {len(courses)}")

        # Combine and embed
        for course in courses:
            course["combined_text"] = combine_course_text(course)
            course["embedding"] = get_embedding(course["combined_text"])

        q_emb = get_embedding(question)
        sims = [cosine_similarity([q_emb], [c["embedding"]])[0][0] for c in courses]
        best_idx = int(np.argmax(sims))
        context = courses[best_idx]

        print(f"🔍 Best Match: {context.get('courseTitle', '')} | Similarity = {sims[best_idx]:.4f}")

        # Prompt construction
        prompt = f"""
You are an expert AI Tutor in Hecademy.
Use the following course material to help the student.

Course Title: {context.get('courseTitle')}
Course Description: {context.get('courseDescription')}
Additional Info: {context.get('tags', [])}

Student Question: {question}

Explain clearly, step-by-step, in a helpful and friendly way.
If relevant, reference key concepts from the course.
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )

        answer = response.choices[0].message.content.strip()

        print("✅ Response generated successfully.")
        print(f"🕒 Processing time: {round(time.time()-start,2)}s\n")

        return {
            "success": True,
            "answer": answer,
            "contextCourse": {
                "id": context.get("_id"),
                "title": context.get("courseTitle")
            },
            "similarity": float(sims[best_idx])
        }

    except Exception as e:
        print("❌ Tutor Error:", str(e))
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@app.get("/")
async def home():
    return {"message": "🧠 Hecademy AI Tutor v2.3 is running!"}


# ======================
# 🚀 Run Locally
# ======================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5002))
    print(f"🚀 Starting Hecademy AI Tutor v2.3 on port {port}")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)

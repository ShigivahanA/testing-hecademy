from fastapi import FastAPI
from pydantic import BaseModel
from hybrid_recommender import get_hybrid_recommendations
import uvicorn

app = FastAPI()

class RecommendationRequest(BaseModel):
    user: dict
    courses: list

@app.post("/recommend")
def recommend(req: RecommendationRequest):
    try:
        recommendations = get_hybrid_recommendations(req.user, req.courses)
        return {"success": True, "recommended": recommendations}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)

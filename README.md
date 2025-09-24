# Hecademy – Personalized Learning Platform

Hecademy is a full-stack e-learning platform that delivers **personalized course recommendations** using an **intermediate recommendation system**.  
Learners can explore, enroll, and track progress, while educators can publish and manage courses.

---

## Features

### For Learners
- **Personalized Recommendations** – Courses suggested based on preferences and recommendation system.
- **Learning Preferences** – Users can set/update their learning goals and topics anytime.
- **Course Discovery** – Browse/search courses with filters and keyword search.
- **Course Enrollment** – Secure payments integrated with **Stripe**.
- **Pending Enrollment Handling** – Users are notified if payment is incomplete and can resume checkout.
- **Progress Tracking** – Each lecture completed is saved, with visual progress bars.
- **Free Previews** – Watch a limited preview of course lectures before enrolling.

### For Educators
- **Educator Dashboard** – Publish, edit, and manage courses with chapters & lectures.
- **Course Analytics** – See student enrollments and ratings.

---

## Tech Stack

**Frontend**
- React + Vite  
- Tailwind CSS + shadcn/ui  
- Clerk Authentication  
- rc-progress for progress tracking  
- react-toastify for notifications  

**Backend**
- Node.js + Express  
- MongoDB + Mongoose  
- Stripe Checkout Integration  
- Recommendation System

## Recommendation System (Intermediate)

The recommendation system in Hecademy goes beyond simple tag-matching.  
It combines **content-based filtering** with additional ranking logic to deliver more meaningful suggestions:

1. **Multi-Dimensional Preferences**  
   - Matches users with courses based on **topics, difficulty level, and learning goals**.  
   - Example: A learner interested in *JavaScript* with a *career growth* goal will see frontend + fullstack tracks prioritized.

2. **Course Metadata Integration**  
   - Factors in **course popularity**, **recent activity**, and **average ratings**.  
   - Ensures trending or well-rated courses appear higher in the recommendation list.

3. **Dynamic Adaptation**  
   - When a user updates their preferences, recommendations **instantly adapt**.  
   - Handles incomplete payments (pending enrollments) gracefully by surfacing reminders.

4. **Hybrid Ranking Logic**  
   - Combines **direct preference matching** with **weighted scoring** across multiple attributes.  
   - Example: A course might score highly if it matches 2/3 of user preferences and has strong community ratings.

This approach makes Hecademy’s system **intermediate-level**:  
it balances **content-based personalization** with **ranking signals** for quality and relevance.
 



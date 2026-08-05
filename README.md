Mental Health Predictor

Overview :-
Mental Health Predictor is an end-to-end machine learning web applicationthat predicts a Mental Health Score (0--10) from a student'slifestyle, academic habits, and social media usage. It consists of: -Trained Scikit-learn pipeline (Mental_Health_Model.pkl) - FastAPIbackend - HTML/CSS/JavaScript frontend - Jupyter notebook for trainingand experimentation

Project Structure :-
Mental_Health_Project/
├── ML_Project.ipynb
├── Mental_Health_Model.pkl
├── main.py
├── index.html
├── style.css
├── script.js
├── Student Social Media And Mental Health Impact.csv
├── requirements.txt
└── README.md

Features :-
Predicts mental health score (0--10)
Input validation using Pydantic
Responsive frontend
REST API with FastAPI
Trained preprocessing + model pipeline

Installation :-

git clone < https://github.com/harshal663/Mental_health_predictor >
cd Mental_Health_Project
pip install -r requirements.txt

Run Backend :-
uvicorn main:app --reload

Open the frontend and ensure API_BASE in script.js points to your backend.

API :-

POST /predict
Returns:
{
  "predicted_mental_health_score": 6.82
}

Dataset :-
Student Social Media And Mental Health Impact dataset.

Tech Stack :-
Python
Scikit-learn
FastAPI
Pydantic
HTML
CSS
JavaScript

Disclaimer :-
This project is for educational purposes only. Predictions are notmedical diagnoses.
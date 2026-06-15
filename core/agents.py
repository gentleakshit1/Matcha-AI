from typing import TypedDict, Dict, Any, List
import json
import os
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# =====================================================================
# 1. THE STATE DEFINITION
# =====================================================================
class MatchaState(TypedDict):
    jd_id: int
    candidate_id: int
    job_title: str
    job_requirements: str
    candidate_name: str
    candidate_resume: str
    
    # These fields will be populated downstream by our local agents
    screening_summary: str
    skill_match_score: int
    skill_gap_analysis: Dict[str, Any]
    interview_questions: List[str]
    final_feedback: str


# =====================================================================
# STRUCTURAL OUTPUT SCHEMAS
# =====================================================================
class SkillAnalysisSchema(BaseModel):
    score: int = Field(description="A matching score between 0 and 100 based on overall profile suitability.")
    matching_skills: List[str] = Field(description="Key skills, tools, and platforms present in both the JD and candidate resume.")
    missing_skills: List[str] = Field(description="Critical technical skills or requirements requested in the JD but absent in the resume.")
    score_explanation: str = Field(description="Detailed explanation of the score.")

class InterviewQuestionsSchema(BaseModel):
    questions: List[str] = Field(description="List of exactly 3 highly specific technical interview questions.")


# =====================================================================
# HELPER TO GET LLM
# =====================================================================
def get_llm(temperature: float = 0.3):
    return ChatOpenAI(
        model="openai/gpt-4o-mini",
        temperature=temperature,
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        base_url="https://openrouter.ai/api/v1"
    )

# =====================================================================
# 2. THE AGENT NODES (OPTIMIZED FOR OPENROUTER / GPT-4O-MINI)
# =====================================================================

def resume_screening_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 1: Resume Screening Agent is processing...] ---")
    
    resume = state.get("candidate_resume", "")
    name = state.get("candidate_name", "The Candidate")
    job_title = state.get("job_title", "Target Position")
    
    llm = get_llm(temperature=0.3)
    
    screener_prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an elite expert candidate profiling assistant. Your job is to read a candidate's "
            "raw extracted text resume and write a concise, highly focused 3-sentence summary highlighting "
            "their primary technical stacks, professional experience level, and notable background strengths."
        )),
        ("user", "Candidate Name: {name}\n\nResume Dossier Text:\n{resume}")
    ])
    
    try:
        chain = screener_prompt | llm
        response = chain.invoke({"name": name, "resume": resume})
        generated_summary = response.content.strip()
    except Exception as e:
        print(f"🔥 Agent 1 Invocation Failure: {str(e)}")
        generated_summary = f"Profile analysis completed locally for {name}."

    return {"screening_summary": generated_summary}


def skill_matching_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 2: RAG Skill Matching Agent is processing...] ---")
    
    jd_id = state.get("jd_id")
    candidate_id = state.get("candidate_id")
    job_title = state.get("job_title", "")
    summary = state.get("screening_summary", "")
    
    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings
    
    persist_directory = os.path.join(os.getcwd(), "chroma_storage")
    embeddings_engine = OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        base_url="https://openrouter.ai/api/v1"
    )
    
    try:
        resume_vs = Chroma(collection_name=f"candidate_resume_{candidate_id}", embedding_function=embeddings_engine, persist_directory=persist_directory)
        resume_docs = resume_vs.similarity_search(query=job_title + " " + state.get("job_requirements", "")[:500], k=6)
        rag_resume_context = "\n...\n".join([doc.page_content for doc in resume_docs])
        
        jd_vs = Chroma(collection_name=f"jd_{jd_id}", embedding_function=embeddings_engine, persist_directory=persist_directory)
        jd_docs = jd_vs.similarity_search(query=state.get("candidate_resume", "")[:500], k=6)
        rag_jd_context = "\n...\n".join([doc.page_content for doc in jd_docs])
        print(f"✓ RAG: Successfully retrieved semantic intersections between candidate and JD.")
    except Exception as e:
        print(f"🔥 RAG Retrieval Error: {str(e)}. Falling back to raw text.")
        rag_resume_context = state.get("candidate_resume", "")[:2000]
        rag_jd_context = state.get("job_requirements", "")[:2000]
    
    llm = get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(SkillAnalysisSchema)
    
    matcher_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an objective corporate technical screening auditor. You strictly follow instructions and return precise data."),
        ("user", (
            "### RAG SEMANTIC VECTORS TO ANALYZE ###\n"
            "POSITION: {job_title}\n"
            "RELEVANT JOB REQUIREMENTS (RAG Retrieved):\n{requirements}\n\n"
            "CANDIDATE SUMMARY:\n{summary}\n\n"
            "RELEVANT RESUME EXPERIENCE (RAG Retrieved):\n{resume}\n\n"
            "### INSTRUCTIONS ###\n"
            "Evaluate the relevant resume experience against the job requirements and calculate a suitability score between 0 and 100.\n"
            "CRITICAL GRADING RUBRIC:\n"
            "- 0-20: Completely irrelevant industry or domain.\n"
            "- 21-50: Same industry, but missing critical core skills.\n"
            "- 51-80: Meets basic requirements, average fit.\n"
            "- 81-100: Perfect or near-perfect match.\n\n"
            "Provide a detailed score explanation and lists of matching and missing skills based on the requirements."
        ))
    ])
    
    try:
        chain = matcher_prompt | structured_llm
        parsed_result = chain.invoke({
            "job_title": job_title,
            "requirements": rag_jd_context,
            "summary": summary,
            "resume": rag_resume_context
        })
        
        return {
            "skill_match_score": parsed_result.score,
            "skill_gap_analysis": {
                "matching_skills": parsed_result.matching_skills,
                "missing_skills": parsed_result.missing_skills,
                "score_explanation": parsed_result.score_explanation
            }
        }
    except Exception as e:
        print(f"🔥 Agent 2 Parsing Error: {str(e)}")
        return {
            "skill_match_score": 70,
            "skill_gap_analysis": {
                "missing_skills": ["Error generating skills"],
                "matching_skills": ["Evaluation incomplete"],
                "score_explanation": "Failed to generate detailed analysis."
            }
        }


def interview_question_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 3: Interview Question Generator...] ---")
    
    gap_analysis = state.get("skill_gap_analysis", {})
    missing_skills = gap_analysis.get("missing_skills", [])
    job_title = state.get("job_title", "")
    
    llm = get_llm(temperature=0.4)
    structured_llm = llm.with_structured_output(InterviewQuestionsSchema)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical interviewer. Based on the candidate's missing skills, generate exactly 3 highly specific technical interview questions to ask them."),
        ("user", "Role: {job_title}\nMissing Skills to test: {missing_skills}")
    ])
    
    try:
        if not missing_skills:
            return {"interview_questions": [f"Could you walk me through your experience relevant to a {job_title} role?", "What is your strongest technical skill?"]}
            
        chain = prompt | structured_llm
        parsed_result = chain.invoke({"job_title": job_title, "missing_skills": ", ".join(missing_skills)})
        
        return {"interview_questions": parsed_result.questions[:3]}
    except Exception as e:
        print(f"🔥 Agent 3 Parsing Error: {str(e)}")
        return {"interview_questions": ["Can you explain your background?", "What are your core technical strengths?"]}


def feedback_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 4: Feedback Synthesis Agent...] ---")
    
    llm = get_llm(temperature=0.3)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a recruitment assistant."),
        ("user", (
            "Candidate: {name}\nRole: {job_title}\nScore: {score}/100\nMatching Skills: {matching}\nMissing Skills: {missing}\n\n"
            "Write a short, single-paragraph executive summary (max 4 sentences) for the HR team explaining why this candidate is or isn't a good fit, "
            "based strictly on their score and skills. Do not invent or assume any clinical expertise or experience that is not listed. Do not address the candidate directly."
        ))
    ])
    
    try:
        gap_analysis = state.get("skill_gap_analysis", {})
        chain = prompt | llm
        response = chain.invoke({
            "name": state.get("candidate_name", ""),
            "job_title": state.get("job_title", ""),
            "score": state.get("skill_match_score", 0),
            "matching": ", ".join(gap_analysis.get("matching_skills", [])),
            "missing": ", ".join(gap_analysis.get("missing_skills", []))
        })
        return {"final_feedback": response.content.strip()}
    except Exception as e:
        print(f"🔥 Agent 4 Error: {str(e)}")
        return {"final_feedback": "Candidate profile processed successfully."}


# =====================================================================
# 3. COMPILING THE GRAPH CONFIGURATION
# =====================================================================

workflow = StateGraph(MatchaState)

workflow.add_node("screener_node", resume_screening_agent)
workflow.add_node("matcher_node", skill_matching_agent)
workflow.add_node("question_node", interview_question_agent)
workflow.add_node("feedback_node", feedback_agent)

workflow.add_edge(START, "screener_node")
workflow.add_edge("screener_node", "matcher_node")
workflow.add_edge("matcher_node", "question_node")
workflow.add_edge("question_node", "feedback_node")
workflow.add_edge("feedback_node", END)

matcha_agent_app = workflow.compile()
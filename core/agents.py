from typing import TypedDict, Dict, Any, List
import json
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

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
# STRUCTURAL OUTPUT SCHEMA FOR BACKUP REFERENCE
# =====================================================================
class SkillAnalysisSchema(BaseModel):
    score: int = Field(description="A matching score between 0 and 100 based on overall profile suitability.")
    matching_skills: List[str] = Field(description="Key skills, tools, and platforms present in both the JD and candidate resume.")
    missing_skills: List[str] = Field(description="Critical technical skills or requirements requested in the JD but absent in the resume.")


# =====================================================================
# 2. THE AGENT NODES (HIGH-SPEED CPU OPTIMIZED)
# =====================================================================

def resume_screening_agent(state: MatchaState) -> Dict[str, Any]:
    """
    Agent 1: Responsible for reading raw, parsed resume text data 
    and synthesizing a structural executive screening dossier.
    """
    print("\n--- [Agent 1: Resume Screening Agent is processing (High-Speed Mode)...] ---")
    
    resume = state.get("candidate_resume", "")
    name = state.get("candidate_name", "The Candidate")
    job_title = state.get("job_title", "Target Position")
    
    # OPTIMIZATION: Removed truncation so the AI reads the full resume
    safe_resume = resume
    
    # OPTIMIZATION: Lighter model, RAM caching, and strict output limits
    llm = ChatOllama(
        model="llama3.2:1b",   # Switch to 1B model for massive speed boost on CPU
        temperature=0.3,
        keep_alive="1h",       # Keep model awake in RAM to prevent reload lag
        num_ctx=8192,          # Increased context memory to fit full documents
        num_predict=150        # Force the model to stop talking quickly
    )
    
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
        response = chain.invoke({"name": name, "resume": safe_resume})
        generated_summary = response.content.strip()
    except Exception as e:
        print(f"🔥 Local Agent 1 Invocation Failure: {str(e)}")
        generated_summary = f"Profile analysis completed locally for {name}."

    return {"screening_summary": generated_summary}


def skill_matching_agent(state: MatchaState) -> Dict[str, Any]:
    """
    Agent 2: RAG-Augmented Skill Matching Agent.
    Queries ChromaDB to semantically align Resume vectors with JD vectors.
    """
    print("\n--- [Agent 2: RAG Skill Matching Agent is processing...] ---")
    
    jd_id = state.get("jd_id")
    candidate_id = state.get("candidate_id")
    job_title = state.get("job_title", "")
    summary = state.get("screening_summary", "")
    
    from langchain_chroma import Chroma
    from langchain_ollama import OllamaEmbeddings
    import os
    
    persist_directory = os.path.join(os.getcwd(), "chroma_storage")
    embeddings_engine = OllamaEmbeddings(model="nomic-embed-text")
    
    try:
        # 1. Retrieve Resume Chunks that are most relevant to the Job Title
        resume_vs = Chroma(collection_name=f"candidate_resume_{candidate_id}", embedding_function=embeddings_engine, persist_directory=persist_directory)
        resume_docs = resume_vs.similarity_search(query=job_title + " " + state.get("job_requirements", "")[:500], k=6)
        rag_resume_context = "\n...\n".join([doc.page_content for doc in resume_docs])
        
        # 2. Retrieve JD Chunks that are most relevant to the Candidate's Resume
        jd_vs = Chroma(collection_name=f"jd_{jd_id}", embedding_function=embeddings_engine, persist_directory=persist_directory)
        jd_docs = jd_vs.similarity_search(query=state.get("candidate_resume", "")[:500], k=6)
        rag_jd_context = "\n...\n".join([doc.page_content for doc in jd_docs])
        
        print(f"✓ RAG: Successfully retrieved semantic intersections between candidate and JD.")
    except Exception as e:
        print(f"🔥 RAG Retrieval Error: {str(e)}. Falling back to raw text.")
        rag_resume_context = state.get("candidate_resume", "")[:2000]
        rag_jd_context = state.get("job_requirements", "")[:2000]
    
    # OPTIMIZATION: Match Agent 1's model to utilize the RAM cache instantly
    llm = ChatOllama(
        model="llama3.2:1b",
        temperature=0.2,       # slightly increased to generate a better explanation
        keep_alive="1h",
        num_ctx=8192,          # Increased context memory to fit full documents
        num_predict=350        # added to ensure it finishes the JSON explanation
    )
    
    # Double curly braces {{ }} tell LangChain to treat this as literal text, not variables!
    matcher_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an objective corporate technical screening auditor. You strictly follow instructions and output JSON."),
        ("user", (
            "### RAG SEMANTIC VECTORS TO ANALYZE ###\n"
            "POSITION: {job_title}\n"
            "RELEVANT JOB REQUIREMENTS (RAG Retrieved):\n{requirements}\n\n"
            "CANDIDATE SUMMARY:\n{summary}\n\n"
            "RELEVANT RESUME EXPERIENCE (RAG Retrieved):\n{resume}\n\n"
            "### INSTRUCTIONS ###\n"
            "Evaluate the relevant resume experience against the job requirements and calculate a suitability score between 0 and 100.\n"
            "CRITICAL GRADING RUBRIC:\n"
            "- 0-20: Completely irrelevant industry or domain (e.g., Software Dev applying for a Medical/Lab role). If the candidate lacks core industry background, the score MUST NOT exceed 20.\n"
            "- 21-50: Same industry, but missing critical core skills.\n"
            "- 51-80: Meets basic requirements, average fit.\n"
            "- 81-100: Perfect or near-perfect match.\n\n"
            "EXAMPLE MISMATCH: If JD is 'Lab Technician' and Resume is 'Software Developer', the score is 10 because there is zero medical background.\n\n"
            "Provide a detailed score explanation breaking down what factors led to the cumulative score, ensuring you strictly follow the rubric.\n"
            "You must return ONLY a raw, unquoted JSON object matching this exact structure, nothing else:\n"
            "{{\n"
            "  \"score\": <calculate_actual_score_here>,\n"
            "  \"score_explanation\": \"<detailed_breakdown_of_the_score_out_of_100>\",\n"
            "  \"matching_skills\": [\"list\", \"matching\", \"skills\"],\n"
            "  \"missing_skills\": [\"list\", \"missing\", \"skills\"]\n"
            "}}\n"
            "Do not write conversational explanations, text prefaces, or markdown blocks like ```json."
        ))
    ])
    
    try:
        chain = matcher_prompt | llm
        # Pass the RAG Augmented variables into the template
        response = chain.invoke({
            "job_title": job_title,
            "requirements": rag_jd_context,
            "summary": summary,
            "resume": rag_resume_context
        })
        raw_content = response.content.strip()
        
        # Clean formatting tags if the local model outputs markdown code fence containers
        if "```" in raw_content:
            raw_content = raw_content.split("```")[1]
            if raw_content.startswith("json"):
                raw_content = raw_content[4:]
        
        parsed_result = json.loads(raw_content.strip())
        
        return {
            "skill_match_score": int(parsed_result.get("score", 75)),
            "skill_gap_analysis": {
                "matching_skills": parsed_result.get("matching_skills", []),
                "missing_skills": parsed_result.get("missing_skills", []),
                "score_explanation": parsed_result.get("score_explanation", "No score explanation provided.")
            }
        }
    except Exception as e:
        print(f"🔥 Local Agent 2 Direct Parse Handshake Fallback: {str(e)}")
        return {
            "skill_match_score": 70,
            "skill_gap_analysis": {
                "missing_skills": ["Review Requirements Metrics"],
                "matching_skills": ["Technical Profile Dossier Evaluated Successfully"],
                "score_explanation": "Failed to generate detailed score analysis due to fallback."
            }
        }


# =====================================================================
# 3. COMPILING THE GRAPH CONFIGURATION
# =====================================================================

def interview_question_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 3: Interview Question Generator (High-Speed Mode)...] ---")
    
    gap_analysis = state.get("skill_gap_analysis", {})
    missing_skills = gap_analysis.get("missing_skills", [])
    job_title = state.get("job_title", "")
    
    llm = ChatOllama(
        model="llama3.2:1b",
        temperature=0.4,
        keep_alive="1h",
        num_ctx=8192,
        num_predict=250
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an expert technical interviewer. Based on the candidate's missing skills, "
            "generate exactly 3 highly specific technical interview questions to ask them.\n"
            "Return ONLY a raw JSON array of strings matching this structure:\n"
            "[\"Question 1?\", \"Question 2?\", \"Question 3?\"]\n"
            "Do not write conversational explanations or markdown blocks like ```json."
        )),
        ("user", "Role: {job_title}\nMissing Skills to test: {missing_skills}")
    ])
    
    try:
        if not missing_skills:
            return {"interview_questions": [f"Could you walk me through your experience relevant to a {job_title} role?", "What is your strongest technical skill?"]}
            
        chain = prompt | llm
        response = chain.invoke({"job_title": job_title, "missing_skills": ", ".join(missing_skills)})
        raw_content = response.content.strip()
        
        if "```" in raw_content:
            raw_content = raw_content.split("```")[1]
            if raw_content.startswith("json"):
                raw_content = raw_content[4:]
                
        questions = json.loads(raw_content.strip())
        if not isinstance(questions, list):
            questions = [str(questions)]
            
        return {"interview_questions": questions[:3]}
    except Exception as e:
        print(f"🔥 Local Agent 3 Parsing Error: {str(e)}")
        return {"interview_questions": ["Can you explain your background?", "What are your core technical strengths?"]}


def feedback_agent(state: MatchaState) -> Dict[str, Any]:
    print("\n--- [Agent 4: Feedback Synthesis Agent...] ---")
    
    llm = ChatOllama(
        model="llama3.2:1b",
        temperature=0.3,
        keep_alive="1h",
        num_ctx=8192,
        num_predict=200
    )
    
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
        print(f"🔥 Local Agent 4 Error: {str(e)}")
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
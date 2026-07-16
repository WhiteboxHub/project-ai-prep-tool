import os
from openai import OpenAI
import jellyfish

GLOSSARY = [
    "Docling", "LangChain", "LangGraph", "Milvus", "MCP",
    "RoBERTa", "Sentence Transformers", "Bedrock", "Claude Sonnet",
    "EKS", "ECS", "ArgoCD", "MLflow", "SageMaker", "RAGAS",
    "Machine Learning", "Generative AI", "Agent-based AI", "AI Assistant",
    "Customer Care AI Assistant", "RAG", "Retrieval-Augmented Generation",
    "Proof of Concept", "POC", "Hybrid Retrieval", "Semantic Search",
    "Keyword Search", "Retriever Evaluation", "Generation Evaluation",
    "Query Optimization", "Conversation History", "Reranking", "Intent Detection",
    "Intent Classification", "Fine-tuning", "Short-term Memory",
    "Long-term Memory", "Multi-Agent System", "Orchestrator Agent",
    "Supervisor Pattern", "Router", "Domain Agents", "Tool Calling",
    "FastAPI", "React", "Data Cleaning", "Data Preprocessing", "Chunking",
    "Embeddings", "Prompt Templating", "Chaining", "Question Answering",
    "Hybrid Retriever", "Semantic Retrieval", "Keyword Retrieval", "Vector Database",
    "Memory Management", "Model Context Protocol", "Full Stack Development",
    "MLOps", "Databricks", "Model Deployment", "Model Serving",
    "AWS", "Amazon EKS", "Amazon ECS", "Amazon S3", "AWS Lambda",
    "Docker", "Kubernetes", "Helm", "Terraform", "GitHub", "CI/CD",
    "Monitoring", "Observability", "Datadog", "Amazon CloudWatch",
    "Prometheus", "Grafana", "Unstructured Data", "Document Processing",
    "Software Engineering", "Software Engineer", "Backend Development",
    "Frontend Development", "Production Deployment", "Phase One", "Phase Two",
    "Model Evaluation", "Security & Safety", "Guardrails", "Architecture Patterns",
    "RAG Architecture", "Ingestion Pipeline", "Query Pipeline", "Hybrid Search",
    "Multi-Agent Architecture", "Orchestrator Pattern", "Intent Routing",
    "Machine Learning Engineer", "MLOps Engineer", "Generative AI Engineer",
    "Agentic AI Engineer", "Customer Care Platform", "Production System"
]

import re

def correct_technical_terms(raw_text: str, segments: list, glossary: list[str], threshold=0.85) -> str:
    # 1. Separate phrases (multi-word) from tokens (single-word)
    phrases = [t for t in glossary if " " in t or "-" in t]
    # Sort phrases by length descending to match longer phrases first
    phrases.sort(key=len, reverse=True)
    
    tokens = [t for t in glossary if " " not in t and "-" not in t]
    
    # 2. Exact phrase matching pass (case-insensitive regex replacement)
    corrected_text = raw_text
    for phrase in phrases:
        pattern = re.compile(r'\b' + re.escape(phrase) + r'\b', re.IGNORECASE)
        corrected_text = pattern.sub(phrase, corrected_text)
        
    # 3. Phonetic matching pass for remaining words in low confidence segments
    words = corrected_text.split()
    corrected_words = []
    
    # Identify spans of text that are low confidence
    if segments:
        low_confidence_text = " ".join([s.get("text", "") for s in segments if s.get("avg_logprob", 0) < -0.5])
    else:
        low_confidence_text = ""
    
    for word in words:
        clean_word = re.sub(r'[^\w\s]', '', word)
        
        # Only correct if the word appears in the low confidence segments text
        if clean_word and (clean_word in low_confidence_text or not low_confidence_text):
            best_match, best_score = None, 0
            for token in tokens:
                score = jellyfish.jaro_winkler_similarity(clean_word.lower(), token.lower())
                if score > best_score:
                    best_match, best_score = token, score
            
            if best_score >= threshold:
                prefix = re.match(r'^[^\w]+', word)
                suffix = re.search(r'[^\w]+$', word)
                prefix_str = prefix.group(0) if prefix else ""
                suffix_str = suffix.group(0) if suffix else ""
                corrected_words.append(f"{prefix_str}{best_match}{suffix_str}")
            else:
                corrected_words.append(word)
        else:
            corrected_words.append(word)
            
    return " ".join(corrected_words)

def transcribe_audio(file_path: str, api_key: str = None) -> dict:
    """
    Transcribe audio using Whisper API.
    Returns dict with raw_text and corrected_text.
    """
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY is not set.")
    
    client = OpenAI(api_key=key)
    
    # We use a short, targeted prompt of critical technical terms to guide Whisper's spelling
    # without confusing the decoder with a massive 1000+ character list which causes dropped segments.
    whisper_prompt = "Docling, LangChain, LangGraph, Milvus, MCP, RoBERTa, Bedrock, MLOps, RAGAS, EKS, ECS, ArgoCD, Databricks, SageMaker."
    
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            response_format="verbose_json",
            temperature=0,
            prompt=whisper_prompt,
            file=audio_file,
            language="en"
        )
        
    raw_text = transcript.text
    segments = transcript.segments if hasattr(transcript, "segments") else []
    
    corrected_text = correct_technical_terms(raw_text, segments, GLOSSARY)
        
    return {
        "raw_text": raw_text,
        "corrected_text": corrected_text
    }

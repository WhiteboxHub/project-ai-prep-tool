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
        low_confidence_list = []
        for s in segments:
            # Handle if s is a dictionary
            if isinstance(s, dict):
                text = s.get("text", "")
                logprob = s.get("avg_logprob", 0)
            # Handle if s is a string
            elif isinstance(s, str):
                text = s
                logprob = 0
            # Handle if s is a Pydantic model or other object
            else:
                text = getattr(s, "text", "")
                logprob = getattr(s, "avg_logprob", 0)
            
            if logprob is None:
                logprob = 0
            
            try:
                logprob_val = float(logprob)
            except (ValueError, TypeError):
                logprob_val = 0
                
            if logprob_val < -0.5:
                low_confidence_list.append(text)
        low_confidence_text = " ".join(low_confidence_list)
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

import subprocess
import tempfile

def compress_or_extract_audio(file_path: str) -> str:
    """
    Extracts and compresses audio track from audio/video file using imageio_ffmpeg or system ffmpeg.
    Converts video/large audio files to lightweight 16kHz mono MP3 under 25MB for OpenAI Whisper API.
    """
    if not os.path.exists(file_path):
        return file_path

    file_size = os.path.getsize(file_path)
    
    ffmpeg_exe = None
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        import shutil
        ffmpeg_exe = shutil.which("ffmpeg")

    if not ffmpeg_exe:
        return file_path

    ext = os.path.splitext(file_path)[1].lower()
    # Skip conversion only if file is already a tiny pure audio file (< 3MB)
    if file_size < 3 * 1024 * 1024 and ext in ['.mp3', '.m4a', '.wav', '.ogg', '.aac']:
        return file_path

    output_temp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    output_path = output_temp.name
    output_temp.close()

    try:
        cmd = [
            ffmpeg_exe, "-y",
            "-i", file_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-ar", "16000",
            "-ac", "1",
            "-b:a", "64k",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            compressed_size = os.path.getsize(output_path)
            print(f"[speech_service] Compressed input file from {file_size / (1024 * 1024):.2f}MB to {compressed_size / (1024 * 1024):.2f}MB MP3")
            return output_path
    except Exception as e:
        print("[speech_service] Audio compression failed, fallback to original file:", e)

    return file_path


def transcribe_audio(file_path: str, api_key: str = None) -> dict:
    """
    Transcribe audio using Whisper API.
    Returns dict with raw_text and corrected_text.
    """
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY is not set.")
    
    target_path = compress_or_extract_audio(file_path)
    is_temp = (target_path != file_path)

    try:
        client = OpenAI(api_key=key)
        whisper_prompt = "Docling, LangChain, LangGraph, Milvus, MCP, RoBERTa, Bedrock, MLOps, RAGAS, EKS, ECS, ArgoCD, Databricks, SageMaker."
        
        with open(target_path, "rb") as audio_file:
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
    finally:
        if is_temp and os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass

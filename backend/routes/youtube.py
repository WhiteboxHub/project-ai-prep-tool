import os
import requests
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from db.init_db import get_db_connection

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

@router.get("/status")
def youtube_status():
    """Health check: returns whether YouTube OAuth credentials are configured."""
    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN")
    configured = bool(client_id and client_secret and refresh_token)
    return {"configured": configured}

class UploadUrlRequest(BaseModel):
    title: str
    description: str
    privacyStatus: str = "unlisted"
    selfDeclaredMadeForKids: bool = False

class UpdateVideoUrlRequest(BaseModel):
    eval_id: int
    video_id: str

def get_youtube_access_token():
    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN")

    if not client_id or not client_secret or not refresh_token:
        raise HTTPException(status_code=500, detail="YouTube credentials are not fully configured in the environment.")

    response = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    })

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to refresh YouTube token: {response.text}")

    return response.json().get("access_token")

@router.post("/get-upload-uri")
def get_upload_uri(req: UploadUrlRequest, request: Request):
    """
    Step 1: Authenticate as the Admin Channel.
    Step 2: Request a resumable upload Session URI from YouTube.
    Step 3: Return the unguessable upload URI to the client.
    """
    token = get_youtube_access_token()

    # Capture the client's Origin (e.g. http://localhost:8080) to enable CORS on Google's end
    client_origin = request.headers.get("origin") or "http://localhost:8080"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/webm",
        "Origin": client_origin
    }

    # Meta-data for the YouTube video
    body = {
        "snippet": {
            "title": req.title,
            "description": req.description
        },
        "status": {
            "privacyStatus": req.privacyStatus,
            "selfDeclaredMadeForKids": req.selfDeclaredMadeForKids
        }
    }

    # Hit the resumable upload initialization endpoint
    url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    resp = requests.post(url, headers=headers, json=body)

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to initiate YouTube upload session: {resp.text}")

    # The actual upload URI is returned in the Location header
    upload_url = resp.headers.get("Location")
    if not upload_url:
        raise HTTPException(status_code=500, detail="Missing Location header from YouTube API")

    return {"uploadUrl": upload_url}

@router.post("/update-video-url")
def update_video_url(req: UpdateVideoUrlRequest):
    """
    Step 1: Get the final video ID from the client.
    Step 2: Add the video to the specified YouTube Playlist.
    Step 3: Update the local database to map the record to the final YouTube URL.
    """
    # 1. Add to playlist
    token = get_youtube_access_token()
    playlist_id = os.environ.get("YOUTUBE_PLAYLIST_ID")
    
    if playlist_id:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        playlist_body = {
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": req.video_id
                }
            }
        }
        
        playlist_url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet"
        pl_resp = requests.post(playlist_url, headers=headers, json=playlist_body)
        
        # We will log but not fail the whole request if playlist insertion fails
        if pl_resp.status_code != 200:
            print(f"Warning: Failed to add video to playlist: {pl_resp.text}")
    else:
        print("Notice: YOUTUBE_PLAYLIST_ID not configured. Skipping playlist addition.")

    # 2. Update Database
    youtube_url = f"https://www.youtube.com/watch?v={req.video_id}"

    import time
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # The LLM evaluation might take a few seconds to insert the record.
            # If the video upload finishes first, we need to wait for the record to exist.
            for _ in range(15):
                cursor.execute(
                    "UPDATE aiprep_tool_evaluations SET video_url = %s WHERE id = %s",
                    (youtube_url, req.eval_id)
                )
                if cursor.rowcount > 0:
                    break
                conn.commit() # Commit to release any locks before sleeping
                time.sleep(2)
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"DB Update failed: {str(e)}")
    finally:
        if conn:
            conn.close()

    return {"success": True, "youtube_url": youtube_url}

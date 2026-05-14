import requests

url = "http://127.0.0.1:8001/api/case-study/generate-from-template"
headers = {"Content-Type": "application/json"}
data = {
    "session_id": "test_123",
    "project_details": "product: test product\narchitecture: microservices",
    "template_key": "mlops"
}

res = requests.post(url, json=data)
print(res.status_code)
print(res.text)

import os
import glob
import json
import io
import requests

API_URL = "http://127.0.0.1:5000/screen/voice"

def print_result(test_name, response):
    print(f"\n{'='*50}")
    print(f"--- {test_name} ---")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response (text): {response.text}")
    print(f"{'='*50}")

def test_raw_audio():
    # 1. Raw Audio File Test
    wav_files = glob.glob('./data/audio/**/*.wav', recursive=True)
    if not wav_files:
        print("No .wav files found for testing.")
        return
        
    test_wav = wav_files[0]
    print(f"\n[Executing] Testing with audio file: {test_wav}")
    with open(test_wav, 'rb') as f:
        files = {'file': (os.path.basename(test_wav), f, 'audio/wav')}
        response = requests.post(API_URL, files=files)
        
    print_result("1. Raw Audio File Test", response)
    
    # Simple Assertion
    if response.status_code == 200:
        data = response.json()
        assert 'likelihood_score' in data, "Missing likelihood_score in response"
        assert 'percentage_chance' in data, "Missing percentage_chance in response"
        assert 'intensity_level' in data, "Missing intensity_level in response"

def test_heterogeneous_csv():
    # 2. Tabular Heterogeneous Header Test
    # Using 'ID', 'Status', and 'locPctJitter' which will be dynamically mapped to core standard schema
    print("\n[Executing] Testing with Heterogeneous CSV (casing mismatches & alternate headers)")
    csv_content = "ID,Status,locPctJitter,MDVP:Fo(Hz),MDVP:Fhi(Hz)\nPT-TEST1,1,0.015,120.0,150.0\n"
    csv_buffer = io.BytesIO(csv_content.encode('utf-8'))
    
    files = {'file': ('test_heterogeneous.csv', csv_buffer, 'text/csv')}
    response = requests.post(API_URL, files=files)
    
    print_result("2. Tabular Heterogeneous Header Test", response)

def test_plain_text_matrix():
    # 3. Plain Text Matrix Test
    # Raw .txt file buffer mapping layers fallback
    print("\n[Executing] Testing with Plain Text Matrix (.txt)")
    txt_content = "patient_id,status,Jitter_percent,F0_Mean,F0_High\nPT-TEXT,0,0.005,180.0,200.0\n"
    txt_buffer = io.BytesIO(txt_content.encode('utf-8'))
    
    files = {'file': ('test_matrix.txt', txt_buffer, 'text/plain')}
    response = requests.post(API_URL, files=files)
    
    print_result("3. Plain Text Matrix Test", response)

def test_error_isolation():
    # 4. Error Isolation Test
    # Sending an unsupported format to cleanly trigger 400 Bad Request exception
    print("\n[Executing] Testing Error Handling (Unsupported File Format)")
    unsupported_content = "This is definitely not a real tabular dataset or audio file."
    error_buffer = io.BytesIO(unsupported_content.encode('utf-8'))
    
    files = {'file': ('bad_file.md', error_buffer, 'text/markdown')}
    response = requests.post(API_URL, files=files)
    
    print_result("4. Error Isolation Test (Expecting 400 Bad Request)", response)
    
    # Asserting graceful exception handling
    assert response.status_code == 400, f"Expected 400, got {response.status_code}"

if __name__ == "__main__":
    print(f"🚀 Initializing FastAPI Endpoint Test Suite at {API_URL}")
    try:
        # Quick health check to see if port 5000 is open
        requests.get("http://127.0.0.1:5000/")
    except requests.exceptions.ConnectionError:
        print("\n[WARNING] Uvicorn server does not appear to be running on http://127.0.0.1:5000.")
        print("Please ensure your FastAPI app is mounted and running before executing this script.")
        print("Command to start server (example): uv run uvicorn app.main:app --port 5000\n")
        
    test_raw_audio()
    test_heterogeneous_csv()
    test_plain_text_matrix()
    test_error_isolation()
    print("\n✅ QA Testing execution complete.")

# Copyright (C) 2025 Nokkela.AI
#
# This file is part of Nokkela Voice Assistant (NVA)
#
# Nokkela Voice Assistant (NVA) is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later version.
#
# Nokkela Voice Assistant (NVA) is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with
# Nokkela Voice Assistant (NVA). If not, see https://www.gnu.org/licenses/.

# Import necessary modules and packages
from flask import Flask, request, jsonify, send_from_directory, Response, render_template
import configparser
import os
import logging
import requests
import time
import uuid
import threading
from werkzeug.utils import secure_filename
from io import BytesIO
from flask_cors import CORS
from flask_httpauth import HTTPBasicAuth

# Create a Flask application instance, using 'web' als template-folder
app = Flask(__name__, template_folder='web')

# Enable Cross-Origin Resource Sharing (CORS) for all routes
CORS(app)

auth = HTTPBasicAuth()
# Read HTTP Basic credentials from environment variables
WEB_AUTH_USER = os.getenv("WEB_AUTH_USER", "").strip()
WEB_AUTH_PW   = os.getenv("WEB_AUTH_PW",   "").strip()

@auth.verify_password
def verify_password(username, password):
    # If no credentials are configured, allow access without authentication
    if not WEB_AUTH_USER or not WEB_AUTH_PW:
        return True
    # Require both correct username and password
    return username == WEB_AUTH_USER and password == WEB_AUTH_PW

# Load configuration from config.ini
config = configparser.ConfigParser()
config.read('config.ini')

# Global API key fallback. It first checks for an environment variable; if not found, an empty string is used.
api_key = os.getenv("OPENAI_KEY", "")
# Load the default persona prompt from the config file, with a fallback value.
persona_prompt = config.get('chatgpt', 'persona_prompt', fallback='You are a helpful and knowledgeable assistant. Your task is to provide clear and friendly answers to the users questions, drawing from your extensive knowledge. After each response, please include an invitation for further discussion, ask an open-ended or clarifying question to encourage the user to continue the conversation. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.')

# Ensure that the data folder exists for saving files and logs
if not os.path.exists('data'):
    os.makedirs('data')

# Set up a logger for voice-related events (e.g., recording, transcription)
voice_logger = logging.getLogger('voice')
voice_logger.setLevel(logging.INFO)
voice_handler = logging.FileHandler('data/voice.log')
voice_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
voice_handler.setFormatter(voice_formatter)
voice_logger.addHandler(voice_handler)

# Set up a logger for system-related errors
system_logger = logging.getLogger('system')
system_logger.setLevel(logging.ERROR)
system_handler = logging.FileHandler('data/system.log')
system_handler.setFormatter(voice_formatter)
system_logger.addHandler(system_handler)

# Define the API endpoints for transcription, chat completions, and TTS (Text-to-Speech)
# STT (Speech-to-Text)
OPENAI_TRANSCRIBE_URL = os.getenv("OPENAI_TRANSCRIBE_URL", "https://api.openai.com/v1/audio/transcriptions")
# LLM (Large Language Model)
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OLLAMA_CHAT_URL = os.getenv("OLLAMA_CHAT_URL", OPENAI_CHAT_URL)
# TTS (Text-to-Speech)
OPENAI_TTS_URL = os.getenv("OPENAI_TTS_URL", "https://api.openai.com/v1/audio/speech")
TTS_HD_ENABLED = os.getenv("TTS_HD", "NO").upper() == "YES"
TTS_VOICE = os.getenv("TTS_VOICE", "shimmer")

# Serve the index.html file from the 'web' folder
@app.route('/')
@auth.login_required
def index():
    show_chatgpt = bool(os.getenv("OPENAI_KEY", "").strip())
    tts_hd_enabled  = os.getenv("TTS_HD", "NO").upper() == "YES"
    tts_voice    = os.getenv("TTS_VOICE", "shimmer")
    # check secure connection
    transcribe_url    = os.getenv("OPENAI_TRANSCRIBE_URL", OPENAI_TRANSCRIBE_URL)
    ollama_url        = os.getenv("OLLAMA_CHAT_URL", OLLAMA_CHAT_URL)
    tts_url           = os.getenv("OPENAI_TTS_URL", OPENAI_TTS_URL)
    return render_template(
        'index.html',
        show_chatgpt   = show_chatgpt,
        tts_hd_enabled = tts_hd_enabled,
        tts_voice      = tts_voice,
        OPENAI_TRANSCRIBE_URL = transcribe_url,
        OLLAMA_CHAT_URL       = ollama_url,
        OPENAI_TTS_URL        = tts_url
        )

# Serve static files (CSS, JavaScript, etc.) from the same directory.
@app.route('/<path:path>')
@auth.login_required
def static_files(path):
    return send_from_directory('web', path)

# In-memory store for conversation histories per session
histories: dict[str, list[dict]] = {}
# Endpoint for handling audio transcription requests
@app.route('/transcribe', methods=['POST'])
@auth.login_required
def transcribe():
    # Check if an audio file was provided in the request
    if 'audio' not in request.files:
        return jsonify({'error': 'Audio file not provided.'}), 400

    # Retrieve the API key provided by the client (if any); otherwise, use the fallback
    provided_api_key = request.form.get('api_key')
    effective_api_key = provided_api_key if provided_api_key else api_key

    # Get the audio file from the request
    audio_file = request.files['audio']

    # Validate the audio file type (only allow certain MIME types)
    if audio_file.content_type not in ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/aac']:
        return jsonify({'error': 'Unsupported audio format.'}), 400

    ### LOG Audio ###    # Generate a unique filename for the audio file using a timestamp and a UUID
    ### LOG Audio ###    filename = secure_filename(f"recording_{int(time.time())}_{uuid.uuid4().hex}.wav")
    ### LOG Audio ###    audio_path = os.path.join('data', filename)
    ### LOG Audio ###
    ### LOG Audio ###    try:
    ### LOG Audio ###        # Save the audio file locally
    ### LOG Audio ###        audio_file.save(audio_path)
    ### LOG Audio ###        voice_logger.info(f"Audio saved: {filename}")

    # Generate a unique filename for the audio file using a timestamp and a UUID
    filename = secure_filename(f"recording_{int(time.time())}_{uuid.uuid4().hex}.wav")

    try:
        # Upload into BytesIO-Buffer
        audio_bytes = BytesIO()
        audio_file.save(audio_bytes)
        audio_bytes.seek(0)
        voice_logger.info("Audio received and processed in memory")

        # Prepare headers for the OpenAI API request (include the effective API key)
        headers = {
            'Authorization': f'Bearer {effective_api_key}'
        }

        ### LOG Audio ###        # Prepare the multipart form-data with the audio file and additional parameters
        ### LOG Audio ###        files = {
        ### LOG Audio ###            'file': (filename, open(audio_path, 'rb'), audio_file.content_type),
        ### LOG Audio ###            'model': (None, 'whisper-1'),
        ### LOG Audio ###            'response_format': (None, 'json')
        ### LOG Audio ###        }

        # Prepare the multipart form-data with the audio file and additional parameters
        files = {
            'file': (filename, audio_bytes, audio_file.content_type),
            'model': (None, 'whisper-1'),
            'response_format': (None, 'json')
        }

        # If additional data is provided (e.g., for Translator mode), log speaker and language details.
        speaker = request.form.get('speaker', '')
        language = request.form.get('language', '')
        if speaker and language:
            voice_logger.info(f"Transcription from {speaker} to language: {language}")

        # Send a POST request to the OpenAI transcription endpoint
        transcribe_resp = requests.post(OPENAI_TRANSCRIBE_URL, headers=headers, files=files)
        if transcribe_resp.status_code != 200:
            system_logger.error(f"/transcribe Whisper Error: {transcribe_resp.status_code} {transcribe_resp.text}")
            return jsonify({'error': 'Transcription errors'}), 500

        # Process the response JSON from the transcription endpoint
        transcript_data = transcribe_resp.json()
        user_input = transcript_data.get('text', '').strip()
        voice_logger.info(f"User: {user_input[:5]}...")

        # Use the system prompt provided by the client if available; otherwise, use the default persona prompt.
        system_prompt = request.form.get('system_prompt', persona_prompt)

        # Choose the chat model based on the selected model from the client.
        selected_model = request.form.get('model', 'o4-mini')
        if selected_model == 'o4-mini':
            chat_model = "o4-mini"
        elif selected_model == 'o3-mini':
            chat_model = "o3-mini"
        elif selected_model == 'gpt-4.1':
            chat_model = "gpt-4.1"
        elif selected_model == 'gpt-4o':
            chat_model = "gpt-4o"
        elif selected_model in ('llama4:scout', 'llama3.3', 'qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq', 'gemma3:27b', 'gemma3:4b', 'cogito:70b', 'cogito:32b', 'cogito:14b', 'cogito:8b', 'cogito:3b'):
            # for Llama4-Scout, Llama3.3, Qwen3, DeepSeek, QwQ, Gemma and Cogito use model name directly
            chat_model = selected_model
        elif selected_model == 'custom-ollama':
            # use the user-provided Ollama model name
            chat_model = request.form.get('custom_ollama_model', '')
        else:
            chat_model = "o4-mini"

        # Load session history
        session_id = request.form.get('session_id')
        if session_id:
            history = histories.setdefault(session_id, [])
        else:
            history = []

        # Prepare the payload for the chat completion endpoint, inc. history
        messages = [{"role": "system", "content": system_prompt}] + \
                   history + \
                   [{"role": "user",   "content": user_input}]
        chat_payload = {
            "model":    chat_model,
            "messages": messages
        }

        # Prepare headers for the chat request
        chat_headers = {
            'Authorization': f'Bearer {effective_api_key}',
            'Content-Type': 'application/json'
        }

        # Send the POST request to the chat completions endpoint
        # select chat endpoint: custom for qwq, default otherwise
        if request.form.get('model') in ('llama4:scout', 'llama3.3', 'qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq', 'gemma3:27b', 'gemma3:4b', 'cogito:70b', 'cogito:32b', 'cogito:14b', 'cogito:8b', 'cogito:3b', 'custom-ollama'):
            chat_url = request.form.get('chat_url', OLLAMA_CHAT_URL)
        else:
            chat_url = OPENAI_CHAT_URL
        chat_resp = requests.post(chat_url, headers=chat_headers, json=chat_payload)
        if chat_resp.status_code != 200:
            system_logger.error(f"/transcribe ChatGPT Error: {chat_resp.status_code} {chat_resp.text}")
            return jsonify({'error': 'Error in the chat response'}), 500

        # Process the response from the chat endpoint and extract the bot's answer
        chat_data = chat_resp.json()
        bot_response = chat_data['choices'][0]['message']['content'].strip()
        # Save conversation to session history
        if session_id:
            history.append({"role": "user",      "content": user_input})
            history.append({"role": "assistant", "content": bot_response})
        voice_logger.info(f"Bot: {bot_response[:5]}...")

        # Return both the user's transcript and the bot's response as JSON
        return jsonify({'transcript': user_input, 'response': bot_response})

    except Exception as e:
        # Log and return any exceptions that occur during processing
        system_logger.error(f'Error in /transcribe: {e}')
        return jsonify({'error': 'Internal Servererror'}), 500

        ### LOG Audio ###    finally:
        ### LOG Audio ###        # Ensure the file handle is closed properly after processing
        ### LOG Audio ###        if 'file' in files and hasattr(files['file'][1], 'close'):
        ### LOG Audio ###            files['file'][1].close()

    finally:
        # Close BytesIO-Puffer
        try:
            audio_bytes.close()
        except:
            pass

# Endpoint for Text-to-Speech (TTS) conversion
@app.route('/tts', methods=['POST'])
@auth.login_required
def tts():
    data = request.get_json()
    # Validate that text is provided in the request
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided for TTS.'}), 400

    text = data['text']
    # Determine which TTS model to use:
    # - if HD mode is enabled and the default 'tts-1' was requested, switch to 'tts-1-hd'
    # - otherwise use whatever model was provided (or default 'tts-1')
    requested_model = data.get('model', 'tts-1')
    if TTS_HD_ENABLED and requested_model == 'tts-1':
        model = 'tts-1-hd'
    else:
        model = requested_model
    voice = data.get('voice') or TTS_VOICE

    # Prepare headers for the TTS request
    # Check for an alternative API key provided in the TTS JSON body
    provided_api_key = data.get('api_key')
    effective_api_key = provided_api_key if provided_api_key else api_key
    tts_headers = {
        'Authorization': f'Bearer {effective_api_key}',
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
    }

    # Build the payload for the TTS API call
    tts_payload = {
        'model': model,
        'input': text,
        'voice': voice
    }

    try:
        # Send the POST request to the TTS endpoint
        tts_response = requests.post(OPENAI_TTS_URL, json=tts_payload, headers=tts_headers)
        if tts_response.status_code != 200:
            system_logger.error(f"TTS Server error: {tts_response.status_code} {tts_response.text}")
            return jsonify({'error': 'Error with the TTS server'}), 500

        # Retrieve the audio content from the response
        audio_data = tts_response.content
        voice_logger.info(f"TTS audio generated for text: {text[:5]}...")

        # Return the audio data as a WAV response
        return Response(audio_data, mimetype='audio/wav')

    except Exception as e:
        # Log and return errors if the TTS processing fails
        system_logger.error(f'Error in /tts: {e}')
        return jsonify({'error': 'Internal server error at TTS'}), 500

# (Silent) Input Text
@app.route('/chat', methods=['POST'])
@auth.login_required
def chat():
    # handles pure text chat requests
    data = request.get_json() or {}
    # Log the incoming text for Input Text interactions
    user_text = data.get('text', '').strip()
    voice_logger.info(f"User (text input): {user_text[:5]}...")
    # API key override
    key = data.get('api_key') or api_key
    # Load Session-History
    session_id = data.get('session_id')
    if session_id:
        history = histories.setdefault(session_id, [])
    else:
        history = []

    # system prompt & model choice
    system_prompt = data.get('system_prompt', persona_prompt)

    selected = data.get('model', 'o4-mini')
    # resolve internal chat_model
    if selected == 'o4-mini':
        chat_model = 'o4-mini'
    elif selected == 'o3-mini':
        chat_model = 'o3-mini'
    elif selected == 'gpt-4.1':
        chat_model = 'gpt-4.1'
    elif selected == 'gpt-4o':
        chat_model = 'gpt-4o'
    elif selected in (
        'llama4:scout', 'llama3.3', 'qwen3:235b', 'qwen3:32b',
        'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b',
        'qwq', 'gemma3:27b', 'gemma3:4b', 'cogito:70b',
        'cogito:32b', 'cogito:14b', 'cogito:8b', 'cogito:3b'
    ):
        # for Llama4-Scout, Llama3.3, Qwen3, DeepSeek, QwQ, Gemma3 and Cogito use model name directly
        chat_model = selected
    elif selected == 'custom-ollama':
        # use the user-provided Ollama model name
        chat_model = data.get('custom_ollama_model', '').strip()
    else:
        chat_model = 'o4-mini'
    # choose endpoint
    if selected in (
        'llama4:scout', 'llama3.3', 'qwen3:235b', 'qwen3:32b',
        'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b',
        'qwq', 'gemma3:27b', 'gemma3:4b', 'cogito:70b',
        'cogito:32b', 'cogito:14b', 'cogito:8b', 'cogito:3b',
        'custom-ollama'
    ):
        chat_url = data.get('chat_url', OLLAMA_CHAT_URL)
    else:
        chat_url = OPENAI_CHAT_URL

    # build payload, inc. history
    messages = [{"role": "system", "content": system_prompt}] + \
               history + \
               [{"role": "user",   "content": user_text}]
    payload = {
        'model':    chat_model,
        'messages': messages
    }
    headers = {
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    resp = requests.post(chat_url, headers=headers, json=payload)
    if resp.status_code != 200:
        return jsonify({'error': 'Chat error'}), 500
    result = resp.json()
    reply = result['choices'][0]['message']['content'].strip()
    # Log the bot's response for text input interactions
    voice_logger.info(f"Bot (text output): {reply[:5]}...")
    if session_id:
        history.append({"role": "user",      "content": user_text})
        history.append({"role": "assistant", "content": reply})
    return jsonify({'response': reply})

def run_http():
    # Start the HTTP server on port 10001 without SSL
    app.run(debug=True, host='0.0.0.0', port=10001, use_reloader=False)

def run_https():
    # For HTTPS, using the snakeoil certificate and key provided by the ssl-cert package
    ssl_context = ('/app/ssl-cert-snakeoil.pem', '/app/ssl-cert-snakeoil.key')
    # Start the HTTPS server on port 20001 with SSL
    app.run(debug=True, host='0.0.0.0', port=20001, ssl_context=ssl_context, use_reloader=False)

# Start the Flask server when the script is run directly.
if __name__ == "__main__":
    # Start both servers in separate threads since app.run() is blocking
    thread_http = threading.Thread(target=run_http)
    thread_https = threading.Thread(target=run_https)
    thread_http.start()
    thread_https.start()
    thread_http.join()
    thread_https.join()

# EOF

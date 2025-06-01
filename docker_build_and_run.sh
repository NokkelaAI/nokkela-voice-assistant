#!/bin/sh
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

docker build -t nokkela-voice-assistant .

### Docker Example: 1 (HTTP & HTTPS)

#docker run \
#       -d \
#       -p 10001:10001 \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       nokkela-voice-assistant

### Docker Example: 2 (HTTP & HTTPS & Volume Mapping)

#docker run \
#       -d \
#       -p 10001:10001 \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       -v /data/nva:/app/data \
#       nokkela-voice-assistant

### Docker Example: 3 (HTTPS only & Ollama Server)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       nokkela-voice-assistant

### Docker Example: 4 (HTTPS only & Ollama Server & XTTS)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       -e OPENAI_TTS_URL="http://YOUR-SERVER-IP:8000/v1/audio/speech" \
#       -e TTS_HD="YES" \
#       -e TTS_VOICE="shimmer" \
#       nokkela-voice-assistant

### Docker Example: 5 (HTTPS only & Ollama Server & XTTS & WEB_AUTH)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       -e OPENAI_TTS_URL="http://YOUR-SERVER-IP:8000/v1/audio/speech" \
#       -e TTS_HD="YES" \
#       -e TTS_VOICE="shimmer" \
#       -e WEB_AUTH_USER="nva" \
#       -e WEB_AUTH_PW="nva" \
#       nokkela-voice-assistant

### Docker Example: 6 (HTTPS only & Ollama Server & XTTS & WEB_AUTH & WhisperSTT)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_KEY="YOUR-API-KEY" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       -e OPENAI_TTS_URL="http://YOUR-SERVER-IP:8000/v1/audio/speech" \
#       -e TTS_HD="YES" \
#       -e TTS_VOICE="shimmer" \
#       -e WEB_AUTH_USER="nva" \
#       -e WEB_AUTH_PW="nva" \
#       -e OPENAI_TRANSCRIBE_URL="http://YOUR-SERVER-IP:8000/v1/audio/transcriptions" \
#       nokkela-voice-assistant

### Docker Example: 7 (Full Selfhosted Setup - XTTS - OpenAI is not used at all)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_TRANSCRIBE_URL="http://YOUR-SERVER-IP:8000/v1/audio/transcriptions" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       -e OPENAI_TTS_URL="http://YOUR-SERVER-IP:8000/v1/audio/speech" \
#       -e TTS_HD="YES" \
#       -e TTS_VOICE="shimmer" \
#       -e WEB_AUTH_USER="nva" \
#       -e WEB_AUTH_PW="nva" \
#       nokkela-voice-assistant

### Docker Example: 8 (Full Selfhosted Setup - Custom ONNX - OpenAI is not used at all)

#docker run \
#       -d \
#       -p 20001:20001 \
#       -e OPENAI_TRANSCRIBE_URL="http://YOUR-SERVER-IP:8000/v1/audio/transcriptions" \
#       -e OLLAMA_CHAT_URL="http://YOUR-SERVER-IP:11434/v1/chat/completions" \
#       -e OPENAI_TTS_URL="http://YOUR-SERVER-IP:8000/v1/audio/speech" \
#       -e TTS_HD="NO" \
#       -e TTS_VOICE="thorsten" \
#       -e WEB_AUTH_USER="nva" \
#       -e WEB_AUTH_PW="nva" \
#       nokkela-voice-assistant

### Docker Productive: (HTTPS only + OpenAI + WEB_AUTH)

docker run \
       -d \
       -p 20001:20001 \
       -e OPENAI_KEY="YOUR-API-KEY" \
       -e WEB_AUTH_USER="nva" \
       -e WEB_AUTH_PW="nva" \
       nokkela-voice-assistant

### Docker Status:
sleep 1; docker ps | egrep "nokkela-voice-assistant"

# EOF

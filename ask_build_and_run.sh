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

# This script builds the Docker image and runs the container with user-configured options.
# Works on Linux and macOS (POSIX shell).

# 1) Ask if the user wants to use OpenAI
echo -n "Use OpenAI? (YES/NO): "
read USE_OPENAI

if [ "${USE_OPENAI}" = "YES" ] || [ "${USE_OPENAI}" = "yes" ]; then
  # 2) Prompt for OpenAI API key
  echo -n "Enter your OpenAI API key: "
  read OPENAI_KEY
fi

# 3) Prompt for Web Authentication password
echo -n "Enter WEB_AUTH_PW: "
read WEB_AUTH_PW

# 4) Ask if an Ollama Chat Server is available
echo -n "Is an Ollama Chat Server available? (YES/NO): "
read USE_OLLAMA

if [ "${USE_OLLAMA}" = "YES" ] || [ "${USE_OLLAMA}" = "yes" ]; then
  # Prompt for Ollama Chat URL
  echo -n "Enter OLLAMA_CHAT_URL (e.g., http://YOUR-SERVER-IP:11434/v1/chat/completions): "
  read OLLAMA_CHAT_URL
fi

# 5) Ask if a custom STT (Speech-to-Text) Server is available
echo -n "Is a custom STT (Speech-to-Text) Server available? (YES/NO): "
read USE_STT

if [ "${USE_STT}" = "YES" ] || [ "${USE_STT}" = "yes" ]; then
  # Prompt for STT (transcription) URL
  echo -n "Enter OPENAI_TRANSCRIBE_URL (e.g., http://YOUR-SERVER-IP:8000/v1/audio/transcriptions): "
  read OPENAI_TRANSCRIBE_URL
fi

# 6) Ask if a custom TTS (Text-to-Speech) Server is desired
echo -n "Use a custom TTS (Text-to-Speech) Server? (YES/NO): "
read USE_TTS

if [ "${USE_TTS}" = "YES" ] || [ "${USE_TTS}" = "yes" ]; then
  # Prompt for TTS URL
  echo -n "Enter OPENAI_TTS_URL (e.g., http://YOUR-SERVER-IP:8000/v1/audio/speech): "
  read OPENAI_TTS_URL

  # 7) Choose TTS engine type
  echo -n "Select TTS engine type (XTTS/ONNX): "
  read TTS_ENGINE

  case "${TTS_ENGINE}" in
    XTTS|xtts)
      # Use high-definition XTTS with default voice
      TTS_HD="YES"
      TTS_VOICE="shimmer"
      ;;
    ONNX|onnx)
      # Use ONNX TTS: ask for custom voice name
      TTS_HD="NO"
      echo -n "Enter TTS_VOICE (e.g., thorsten): "
      read TTS_VOICE
      ;;
    *)
      # Fallback to ONNX defaults if input is invalid
      echo "Invalid choice; defaulting to ONNX with 'shimmer'."
      TTS_HD="NO"
      TTS_VOICE="shimmer"
      ;;
  esac
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t nokkela-voice-assistant .

# Prepare the docker run command
CMD="docker run -d -p 20001:20001"

# Add OpenAI key if requested
if [ "${USE_OPENAI}" = "YES" ] || [ "${USE_OPENAI}" = "yes" ]; then
  CMD="${CMD} -e OPENAI_KEY=\"${OPENAI_KEY}\""
fi

# Add Ollama chat URL if provided
if [ "${USE_OLLAMA}" = "YES" ] || [ "${USE_OLLAMA}" = "yes" ]; then
  CMD="${CMD} -e OLLAMA_CHAT_URL=\"${OLLAMA_CHAT_URL}\""
fi

# Add STT URL if provided
if [ "${USE_STT}" = "YES" ] || [ "${USE_STT}" = "yes" ]; then
  CMD="${CMD} -e OPENAI_TRANSCRIBE_URL=\"${OPENAI_TRANSCRIBE_URL}\""
fi

# Add TTS settings if provided
if [ "${USE_TTS}" = "YES" ] || [ "${USE_TTS}" = "yes" ]; then
  CMD="${CMD} -e OPENAI_TTS_URL=\"${OPENAI_TTS_URL}\" -e TTS_HD=\"${TTS_HD}\" -e TTS_VOICE=\"${TTS_VOICE}\""
fi

# Always include web authentication variables
CMD="${CMD} -e WEB_AUTH_USER=\"nva\" -e WEB_AUTH_PW=\"${WEB_AUTH_PW}\""

# Specify the image name
CMD="${CMD} nokkela-voice-assistant"

# Run the container
echo "Starting container with command:"
echo "${CMD}"
eval "${CMD}"

# Check running containers
sleep 1
echo "Currently running nokkela-voice-assistant containers:"
docker ps | egrep "nokkela-voice-assistant"

# EOF

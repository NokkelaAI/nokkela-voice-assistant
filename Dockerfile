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

# Use an official Python runtime as a parent image
FROM python:3.10.17-slim

ENV DEBIAN_FRONTEND=noninteractive

# Base Image Updates & Security fixes
RUN apt-get update -qq -y
RUN apt-get upgrade -qq -y

# Update package list and install ssl-cert to get the snakeoil certificates
RUN apt-get update && apt-get install -y ssl-cert && rm -rf /var/lib/apt/lists/*

# Set the working directory to /app
WORKDIR /app

# Copy snakeoil certificate and key from system paths to /app
RUN cp /etc/ssl/certs/ssl-cert-snakeoil.pem /app/ && cp /etc/ssl/private/ssl-cert-snakeoil.key /app/

# Create a new user 'appuser' with a home directory and recursively change ownership of the /app directory to this user.
RUN useradd -m appuser && chown -R appuser /app

# Copy the requirements file and install dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .
RUN chown -R appuser /app
USER appuser

# Expose ports for HTTP (10001) and HTTPS (20001)
EXPOSE 10001
EXPOSE 20001

# Run the application
CMD ["python", "app.py"]

# EOF

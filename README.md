# OpenAI Realtime RAG Assistant

This is a fork of [openai-realtime-console](https://github.com/openai/openai-realtime-console) adapted to demonstrate voice based RAG assistants using their [realtime api](https://github.com/openai/openai-realtime-api-beta). All credit to the OpenAI team for putting together the majority of this. Please refer to their original repo for more detailed information on how the backend works.

<img src="/readme/console_screenshot.png" width="800" />

# Loading the Vector Database

<img src="/readme/jupyter_sc.png" width="800" />

The [VDB_Setup.ipynb](VDB_Setup.ipynb) notebook is included with step-by-step instructions for setting up your vector database and hosting the query function as a REST API. Follow along to set up your own ChromaDB vector database.

# Starting the console

This is a React project created using `create-react-app` that is bundled via Webpack.
To start the application:

1. Navigate to the backend directory:
```shell
$ cd backend
```

2. Install dependencies:
```shell
$ npm i
```

3. Start the server:
```shell
$ npm start
```

The application will be available at `localhost:3000`.

Note: Make sure you have Node.js installed on your system before running these commands.

# Changing the System Prompt

The [conversation_config.js](src/utils/conversation_config.js) holds the main system prompt for the agent. For example it is set up to do Q&A over an assumed marketing related knowledgebase. Edit this file to personalize your system prompt.

```
System settings:
Tool use: enabled.

Instructions:

You are an intelligent navigation assistant analyzing real-time video frame descriptions and event logs.

Your goal is to guide users by providing helpful, natural, and accurate updates based on the most recent two event logs in the database.
When I ask you a question about a present event, you should always query the database for the most recent event logs and use those to answer the question.


Personality:
- Respond fast and accurate!
- Speak quickly as if excited
```

# Using the console

The console requires an OpenAI API key (**user key** or **project key**) that has access to the
Realtime API. You'll be prompted on startup to enter it. It will be saved via `localStorage` and can be
changed at any time from the UI.

To start a session you'll need to **connect**. This will require microphone access.
You can then choose between **manual** (Push-to-talk) and **vad** (Voice Activity Detection)
conversation modes, and switch between them at any time.

# Backend Documentation

## Overview
The backend of this application is built using FastAPI and ChromaDB, providing a robust vector database solution for storing and retrieving documents. The system is designed to work with the OpenAI Realtime API to create an interactive voice-based RAG (Retrieval-Augmented Generation) assistant.

## Directory Structure
```
backend/
├── chroma/              # ChromaDB persistent storage
├── chroma_db/           # Additional ChromaDB related files
├── logs/               # Application logs
├── public/             # Static files
├── relay-server/       # WebSocket relay server
├── src/                # Source code
├── vdb_setup.py        # Vector database setup script
├── requirements.txt    # Python dependencies
└── package.json        # Node.js dependencies
```

## Key Components

### Vector Database Setup (vdb_setup.py)
The vector database setup script (`vdb_setup.py`) provides the following functionality:
- Creates and manages a ChromaDB persistent client
- Sets up document collections with cosine similarity search
- Implements text splitting using LangChain's RecursiveCharacterTextSplitter
- Provides REST API endpoints for querying and storing documents

#### API Endpoints
- `POST /query`: Retrieves the 5 most recent documents from the database
- `POST /store`: Stores new documents with timestamp metadata

### Dependencies
The backend relies on several key Python packages:
- FastAPI (v0.104.1): Web framework for building APIs
- ChromaDB (v0.4.18): Vector database for document storage
- LangChain: Framework for working with language models
- Uvicorn: ASGI server for running FastAPI applications

## Setup Instructions

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up the vector database:
```bash
python vdb_setup.py
```

3. The API server will start on `http://localhost:8000`

## Environment Variables
The backend requires the following environment variables (configured in `.env`):
- OpenAI API key for accessing the Realtime API
- Additional configuration variables as needed

## Development
To modify the system prompt or conversation behavior, edit the configuration in `src/utils/conversation_config.js`.

## Security Considerations
- API keys are stored securely and not exposed in the frontend
- CORS is configured to allow necessary origins
- Input validation is implemented for all API endpoints

## Troubleshooting
- Check the `logs/` directory for detailed error logs
- Ensure ChromaDB is properly initialized before starting the API server
- Verify all environment variables are correctly set

# OpenAI Realtime RAG Assistant

This is a fork of [openai-realtime-console](https://github.com/openai/openai-realtime-console) adapted to demonstrate voice based RAG assistants using their [realtime api](https://github.com/openai/openai-realtime-api-beta). All credit to the OpenAI team for putting together the majority of this. Please refer to their original repo for more detailed information on how the backend works.

<img src="/readme/console_screenshot.png" width="800" />

# Loading the Vector Database

<img src="/readme/jupyter_sc.png" width="800" />

The [VDB_Setup.ipynb](VDB_Setup.ipynb) notebook is included with step-by-step instructions for setting up your vector database and hosting the query function as a REST API. Follow along to set up your own ChromaDB vector database.

# Starting the console

This is a React project created using `create-react-app` that is bundled via Webpack.
Install it by extracting the contents of this package and using;

```shell
$ npm i
```

Start your server with:

```shell
$ npm start
```

It should be available via `localhost:3000`.

# Changing the System Prompt

The [conversation_config.js](src/utils/conversation_config.js) holds the main system prompt for the agent. For example it is set up to do Q&A over an assumed marketing related knowledgebase. Edit this file to personalize your system prompt.

```
System settings:
Tool use: enabled.

Instructions:
- You are an artificial intelligence agent responsible for assisting a user in discussing and educating themselves on marketing 
- You have access to a database filled with Marketing Expertise as your tool, always retrieve relevant information from the database to get the right context to assist the user's ask.
- Please make sure to respond with a helpful voice via audio
- Be kind, helpful, and curteous, and conversational
- It is okay to ask the user questions and followups
- The user will always start the conversation by saying Hello
- Generate your responses as if they are conversational and informal- stray away from super long complex structured responses but maintain the core crucial information

Personality:
- Be upbeat and genuine, like a true marketer!
- Speak quickly as if excited
```

# Using the console

The console requires an OpenAI API key (**user key** or **project key**) that has access to the
Realtime API. You'll be prompted on startup to enter it. It will be saved via `localStorage` and can be
changed at any time from the UI.

To start a session you'll need to **connect**. This will require microphone access.
You can then choose between **manual** (Push-to-talk) and **vad** (Voice Activity Detection)
conversation modes, and switch between them at any time.

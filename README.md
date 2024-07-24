# love-paws-api

## Setup 

- Under `conf/api_key/`, rename `api_key_original.json` to `api_key.json` and provide your *OpenAI API key* there.
- Run `npm start daemon`

## Endpoints

- ***`/`*** (ANY): Displays a welcome message.
    - Response : 
        - Example :
            ```
            {
                "data": "Welcome to Love Paws API"
            }
            ```
- ***`/ping`*** (ANY) : Returns "pong".
    - Response : 
        - Example :
            ```
            {
                "data": "pong"
            }
            ```
- ***`/inbox/send_message`*** (POST) : Returns a message for a conversation.
    - Request : 
        - Parameters :
            - "recipient" : The name you want the cat who replies to have; it can be anything.
            - "msg" : The message to be sent to this cat.
        - Example : 
            ```
            {
                "data" : {
                    "recipient" : "Felix",
                    "msg" : "Hello there!"
                },
                "metadata" : {}
            }
            ```
    - Response : 
        - Example :
            ```
            {
                "data": {
                    "msg": "Meow! How are you?"
                },
                "metadata": {}
            }
            ```
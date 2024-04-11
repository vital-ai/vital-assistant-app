import requests


def main():
    url = 'http://127.0.0.1:6060/whisper/'
    filepath = 'haley_output.mp3'

    with open(filepath, 'rb') as file:
        files = {'audio': (filepath, file, 'audio/mp3')}
        response = requests.post(url, files=files)

    if response.status_code == 200:
        print("Successfully uploaded and processed the file.")
        print("Response from server:", response.json())
    else:
        print("Failed to upload file.")
        print("Status Code:", response.status_code)
        print("Response:", response.text)


if __name__ == "__main__":
    main()
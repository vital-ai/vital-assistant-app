import os

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
import uvicorn
import whisper
from pydantic import BaseModel
import shutil
import tempfile
import openwakeword
from openwakeword.model import Model
import pyaudio
import numpy as np
import threading
from datetime import datetime
import time
import speech_recognition as sr
from pydub import AudioSegment
import io
import json
import pywemo
from kasa import Discover
import asyncio

os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
import pygame


temp_dir = tempfile.mkdtemp()
save_path = os.path.join(temp_dir, "temp.wav")

model_path = './models/hey_haley.onnx'
ding_path = './sounds/dingsound.mp3'
inference_framework = 'onnx'

FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1280  # args.chunk_size
audio = pyaudio.PyAudio()

pygame.mixer.init()

ding = pygame.mixer.Sound(ding_path)

r = sr.Recognizer()
r.energy_threshold = 300
r.pause_threshold = 0.8
r.dynamic_energy_threshold = False

openwakeword.utils.download_models()

owwModel = Model(wakeword_models=[model_path], inference_framework=inference_framework)

n_models = len(owwModel.models.keys())

# model = whisper.load_model("tiny.en")
model = whisper.load_model("base.en")
# model = whisper.load_model("small.en")


app = FastAPI()


class TranscriptionResult(BaseModel):
    transcribed_text: str


@app.post("/whisper/", response_model=TranscriptionResult)
async def whisper(audio: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_path = temp_file.name
        shutil.copyfileobj(audio.file, temp_file)
    try:
        result = model.transcribe(temp_path, fp16=False)
    finally:
        os.remove(temp_path)

    transcribed_text = result["text"].strip() if result.get("text") else "No text found"

    print(transcribed_text)

    return {"transcribed_text": transcribed_text}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            print(data)
            message_obj = json.loads(data)
            message_type = message_obj[0].get("type")
            if message_type == 'ping':
                print("ping")
                pong = [{"type": "pong"}]
                pong_string = json.dumps(pong)
                print("sending: ", pong_string)
                try:
                    await websocket.send_text(pong_string)
                except Exception as e:
                    print(f"sending message exception: {e}")
            if message_type == 'start_listening':
                # turn on wake word
                #  await websocket.send_text()
                pass
            if message_type == 'stop_listening':
                # turn off wake word
                #  await websocket.send_text()
                pass
            if message_type == 'start_transcribing':
                # record and transcribe now
                #  await websocket.send_text()
                pass
            if message_type == 'shutdown':
                # exit process
                #  await websocket.send_text()
                await websocket.close()
                break
            if message_type == 'interrupt':
                # interrupt any current recording
                # that was triggered by wake word or
                # transcription request
                #  await websocket.send_text()
                await websocket.close()
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass


def play_mp3():

    ding.play()

    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)


def run_server():
    uvicorn.run(host="0.0.0.0", port=6060, app=app)


last_call_time = None


def handler():
    print("Hey Haley Detected")

    play_thread = threading.Thread(target=play_mp3())
    play_thread.start()

    with sr.Microphone(sample_rate=16000) as source:
        # r.adjust_for_ambient_noise(source)

        print("Listening...")
        try:
            audio = r.listen(source, timeout=10, phrase_time_limit=15)
        except sr.WaitTimeoutError:
            print("Listening timed out while waiting for speech to start")
            return
        print("Stopped Listening.")
        data = io.BytesIO(audio.get_wav_data())
        audio_clip = AudioSegment.from_file(data)
        audio_clip.export(save_path, format="wav")

        result = model.transcribe(save_path, fp16=False)

        transcribed_text = result["text"].strip() if result.get("text") else "No text found"

        print(transcribed_text)


def debounce():
    global last_call_time
    current_time = time.time()

    if last_call_time is None or (current_time - last_call_time) > 2:
        last_call_time = current_time
        handler()


def callback(in_data, frame_count, time_info, status):
    audio_data = np.frombuffer(in_data, dtype=np.int16)

    prediction = owwModel.predict(audio_data)

    # Column titles
    n_spaces = 16
    output_string_header = """
                Model Name         | Score | Wakeword Status
                --------------------------------------
                """

    include_output = False

    for mdl in owwModel.prediction_buffer.keys():
        # Add scores in formatted table
        scores = list(owwModel.prediction_buffer[mdl])
        # print("Score: " + str(scores[-1]))
        if scores[-1] > 0.1:
            include_output = True
        curr_score = format(scores[-1], '.20f').replace("-", "")

        output_string_header += f"""{mdl}{" " * (n_spaces - len(mdl))}   | {curr_score[0:5]} | {"--" + " " * 20 if scores[-1] <= 0.5 else "Wakeword Detected!"}
                """

    if include_output is True:
        current_datetime = datetime.now()
        current_datetime_str = current_datetime.strftime("%Y-%m-%d %H:%M:%S")
        print("\033[F" * (4 * n_models + 1))
        print(current_datetime_str)
        print(output_string_header, "                             ", end='\r')
        debounce_thread = threading.Thread(target=debounce)
        debounce_thread.start()

    return None, pyaudio.paContinue


async def device_discover():
    devices = pywemo.discover_devices(debug=True)
    # print(devices)
    for device in devices:
        print(device.explain())
        print(device)
        print(device.get_state(True))

    tplink_devices = await Discover.discover(
        discovery_timeout=10
    )

    for ip, device in tplink_devices.items():
        await device.update()
        print(device.alias)
        print(device)
        # await device.turn_off()


async def startup_tasks():
    task = await asyncio.create_task(device_discover())


def startup():
    asyncio.run(startup_tasks())


if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()

    startup_thread = threading.Thread(target=startup)
    startup_thread.daemon = True
    startup_thread.start()

    print("\n\n")
    print("#" * 100)
    print("Listening for wakewords...")
    print("#" * 100)
    print("\n" * (n_models * 3))

    mic_stream = audio.open(format=FORMAT,
                            channels=CHANNELS,
                            rate=RATE,
                            input=True,
                            frames_per_buffer=CHUNK,
                            stream_callback=callback)

    mic_stream.start_stream()

    # do once
    with sr.Microphone(sample_rate=16000) as source:
        r.adjust_for_ambient_noise(source)

    try:
        while mic_stream.is_active():
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Stopping the stream.")
    finally:
        mic_stream.stop_stream()
        mic_stream.close()

        audio.terminate()
